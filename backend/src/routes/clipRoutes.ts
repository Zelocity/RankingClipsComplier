import express from "express";
import path from "path";
import fs from "fs";
import { spawn } from "child_process";
import { randomUUID } from "crypto";

const router = express.Router();

type ClipMetadata = {
  id: string;
  fileName: string;
  title: string;
  trimStart: number;
  trimEnd: number | null;
};

function isValidJobId(jobId: string): boolean {
  return /^[A-Za-z0-9_-]+$/.test(jobId);
}

function isValidFileName(fileName: string): boolean {
  return /^[A-Za-z0-9_.-]+$/.test(fileName);
}

function getTrimStart(value: unknown): number {
  return typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0
    ? value
    : 0;
}

function getTrimEnd(
  value: unknown,
  trimStart: number,
): number | null {
  return typeof value === "number" &&
    Number.isFinite(value) &&
    value > trimStart
    ? value
    : null;
}

function getJobPaths(jobId: string) {
  const projectRoot = path.resolve(process.cwd(), "..");
  const jobPath = path.join(projectRoot, "storage", "jobs", jobId);

  return {
    projectRoot,
    jobPath,
    inputPath: path.join(jobPath, "input"),
    outputPath: path.join(jobPath, "output"),
    metadataPath: path.join(jobPath, "clips.json"),
  };
}

function readClipMetadata(metadataPath: string): ClipMetadata[] {
  if (!fs.existsSync(metadataPath)) {
    return [];
  }

  try {
    const fileContents = fs.readFileSync(metadataPath, "utf8");
    const clips: unknown = JSON.parse(fileContents);

    return Array.isArray(clips) ? (clips as ClipMetadata[]) : [];
  } catch {
    return [];
  }
}

function writeClipMetadata(
  metadataPath: string,
  clips: ClipMetadata[],
) {
  fs.writeFileSync(
    metadataPath,
    JSON.stringify(clips, null, 2),
    "utf8",
  );
}

function getSavedClips(
  inputPath: string,
  metadataPath: string,
): ClipMetadata[] {
  const videoFiles = fs
    .readdirSync(inputPath)
    .filter((file) => file.endsWith(".mp4"))
    .sort();

  const savedMetadata = readClipMetadata(metadataPath);

  const savedClips = savedMetadata
    .filter((clip) => videoFiles.includes(clip.fileName))
    .map((clip, index) => {
      const trimStart = getTrimStart(clip.trimStart);

      return {
        id: path.parse(clip.fileName).name,
        fileName: clip.fileName,
        title: clip.title?.trim() || `Untitled ${index + 1}`,
        trimStart,
        trimEnd: getTrimEnd(clip.trimEnd, trimStart),
      };
    });

  const savedFileNames = new Set(
    savedClips.map((clip) => clip.fileName),
  );

  const missingClips = videoFiles
    .filter((fileName) => !savedFileNames.has(fileName))
    .map((fileName, index) => ({
      id: path.parse(fileName).name,
      fileName,
      title: `Untitled ${savedClips.length + index + 1}`,
      trimStart: 0,
      trimEnd: null,
    }));

  const clips = [...savedClips, ...missingClips];

  writeClipMetadata(metadataPath, clips);

  return clips;
}

function buildClipResponse(jobId: string, clip: ClipMetadata) {
  return {
    ...clip,
    videoUrl: `http://localhost:8000/jobs/${jobId}/clips/${clip.fileName}`,
  };
}

function removeStaleExport(outputPath: string) {
  fs.rmSync(
    path.join(outputPath, "compiled_video.mp4"),
    { force: true },
  );
}

