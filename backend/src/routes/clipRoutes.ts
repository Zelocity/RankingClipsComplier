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
};

function isValidJobId(jobId: string): boolean {
  return /^[A-Za-z0-9_-]+$/.test(jobId);
}

function isValidFileName(fileName: string): boolean {
  return /^[A-Za-z0-9_.-]+$/.test(fileName);
}

function getJobPaths(jobId: string) {
  const projectRoot = path.resolve(process.cwd(), "..");
  const jobPath = path.join(projectRoot, "storage", "jobs", jobId);

  return {
    projectRoot,
    jobPath,
    inputPath: path.join(jobPath, "input"),
    metadataPath: path.join(jobPath, "clips.json"),
  };
}

function readClipMetadata(metadataPath: string): ClipMetadata[] {
  if (!fs.existsSync(metadataPath)) {
    return [];
  }

  try {
    const fileContents = fs.readFileSync(metadataPath, "utf8");
    const clips = JSON.parse(fileContents);

    return Array.isArray(clips) ? clips : [];
  } catch {
    return [];
  }
}

function writeClipMetadata(metadataPath: string, clips: ClipMetadata[]) {
  fs.writeFileSync(metadataPath, JSON.stringify(clips, null, 2), "utf8");
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

  // Keep existing saved clip order and custom titles.
  const savedClips = savedMetadata
    .filter((clip) => videoFiles.includes(clip.fileName))
    .map((clip, index) => ({
      id: path.parse(clip.fileName).name,
      fileName: clip.fileName,
      title: clip.title?.trim() || `Untitled ${index + 1}`,
    }));

  const savedFileNames = new Set(savedClips.map((clip) => clip.fileName));

  // Add videos that existed before clips.json was created.
  const missingClips = videoFiles
    .filter((fileName) => !savedFileNames.has(fileName))
    .map((fileName, index) => ({
      id: path.parse(fileName).name,
      fileName,
      title: `Untitled ${savedClips.length + index + 1}`,
    }));

  const clips = [...savedClips, ...missingClips];

  writeClipMetadata(metadataPath, clips);

  return clips;
}

router.post("/:jobId/import-url", (req, res) => {
  const { jobId } = req.params;
  const { url } = req.body;

  if (!isValidJobId(jobId)) {
    return res.status(400).json({ message: "Invalid job ID." });
  }

  if (!url || typeof url !== "string") {
    return res.status(400).json({ message: "URL is required." });
  }

  const { projectRoot, inputPath, metadataPath } = getJobPaths(jobId);

  if (!fs.existsSync(inputPath)) {
    return res.status(404).json({ message: "Job does not exist." });
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
      ...importedClip,
      videoUrl: `http://localhost:8000/jobs/${jobId}/clips/${importedClip.fileName}`,
    });
  });
});

router.get("/:jobId/clips", (req, res) => {
  const { jobId } = req.params;

  if (!isValidJobId(jobId)) {
    return res.status(400).json({ message: "Invalid job ID." });
  }

  const { inputPath, metadataPath } = getJobPaths(jobId);

  if (!fs.existsSync(inputPath)) {
    return res.status(404).json({ message: "Job does not exist." });
  }

  const clips = getSavedClips(inputPath, metadataPath);

  return res.json({
    clips: clips.map((clip) => ({
      ...clip,
      videoUrl: `http://localhost:8000/jobs/${jobId}/clips/${clip.fileName}`,
    })),
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

  const { inputPath, metadataPath } = getJobPaths(jobId);

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

  return res.json({
    message: "Clip title updated.",
    ...clips[clipIndex],
    videoUrl: `http://localhost:8000/jobs/${jobId}/clips/${clips[clipIndex].fileName}`,
  });
});

router.get("/:jobId/clips/:fileName", (req, res) => {
  const { jobId, fileName } = req.params;

  if (!isValidJobId(jobId)) {
    return res.status(400).json({ message: "Invalid job ID." });
  }

  if (!isValidFileName(fileName)) {
    return res.status(400).json({ message: "Invalid file name." });
  }

  const { inputPath } = getJobPaths(jobId);
  const filePath = path.join(inputPath, fileName);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: "Clip not found." });
  }

  return res.sendFile(filePath);
});

export default router;
