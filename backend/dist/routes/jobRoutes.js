"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const fs_1 = __importDefault(require("fs"));
const crypto_1 = require("crypto");
const paths_1 = require("../config/paths");
const router = express_1.default.Router();
function isValidJobId(jobId) {
    return /^[A-Za-z0-9_-]+$/.test(jobId);
}
router.post("/", (req, res) => {
    const jobId = (0, crypto_1.randomUUID)();
    const { inputPath, outputPath } = (0, paths_1.getJobPaths)(jobId);
    try {
        fs_1.default.mkdirSync(inputPath, { recursive: true });
        fs_1.default.mkdirSync(outputPath, { recursive: true });
        return res.json({
            message: "Job created successfully.",
            jobId,
        });
    }
    catch (error) {
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
    const { jobPath } = (0, paths_1.getJobPaths)(jobId);
    if (!fs_1.default.existsSync(jobPath)) {
        return res.status(404).json({ message: "Job does not exist." });
    }
    try {
        fs_1.default.rmSync(jobPath, { recursive: true, force: true });
        return res.json({
            message: "Job removed successfully.",
            jobId,
        });
    }
    catch (error) {
        return res.status(500).json({
            message: "Failed to remove job.",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
});
exports.default = router;
