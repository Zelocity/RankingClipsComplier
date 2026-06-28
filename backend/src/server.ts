import express from "express";
import cors from "cors";

import compileRoutes from "./routes/compileRoutes";
import jobRoutes from "./routes/jobRoutes";
import clipRoutes from "./routes/clipRoutes";

const app = express();
const PORT = 8000;

app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({
    message: "Ranking Video Compiler backend is running.",
  });
});

app.use("/compile", compileRoutes);
app.use("/jobs", jobRoutes);
app.use("/jobs", clipRoutes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
