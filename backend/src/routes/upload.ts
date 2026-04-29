import { Router } from "express";
import multer from "multer";
import { randomUUID } from "crypto";
import { supabase, STORAGE_BUCKET } from "../lib/supabase";
import { parserService } from "../services/parser.service";
import { chunkService } from "../services/chunk.service";
import { embeddingService } from "../services/embedding.service";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

export const uploadRouter = Router();

uploadRouter.post("/", upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    const title = req.body.title?.trim() || file?.originalname;

    if (!file) {
      return res.status(400).json({ error: "File upload is required." });
    }

    const allowedTypes = ["application/pdf", "text/csv", "text/plain", "application/vnd.ms-excel"];
    const extension = file.originalname.split(".").pop()?.toLowerCase();
    const supportedExtensions = ["pdf", "csv", "txt"];

    if (!allowedTypes.includes(file.mimetype) && !supportedExtensions.includes(extension ?? "")) {
      return res.status(400).json({ error: "Only PDF, CSV, and TXT files are supported." });
    }

    const documentId = randomUUID();
    const storagePath = `${documentId}/${file.originalname}`;

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false
      });

    if (uploadError) {
      return res.status(500).json({ error: uploadError.message });
    }

    const { extractedText, entries } = await parserService.parseFile(file.buffer, file.mimetype, file.originalname);

    const { error: documentError } = await supabase.from("timetable_documents").insert({
      id: documentId,
      title,
      file_name: file.originalname,
      file_type: extension ?? file.mimetype,
      storage_path: storagePath,
      extracted_text: extractedText,
      processing_status: "PROCESSING"
    });

    if (documentError) {
      return res.status(500).json({ error: documentError.message });
    }

    if (entries.length) {
      const { error: entryError } = await supabase.from("timetable_entries").insert(
        entries.map((entry) => ({
          document_id: documentId,
          ...entry
        }))
      );

      if (entryError) {
        return res.status(500).json({ error: entryError.message });
      }
    }

    const chunks = chunkService.createChunks(extractedText);
    const embeddings = await embeddingService.embedTexts(chunks.map((chunk) => chunk.content));

    if (chunks.length) {
      const { error: chunkError } = await supabase.from("timetable_chunks").insert(
        chunks.map((chunk, index) => ({
          document_id: documentId,
          content: chunk.content,
          metadata: chunk.metadata,
          embedding: embeddings[index]
        }))
      );

      if (chunkError) {
        return res.status(500).json({ error: chunkError.message });
      }
    }

    await supabase
      .from("timetable_documents")
      .update({ processing_status: "COMPLETED" })
      .eq("id", documentId);

    return res.status(201).json({
      document_id: documentId,
      total_chunks: chunks.length,
      parsed_entries: entries.length,
      processing_status: "COMPLETED"
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected upload error.";
    return res.status(500).json({ error: message });
  }
});
