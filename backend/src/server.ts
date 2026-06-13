import express from "express";
import cors from "cors";

const app = express();
const PORT = 8000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "Ranking Video Compiler backend is running." });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});