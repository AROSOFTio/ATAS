import { Router } from "express";
import { supabase } from "../lib/supabase";
import { embeddingService } from "../services/embedding.service";
import { RetrievedChunk } from "../types";

export const ragRouter = Router();

ragRouter.post("/retrieve", async (req, res) => {
  try {
    const { document_id: documentId, question } = req.body as {
      document_id?: string;
      question?: string;
    };

    if (!documentId || !question) {
      return res.status(400).json({ error: "document_id and question are required." });
    }

    const embedding = await embeddingService.embedText(question);
    const { data, error } = await supabase.rpc("match_timetable_chunks", {
      query_embedding: embedding,
      match_document_id: documentId,
      match_count: 5
    });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({
      chunks: (data ?? []) as RetrievedChunk[]
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Retrieval failed.";
    return res.status(500).json({ error: message });
  }
});

