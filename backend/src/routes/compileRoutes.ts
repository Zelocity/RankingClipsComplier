import express from "express";
import path from "path";
import fs from "fs";
import { spawn } from "child_process";

const router = express.Router();

function isValidJobId(jobId: string): boolean {
  return /^[A-Za-z0-9_-]+$/.test(jobId);
}

router.post("/:jobId", (req, res) => {
  const { jobId } = req.params;

  if (!isValidJobId(jobId)) {
    return res.status(400).json({
      message: "Invalid job ID.",
    });
  }

  const projectRoot = path.resolve(process.cwd(), "..");

  const inputPath = path.join(projectRoot, "storage", "jobs", jobId, "input");

  const outputPath = path.join(projectRoot, "storage", "jobs", jobId, "output");

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
    "videocomplier.py",
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

  fs.mkdirSync(outputPath, { recursive: true });

  const pythonProcess = spawn(
    pythonPath,
    [compilerPath, "--input", inputPath, "--output", outputPath],
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
