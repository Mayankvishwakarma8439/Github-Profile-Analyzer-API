import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();
import githubRoutes from "./routes/github.js";
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "GitHub Profile Analyzer API is running.",
  });
});
app.use("/api/", githubRoutes);
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found." });
});
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is running on port ${PORT}`);
});