router.post("/:jobId/import-url", (req, res) => {
  const { jobId } = req.params;
  const { url } = req.body;

  if (!isValidJobId(jobId)) {
    return res.status(400).json({
      message: "Invalid job ID.",
    });
  }

  if (!url || typeof url !== "string") {
    return res.status(400).json({
      message: "URL is required.",
    });
  }

  const { projectRoot, inputPath, metadataPath } = getJobPaths(jobId);

  if (!fs.existsSync(inputPath)) {
    return res.status(404).json({
      message: "Job does not exist.",
    });
  }

  const pythonPath = path.join(
    projectRoot,
    "python",
    ".venv",
    "Scripts",
    "python.exe",
  );

  const clipId = randomUUID();
  const outputTemplate = `${clipId}.%(ext)s`;

  const ytdlpProcess = spawn(pythonPath, [
    "-m",
    "yt_dlp",
    url,
    "-P",
    inputPath,
    "-t",
    "mp4",
    "--no-playlist",
    "-o",
    outputTemplate,
  ]);

  let errorOutput = "";

  ytdlpProcess.stdout.on("data", (data) => {
    console.log(data.toString());
  });

  ytdlpProcess.stderr.on("data", (data) => {
    const text = data.toString();
    errorOutput += text;
    console.error(text);
  });

  ytdlpProcess.on("close", (code) => {
    if (code !== 0) {
      return res.status(500).json({
        message: "Failed to import video.",
        error: errorOutput,
      });
    }

    const downloadedFile = fs
      .readdirSync(inputPath)
      .find((file) => file.startsWith(clipId));

    if (!downloadedFile) {
      return res.status(500).json({
        message: "Download finished, but file was not found.",
      });
    }

    const clips = getSavedClips(inputPath, metadataPath);

    const importedClip = clips.find((clip) => clip.id === clipId);

    if (!importedClip) {
      return res.status(500).json({
        message: "Downloaded clip metadata was not found.",
      });
    }

    return res.json({
      message: "Clip imported successfully.",
      ...buildClipResponse(jobId, importedClip),
    });
  });
});

router.get("/:jobId/clips", (req, res) => {
  const { jobId } = req.params;

  if (!isValidJobId(jobId)) {
    return res.status(400).json({
      message: "Invalid job ID.",
    });
  }

  const { inputPath, metadataPath } = getJobPaths(jobId);

  if (!fs.existsSync(inputPath)) {
    return res.status(404).json({
      message: "Job does not exist.",
    });
  }

  const clips = getSavedClips(inputPath, metadataPath);

  return res.json({
    clips: clips.map((clip) => buildClipResponse(jobId, clip)),
  });
});

router.patch("/:jobId/clips/:clipId/title", (req, res) => {
  const { jobId, clipId } = req.params;
  const { title } = req.body;

  if (!isValidJobId(jobId) || !isValidFileName(clipId)) {
    return res.status(400).json({
      message: "Invalid job ID or clip ID.",
    });
  }

  if (typeof title !== "string" || !title.trim()) {
    return res.status(400).json({
      message: "A title is required.",
    });
  }

  const cleanedTitle = title.trim();

  if (cleanedTitle.length > 100) {
    return res.status(400).json({
      message: "Title must be 100 characters or fewer.",
    });
  }

  const {
    inputPath,
    outputPath,
    metadataPath,
  } = getJobPaths(jobId);

  if (!fs.existsSync(inputPath)) {
    return res.status(404).json({
      message: "Job does not exist.",
    });
  }

  const clips = getSavedClips(inputPath, metadataPath);

  const clipIndex = clips.findIndex((clip) => clip.id === clipId);

  if (clipIndex === -1) {
    return res.status(404).json({
      message: "Clip not found.",
    });
  }

  clips[clipIndex] = {
    ...clips[clipIndex],
    title: cleanedTitle,
  };

  writeClipMetadata(metadataPath, clips);
  removeStaleExport(outputPath);

  return res.json({
    message: "Clip title updated.",
    ...buildClipResponse(jobId, clips[clipIndex]),
  });
});

