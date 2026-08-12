"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pythonPath = exports.jobsRoot = exports.storageRoot = exports.projectRoot = exports.backendRoot = void 0;
exports.getJobPaths = getJobPaths;
exports.getBackendBaseUrl = getBackendBaseUrl;
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const isProduction = process.env.NODE_ENV === "production";
// When running locally from backend folder:
// process.cwd() = your-project/backend
//
// In Docker on Render:
// process.cwd() = /app/backend
exports.backendRoot = process.cwd();
exports.projectRoot = path_1.default.resolve(exports.backendRoot, "..");
// Local: use your project storage folder.
// Production: use /tmp because Render's local filesystem is temporary anyway.
exports.storageRoot = process.env.STORAGE_ROOT ||
    (isProduction
        ? path_1.default.join(os_1.default.tmpdir(), "ranking-video-compiler")
        : path_1.default.join(exports.projectRoot, "storage"));
exports.jobsRoot = path_1.default.join(exports.storageRoot, "jobs");
// Local Windows uses your venv.
// Docker/Render uses python3 installed inside the container.
exports.pythonPath = process.env.PYTHON_PATH ||
    (isProduction
        ? "python3"
        : path_1.default.join(exports.projectRoot, "python", ".venv", "Scripts", "python.exe"));
function getJobPaths(jobId) {
    const jobPath = path_1.default.join(exports.jobsRoot, jobId);
    return {
        jobPath,
        inputPath: path_1.default.join(jobPath, "input"),
        outputPath: path_1.default.join(jobPath, "output"),
    };
}
function getBackendBaseUrl(req) {
    return (process.env.PUBLIC_BACKEND_URL || `${req.protocol}://${req.get("host")}`);
}
