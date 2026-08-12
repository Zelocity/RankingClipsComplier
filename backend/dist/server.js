"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const jobRoutes_1 = __importDefault(require("./routes/jobRoutes"));
const clipRoutes_1 = __importDefault(require("./routes/clipRoutes"));
// import compileRoutes from "./routes/compileRoutes";
const app = (0, express_1.default)();
const PORT = process.env.PORT || 8000;
// Important for Render HTTPS URLs behind proxy
app.set("trust proxy", 1);
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.get("/", (req, res) => {
    res.json({ message: "Ranking Video Compiler backend is running." });
});
app.use("/jobs", jobRoutes_1.default);
app.use("/jobs", clipRoutes_1.default);
// app.use("/compile", compileRoutes);
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
