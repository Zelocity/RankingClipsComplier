import express from "express";
import path from "path";
import { spawn } from "child_process";

const router = express.Router();

router.get("/", (req, res) => {
    res.json({ message: "Compile route hit." });
//   const projectRoot = path.resolve(process.cwd(), "..");

//   const pythonPath = path.join(
//     projectRoot,
//     "python",
//     ".venv",
//     "Scripts",
//     "python.exe"
//   );

//   const compilerPath = path.join(projectRoot, "python", "compiler.py");
//   const inputPath = path.join(projectRoot, "storage", "input");
//   const outputPath = path.join(projectRoot, "storage", "output");

//   const pythonProcess = spawn(pythonPath, [
//     compilerPath,
//     "--input",
//     inputPath,
//     "--output",
//     outputPath,
//   ]);

//   let output = "";
//   let errorOutput = "";

//   pythonProcess.stdout.on("data", (data) => {
//     const text = data.toString();
//     output += text;
//     console.log(text);
//   });

//   pythonProcess.stderr.on("data", (data) => {
//     const text = data.toString();
//     errorOutput += text;
//     console.error(text);
//   });

//   pythonProcess.on("close", (code) => {
//     if (code !== 0) {
//       return res.status(500).json({
//         message: "Python compiler failed.",
//         error: errorOutput,
//       });
//     }

//     return res.json({
//       message: "Videos compiled successfully.",
//       output,
//     });
//   });
});

export default router;