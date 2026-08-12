"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const child_process_1 = require("child_process");
const crypto_1 = require("crypto");
const paths_1 = require("../config/paths");
const router = express_1.default.Router();
function isValidJobId(jobId) {
    return /^[A-Za-z0-9_-]+$/.test(jobId);
}
function isValidFileName(fileName) {
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
    const { inputPath } = (0, paths_1.getJobPaths)(jobId);
    if (!fs_1.default.existsSync(inputPath)) {
        return res.status(404).json({ message: "Job does not exist." });
    }
    const clipId = (0, crypto_1.randomUUID)();
    const outputTemplate = `${clipId}.%(ext)s`;
    const ytdlpProcess = (0, child_process_1.spawn)(paths_1.pythonPath, [
        "-m",
        "yt_dlp",
        url,
        "-P",
        inputPath,
        "--no-playlist",
        "--merge-output-format",
        "mp4",
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
    ytdlpProcess.on("error", (error) => {
        return res.status(500).json({
            message: "Failed to start yt-dlp.",
            error: error.message,
        });
    });
    ytdlpProcess.on("close", (code) => {
        if (code !== 0) {
            return res.status(500).json({
                message: "Failed to import video.",
                error: errorOutput,
            });
        }
        const downloadedFile = fs_1.default
            .readdirSync(inputPath)
            .find((file) => file.startsWith(clipId));
        if (!downloadedFile) {
            return res.status(500).json({
                message: "Download finished, but file was not found.",
            });
        }
        const baseUrl = (0, paths_1.getBackendBaseUrl)(req);
        return res.json({
            message: "Clip imported successfully.",
            clip: {
                id: clipId,
                fileName: downloadedFile,
                videoUrl: `${baseUrl}/jobs/${jobId}/clips/${downloadedFile}`,
            },
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
    const { inputPath } = (0, paths_1.getJobPaths)(jobId);
    const filePath = path_1.default.join(inputPath, fileName);
    if (!fs_1.default.existsSync(filePath)) {
        return res.status(404).json({ message: "Clip not found." });
    }
    return res.sendFile(filePath);
});
exports.default = router;
