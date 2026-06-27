import express from "express";
import path from "path";
import fs from "fs";
import { spawn } from "child_process";

const router = express.Router();

type SavedClip = {
  id: string;
  fileName: string;
  title: string;
};

function isValidJobId(jobId: string): boolean {
  return /^[A-Za-z0-9_-]+$/.test(jobId);
}

function isVideoFile(fileName: string): boolean {
  return /\.(mp4|mov|mkv|webm)$/i.test(fileName);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readSavedClips(metadataPath: string, inputPath: string): SavedClip[] {
  if (fs.existsSync(metadataPath)) {
    try {
      const rawMetadata = fs.readFileSync(metadataPath, "utf8");
      const parsedMetadata: unknown = JSON.parse(rawMetadata);

      if (Array.isArray(parsedMetadata)) {
        const savedClips = parsedMetadata.flatMap((value) => {
          if (!isRecord(value)) {
            return [];
          }

          const id = value.id;
          const fileName = value.fileName;
          const title = value.title;

          if (
            typeof id !== "string" ||
            typeof fileName !== "string" ||
            !isVideoFile(fileName)
          ) {
            return [];
          }

          return [
            {
              id,
              fileName: path.basename(fileName),
              title:
                typeof title === "string" && title.trim()
                  ? title.trim()
                  : path.parse(fileName).name,
            },
          ];
        });

        if (savedClips.length > 0) {
          return savedClips;
        }
      }
    } catch {
      console.warn("Could not read clips.json. Falling back to input files.");
    }
  }

  return fs
    .readdirSync(inputPath)
    .filter(isVideoFile)
    .sort()
    .map((fileName) => ({
      id: fileName,
      fileName,
      title: path.parse(fileName).name,
    }));
}

function getKnownIds(value: unknown, knownIds: Set<string>): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const ids: string[] = [];
  const seenIds = new Set<string>();

  for (const candidate of value) {
    if (
      typeof candidate === "string" &&
      knownIds.has(candidate) &&
      !seenIds.has(candidate)
    ) {
      ids.push(candidate);
      seenIds.add(candidate);
    }
  }

  return ids;
}

function addMissingIds(orderedIds: string[], fallbackIds: string[]): string[] {
  const seenIds = new Set(orderedIds);

  for (const id of fallbackIds) {
    if (!seenIds.has(id)) {
      orderedIds.push(id);
      seenIds.add(id);
    }
  }

  return orderedIds;
}

router.post("/:jobId", (req, res) => {
  const { jobId } = req.params;

  if (!isValidJobId(jobId)) {
    return res.status(400).json({
      message: "Invalid job ID.",
    });
  }

  const projectRoot = path.resolve(process.cwd(), "..");

  const jobPath = path.join(projectRoot, "storage", "jobs", jobId);

  const inputPath = path.join(jobPath, "input");
  const outputPath = path.join(jobPath, "output");

  const metadataPath = path.join(jobPath, "clips.json");
  const renderConfigPath = path.join(jobPath, "render-config.json");

  const pythonPath = path.join(
    projectRoot,
    "python",
    ".venv",
    "Scripts",
    "python.exe",
  );

  const compilerPath = path.join(
    projectRoot,
    "python",
    "RankingVideo",
    "videocompiler.py",
  );

  if (!fs.existsSync(inputPath)) {
    return res.status(404).json({
      message: "Job input folder does not exist.",
    });
  }

  if (!fs.existsSync(pythonPath)) {
    return res.status(500).json({
      message: "Python virtual environment was not found.",
    });
  }

  if (!fs.existsSync(compilerPath)) {
    return res.status(500).json({
      message: "Python compiler file was not found.",
    });
  }

  const savedClips = readSavedClips(metadataPath, inputPath);

  if (savedClips.length === 0) {
    return res.status(400).json({
      message: "There are no imported clips to compile.",
    });
  }

  const allClipIds = savedClips.map((clip) => clip.id);
  const knownIds = new Set(allClipIds);

  const rankedClipIds = addMissingIds(
    getKnownIds(req.body?.rankedClipIds, knownIds),
    allClipIds,
  );

  const playOrder = addMissingIds(
    getKnownIds(req.body?.playOrder, knownIds),
    rankedClipIds,
  );

  const titleDocument = isRecord(req.body?.titleDocument)
    ? req.body.titleDocument
    : null;

  const renderConfig = {
    titleDocument,
    rankedClipIds,
    playOrder,
    clips: savedClips,
  };

  fs.writeFileSync(
    renderConfigPath,
    JSON.stringify(renderConfig, null, 2),
    "utf8",
  );

  fs.mkdirSync(outputPath, { recursive: true });

  const pythonProcess = spawn(
    pythonPath,
    [
      compilerPath,
      "--input",
      inputPath,
      "--output",
      outputPath,
      "--config",
      renderConfigPath,
    ],
    {
      cwd: projectRoot,
      windowsHide: true,
    },
  );

  let output = "";
  let errorOutput = "";
  let hasResponded = false;

  function sendResponse(
    statusCode: number,
    responseBody: Record<string, unknown>,
  ) {
    if (hasResponded) {
      return;
    }

    hasResponded = true;
    res.status(statusCode).json(responseBody);
  }

  pythonProcess.stdout.on("data", (data) => {
    const text = data.toString();
    output += text;
    console.log(text);
  });

  pythonProcess.stderr.on("data", (data) => {
    const text = data.toString();
    errorOutput += text;
    console.error(text);
  });

  pythonProcess.on("error", (error) => {
    sendResponse(500, {
      message: "Could not start the Python compiler.",
      error: error.message,
    });
  });

  pythonProcess.on("close", (code) => {
    if (hasResponded) {
      return;
    }

    if (code !== 0) {
      return sendResponse(500, {
        message: "Python compiler failed.",
        error: errorOutput,
      });
    }

    const compiledFileName = "compiled_video.mp4";

    const compiledFilePath = path.join(outputPath, compiledFileName);

    if (!fs.existsSync(compiledFilePath)) {
      return sendResponse(500, {
        message: "Compiler finished, but compiled_video.mp4 was not found.",
        output,
      });
    }

    return sendResponse(200, {
      message: "Videos compiled successfully.",
      videoUrl: `http://localhost:8000/jobs/${jobId}/output/${compiledFileName}`,
      downloadUrl: `http://localhost:8000/jobs/${jobId}/output/${compiledFileName}/download`,
    });
  });
});

export default router;
