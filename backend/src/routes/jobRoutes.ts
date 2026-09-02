import express from "express";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";

const router = express.Router();

function isValidJobId(jobId: string): boolean {
  return /^[A-Za-z0-9_-]+$/.test(jobId);
}

router.post("/", (req, res) => {
  const projectRoot = path.resolve(process.cwd(), "..");
  const jobId = randomUUID();

  const jobPath = path.join(projectRoot, "storage", "jobs", jobId);
  const inputPath = path.join(jobPath, "input");
  const outputPath = path.join(jobPath, "output");

  try {
    fs.mkdirSync(inputPath, { recursive: true });
    fs.mkdirSync(outputPath, { recursive: true });

    return res.json({
      message: "Job created successfully.",
      jobId,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to create job.",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

router.delete("/:jobId", (req, res) => {
  const { jobId } = req.params;

  if (!isValidJobId(jobId)) {
    return res.status(400).json({
      message: "Invalid job ID.",
    });
  }

  const projectRoot = path.resolve(process.cwd(), "..");
  const jobPath = path.join(projectRoot, "storage", "jobs", jobId);

  if (!fs.existsSync(jobPath)) {
    return res.status(404).json({
      message: "Job does not exist.",
    });
  }

  try {
    fs.rmSync(jobPath, { recursive: true, force: true });

    return res.json({
      message: "Job removed successfully.",
      jobId,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to remove job.",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;