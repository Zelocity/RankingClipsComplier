import express from "express";
import cors from "cors";

import compileRoutes from "./routes/compileRoutes";
import jobRoutes from "./routes/jobRoutes";

const app = express();
const PORT = 8000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check route
app.get("/", (req, res) => {
  res.json({ message: "Ranking Video Compiler backend is running." });
});

// Routes
app.use("/compile", compileRoutes);
app.use("/jobs", jobRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});