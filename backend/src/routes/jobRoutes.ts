import express from "express";
import fs from "fs";
import { randomUUID } from "crypto";

import { getJobPaths } from "../config/paths";

const router = express.Router();

function isValidJobId(jobId: string): boolean {
  return /^[A-Za-z0-9_-]+$/.test(jobId);
}

router.post("/", (req, res) => {
  const jobId = randomUUID();
  const { inputPath, outputPath } = getJobPaths(jobId);

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
    return res.status(400).json({ message: "Invalid job ID." });
  }

  const { jobPath } = getJobPaths(jobId);

  if (!fs.existsSync(jobPath)) {
    return res.status(404).json({ message: "Job does not exist." });
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