router.patch("/:jobId/clips/:clipId/trim", (req, res) => {
  const { jobId, clipId } = req.params;
  const { trimStart, trimEnd } = req.body;

  if (!isValidJobId(jobId) || !isValidFileName(clipId)) {
    return res.status(400).json({
      message: "Invalid job ID or clip ID.",
    });
  }

  if (
    typeof trimStart !== "number" ||
    typeof trimEnd !== "number" ||
    !Number.isFinite(trimStart) ||
    !Number.isFinite(trimEnd) ||
    trimStart < 0 ||
    trimEnd <= trimStart
  ) {
    return res.status(400).json({
      message: "Trim start and end must be valid times.",
    });
  }

  if (trimEnd - trimStart < 0.1) {
    return res.status(400).json({
      message: "Clip range must be at least 0.1 seconds long.",
    });
  }

  const {
    inputPath,
    outputPath,
    metadataPath,
  } = getJobPaths(jobId);

  if (!fs.existsSync(inputPath)) {
    return res.status(404).json({
      message: "Job does not exist.",
    });
  }

  const clips = getSavedClips(inputPath, metadataPath);

  const clipIndex = clips.findIndex((clip) => clip.id === clipId);

  if (clipIndex === -1) {
    return res.status(404).json({
      message: "Clip not found.",
    });
  }

  clips[clipIndex] = {
    ...clips[clipIndex],
    trimStart,
    trimEnd,
  };

  writeClipMetadata(metadataPath, clips);
  removeStaleExport(outputPath);

  return res.json({
    message: "Clip range updated.",
    ...buildClipResponse(jobId, clips[clipIndex]),
  });
});

router.delete("/:jobId/clips/:clipId", (req, res) => {
  const { jobId, clipId } = req.params;

  if (!isValidJobId(jobId) || !isValidFileName(clipId)) {
    return res.status(400).json({
      message: "Invalid job ID or clip ID.",
    });
  }

  const {
    inputPath,
    outputPath,
    metadataPath,
  } = getJobPaths(jobId);

  if (!fs.existsSync(inputPath)) {
    return res.status(404).json({
      message: "Job does not exist.",
    });
  }

  const clips = getSavedClips(inputPath, metadataPath);

  const clipIndex = clips.findIndex((clip) => clip.id === clipId);

  if (clipIndex === -1) {
    return res.status(404).json({
      message: "Clip not found.",
    });
  }

  const deletedClip = clips[clipIndex];

  try {
    fs.rmSync(
      path.join(inputPath, path.basename(deletedClip.fileName)),
      { force: true },
    );

    clips.splice(clipIndex, 1);
    writeClipMetadata(metadataPath, clips);
    removeStaleExport(outputPath);

    return res.json({
      message: "Clip deleted successfully.",
      id: deletedClip.id,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Could not delete clip.";

    return res.status(500).json({
      message,
    });
  }
});

router.get("/:jobId/clips/:fileName", (req, res) => {
  const { jobId, fileName } = req.params;

  if (!isValidJobId(jobId)) {
    return res.status(400).json({
      message: "Invalid job ID.",
    });
  }

  if (!isValidFileName(fileName)) {
    return res.status(400).json({
      message: "Invalid file name.",
    });
  }

  const { inputPath } = getJobPaths(jobId);
  const filePath = path.join(inputPath, fileName);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({
      message: "Clip not found.",
    });
  }

  return res.sendFile(filePath);
});

router.get("/:jobId/output/:fileName/download", (req, res) => {
  const { jobId, fileName } = req.params;

  if (!isValidJobId(jobId)) {
    return res.status(400).json({
      message: "Invalid job ID.",
    });
  }

  if (!isValidFileName(fileName)) {
    return res.status(400).json({
      message: "Invalid output file name.",
    });
  }

  const { outputPath } = getJobPaths(jobId);
  const filePath = path.join(outputPath, fileName);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({
      message: "Compiled video not found.",
    });
  }

  return res.download(filePath, fileName);
});

router.get("/:jobId/output/:fileName", (req, res) => {
  const { jobId, fileName } = req.params;

  if (!isValidJobId(jobId)) {
    return res.status(400).json({
      message: "Invalid job ID.",
    });
  }

  if (!isValidFileName(fileName)) {
    return res.status(400).json({
      message: "Invalid output file name.",
    });
  }

  const { outputPath } = getJobPaths(jobId);
  const filePath = path.join(outputPath, fileName);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({
      message: "Compiled video not found.",
    });
  }

  return res.sendFile(filePath);
});

export default router;
