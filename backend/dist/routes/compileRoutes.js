"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const child_process_1 = require("child_process");
const paths_1 = require("../config/paths");
const router = express_1.default.Router();
function isValidJobId(jobId) {
    return /^[A-Za-z0-9_-]+$/.test(jobId);
}
function isVideoFile(fileName) {
    return /\.(mp4|mov|mkv|webm)$/i.test(fileName);
}
function isRecord(value) {
    return typeof value === "object" && value !== null;
}
function getTrimStart(value) {
    if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
        return value;
    }
    return 0;
}
function getTrimEnd(value, trimStart) {
    if (typeof value === "number" &&
        Number.isFinite(value) &&
        value > trimStart) {
        return value;
    }
    return null;
}
function readSavedClips(metadataPath, inputPath) {
    const videoFiles = fs_1.default.readdirSync(inputPath).filter(isVideoFile).sort();
    if (videoFiles.length === 0) {
        return [];
    }
    let savedMetadata = [];
    if (fs_1.default.existsSync(metadataPath)) {
        try {
            const rawMetadata = fs_1.default.readFileSync(metadataPath, "utf8");
            const parsedMetadata = JSON.parse(rawMetadata);
            if (Array.isArray(parsedMetadata)) {
                savedMetadata = parsedMetadata;
            }
        }
        catch {
            console.warn("Could not read clips.json. Using input files instead.");
        }
    }
    const savedClips = savedMetadata.flatMap((value, index) => {
        if (!isRecord(value)) {
            return [];
        }
        const fileName = value.fileName;
        const title = value.title;
        if (typeof fileName !== "string" || !isVideoFile(fileName)) {
            return [];
        }
        const safeFileName = path_1.default.basename(fileName);
        if (!videoFiles.includes(safeFileName)) {
            return [];
        }
        const trimStart = getTrimStart(value.trimStart);
        const trimEnd = getTrimEnd(value.trimEnd, trimStart);
        return [
            {
                id: path_1.default.parse(safeFileName).name,
                fileName: safeFileName,
                title: typeof title === "string" && title.trim()
                    ? title.trim()
                    : `Untitled ${index + 1}`,
                trimStart,
                trimEnd,
            },
        ];
    });
    const savedFileNames = new Set(savedClips.map((clip) => clip.fileName));
    const missingClips = videoFiles
        .filter((fileName) => !savedFileNames.has(fileName))
        .map((fileName, index) => ({
        id: path_1.default.parse(fileName).name,
        fileName,
        title: `Untitled ${savedClips.length + index + 1}`,
        trimStart: 0,
        trimEnd: null,
    }));
    return [...savedClips, ...missingClips];
}
function getKnownIds(value, knownIds) {
    if (!Array.isArray(value)) {
        return [];
    }
    const ids = [];
    const seenIds = new Set();
    for (const candidate of value) {
        if (typeof candidate === "string" &&
            knownIds.has(candidate) &&
            !seenIds.has(candidate)) {
            ids.push(candidate);
            seenIds.add(candidate);
        }
    }
    return ids;
}
function addMissingIds(orderedIds, fallbackIds) {
    const allIds = [...orderedIds];
    const seenIds = new Set(allIds);
    for (const id of fallbackIds) {
        if (!seenIds.has(id)) {
            allIds.push(id);
            seenIds.add(id);
        }
    }
    return allIds;
}
function shouldCheckPythonPath() {
    // Local Windows uses an actual file path:
    // project/python/.venv/Scripts/python.exe
    //
    // Render/Docker uses "python3", which is found from the system PATH.
    return path_1.default.isAbsolute(paths_1.pythonPath) || paths_1.pythonPath.includes("\\");
}
router.post("/:jobId", (req, res) => {
    const { jobId } = req.params;
    if (!isValidJobId(jobId)) {
        return res.status(400).json({
            message: "Invalid job ID.",
        });
    }
    const { jobPath, inputPath, outputPath } = (0, paths_1.getJobPaths)(jobId);
    const metadataPath = path_1.default.join(jobPath, "clips.json");
    const renderConfigPath = path_1.default.join(jobPath, "render-config.json");
    const compilerPath = path_1.default.join(paths_1.projectRoot, "python", "RankingVideo", "videocompiler.py");
    if (!fs_1.default.existsSync(inputPath)) {
        return res.status(404).json({
            message: "Job input folder does not exist.",
        });
    }
    if (shouldCheckPythonPath() && !fs_1.default.existsSync(paths_1.pythonPath)) {
        return res.status(500).json({
            message: "Python virtual environment was not found.",
            pythonPath: paths_1.pythonPath,
        });
    }
    if (!fs_1.default.existsSync(compilerPath)) {
        return res.status(500).json({
            message: "Python compiler file was not found.",
            compilerPath,
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
    const rankedClipIds = addMissingIds(getKnownIds(req.body?.rankedClipIds, knownIds), allClipIds);
    const playOrder = addMissingIds(getKnownIds(req.body?.playOrder, knownIds), rankedClipIds);
    const titleDocument = isRecord(req.body?.titleDocument)
        ? req.body.titleDocument
        : null;
    const renderConfig = {
        titleDocument,
        rankedClipIds,
        playOrder,
        clips: savedClips,
    };
    fs_1.default.mkdirSync(outputPath, { recursive: true });
    fs_1.default.writeFileSync(renderConfigPath, JSON.stringify(renderConfig, null, 2), "utf8");
    const compiledFileName = "compiled_video.mp4";
    const compiledFilePath = path_1.default.join(outputPath, compiledFileName);
    // Remove old export before compiling again.
    fs_1.default.rmSync(compiledFilePath, { force: true });
    const pythonProcess = (0, child_process_1.spawn)(paths_1.pythonPath, [
        compilerPath,
        "--input",
        inputPath,
        "--output",
        outputPath,
        "--config",
        renderConfigPath,
    ], {
        cwd: paths_1.projectRoot,
        windowsHide: true,
    });
    let output = "";
    let errorOutput = "";
    let hasResponded = false;
    function sendResponse(statusCode, body) {
        if (hasResponded) {
            return;
        }
        hasResponded = true;
        return res.status(statusCode).json(body);
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
        return sendResponse(500, {
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
                error: errorOutput || output,
            });
        }
        if (!fs_1.default.existsSync(compiledFilePath)) {
            return sendResponse(500, {
                message: "Compiler finished, but compiled_video.mp4 was not found.",
                output,
            });
        }
        const baseUrl = (0, paths_1.getBackendBaseUrl)(req);
        return sendResponse(200, {
            message: "Videos compiled successfully.",
            videoUrl: `${baseUrl}/jobs/${jobId}/output/${compiledFileName}`,
            downloadUrl: `${baseUrl}/jobs/${jobId}/output/${compiledFileName}/download`,
        });
    });
});
exports.default = router;
