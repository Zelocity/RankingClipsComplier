import os from "os";
import path from "path";

const isProduction = process.env.NODE_ENV === "production";

// When running locally from backend folder:
// process.cwd() = your-project/backend
//
// In Docker on Render:
// process.cwd() = /app/backend
export const backendRoot = process.cwd();
export const projectRoot = path.resolve(backendRoot, "..");

// Local: use your project storage folder.
// Production: use /tmp because Render's local filesystem is temporary anyway.
export const storageRoot =
  process.env.STORAGE_ROOT ||
  (isProduction
    ? path.join(os.tmpdir(), "ranking-video-compiler")
    : path.join(projectRoot, "storage"));

export const jobsRoot = path.join(storageRoot, "jobs");

// Local Windows uses your venv.
// Docker/Render uses python3 installed inside the container.
export const pythonPath =
  process.env.PYTHON_PATH ||
  (isProduction
    ? "python3"
    : path.join(projectRoot, "python", ".venv", "Scripts", "python.exe"));

export function getJobPaths(jobId: string) {
  const jobPath = path.join(jobsRoot, jobId);

  return {
    jobPath,
    inputPath: path.join(jobPath, "input"),
    outputPath: path.join(jobPath, "output"),
  };
}

export function getBackendBaseUrl(req: {
  protocol: string;
  get: (name: string) => string | undefined;
}) {
  return (
    process.env.PUBLIC_BACKEND_URL || `${req.protocol}://${req.get("host")}`
  );
}
