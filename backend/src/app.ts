import cors from "cors";
import express from "express";
import { uploadRouter } from "./routes/upload";
import { analyzeRouter } from "./routes/analyze";
import { ragRouter } from "./routes/rag";
import { aiRouter } from "./routes/ai";

export const app = express();

app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/upload", uploadRouter);
app.use("/api/analyze", analyzeRouter);
app.use("/api/rag", ragRouter);
app.use("/api/ai", aiRouter);

