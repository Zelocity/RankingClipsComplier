import express from "express";
import cors from "cors";

import jobRoutes from "./routes/jobRoutes";
import clipRoutes from "./routes/clipRoutes";
// import compileRoutes from "./routes/compileRoutes";

const app = express();
const PORT = process.env.PORT || 8000;

// Important for Render HTTPS URLs behind proxy
app.set("trust proxy", 1);

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "Ranking Video Compiler backend is running." });
});

app.use("/jobs", jobRoutes);
app.use("/jobs", clipRoutes);

// app.use("/compile", compileRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
