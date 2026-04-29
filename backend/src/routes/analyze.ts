import { Router } from "express";
import { analyzerService } from "../services/analyzer.service";

export const analyzeRouter = Router();

analyzeRouter.post("/:documentId", async (req, res) => {
  try {
    const result = await analyzerService.analyzeDocument(req.params.documentId);
    return res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Analysis failed.";
    return res.status(500).json({ error: message });
  }
});

analyzeRouter.get("/:documentId/issues", async (req, res) => {
  try {
    const issues = await analyzerService.getIssues(req.params.documentId);
    return res.json({ issues });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not fetch issues.";
    return res.status(500).json({ error: message });
  }
});

