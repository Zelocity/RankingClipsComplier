import express from "express";
import path from "path";
import fs from "fs";
import { spawn } from "child_process";
import { randomUUID } from "crypto";

const router = express.Router();

function isValidJobId(jobId: string): boolean {
  return /^[A-Za-z0-9_-]+$/.test(jobId);
}

function isValidFileName(fileName: string): boolean {
  return /^[A-Za-z0-9_.-]+$/.test(fileName);
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

  const projectRoot = path.resolve(process.cwd(), "..");

  const jobPath = path.join(projectRoot, "storage", "jobs", jobId);
  const inputPath = path.join(jobPath, "input");

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

    return res.json({
      message: "Clip imported successfully.",
      id: clipId,
      fileName: downloadedFile,
      videoUrl: `http://localhost:8000/jobs/${jobId}/clips/${downloadedFile}`,
    });
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

  const projectRoot = path.resolve(process.cwd(), "..");

  const filePath = path.join(
    projectRoot,
    "storage",
    "jobs",
    jobId,
    "input",
    fileName,
  );

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: "Clip not found." });
  }

  return res.sendFile(filePath);
});

export default router;
