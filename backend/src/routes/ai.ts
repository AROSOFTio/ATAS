import { Router } from "express";
import { supabase } from "../lib/supabase";
import { gemini } from "../lib/gemini";
import { embeddingService } from "../services/embedding.service";
import { cragService } from "../services/crag.service";
import { QuestionIntent, RetrievedChunk } from "../types";

export const aiRouter = Router();

aiRouter.post("/query", async (req, res) => {
  try {
    const { document_id: documentId, question } = req.body as {
      document_id?: string;
      question?: string;
    };

    if (!documentId || !question) {
      return res.status(400).json({ error: "document_id and question are required." });
    }

    const intent = parseQuestionIntent(question);
    const questionEmbedding = await embeddingService.embedText(question);
    const { data: chunksData, error: chunkError } = await supabase.rpc("match_timetable_chunks", {
      query_embedding: questionEmbedding,
      match_document_id: documentId,
      match_count: 5
    });

    if (chunkError) {
      return res.status(500).json({ error: chunkError.message });
    }

    const chunks = (chunksData ?? []) as RetrievedChunk[];
    const matchedEntries = await findMatchingEntries(documentId, intent, question);
    const relatedIssues = await findRelatedIssues(documentId, matchedEntries.map((entry) => entry.id));
    const cragCheck = cragService.evaluate(question, chunks, matchedEntries);

    if (!cragCheck.isRelevant) {
      return res.json({
        answer: "I cannot confirm this from the uploaded timetable. Please check if the correct timetable was uploaded.",
        matched_entries: matchedEntries,
        referenced_chunks: chunks,
        related_issues: relatedIssues,
        confidence: "low"
      });
    }

    const systemPrompt = [
      "You are an academic timetable advisory assistant.",
      "Use only the uploaded timetable context and parsed system data.",
      "If information is missing, say so clearly.",
      "Do not invent dates, rooms, invigilators, course units, or student details.",
      "Respond with valid JSON using this shape:",
      '{"answer":"","matched_entries":[],"referenced_chunks":[],"related_issues":[],"confidence":"high | medium | low"}'
    ].join(" ");

    const userPrompt = JSON.stringify({
      question,
      intent,
      matched_entries: matchedEntries,
      related_issues: relatedIssues,
      referenced_chunks: chunks
    });

    const parsed = await gemini.generateJson({
      model: "gemini-2.5-flash",
      systemInstruction: systemPrompt,
      prompt: userPrompt,
      responseSchema: {
        type: "object",
        properties: {
          answer: { type: "string" },
          matched_entries: { type: "array", items: { type: "object" } },
          referenced_chunks: { type: "array", items: { type: "object" } },
          related_issues: { type: "array", items: { type: "object" } },
          confidence: { type: "string", enum: ["high", "medium", "low"] }
        },
        required: ["answer", "matched_entries", "referenced_chunks", "related_issues", "confidence"]
      }
    });

    return res.json({
      answer: parsed.answer ?? "No answer available.",
      matched_entries: parsed.matched_entries ?? matchedEntries,
      referenced_chunks: parsed.referenced_chunks ?? chunks,
      related_issues: parsed.related_issues ?? relatedIssues,
      confidence: parsed.confidence ?? cragCheck.confidence
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI query failed.";
    return res.status(500).json({ error: message });
  }
});

function parseQuestionIntent(question: string): QuestionIntent {
  const normalized = question.toLowerCase();
  const asksFor: string[] = [];

  if (normalized.includes("when")) asksFor.push("date");
  if (normalized.includes("room")) asksFor.push("room");
  if (normalized.includes("invigilat")) asksFor.push("invigilator");
  if (normalized.includes("first paper")) asksFor.push("first_paper");
  if (normalized.includes("show all")) asksFor.push("list");
  if (normalized.includes("clash")) asksFor.push("clash");
  if (normalized.includes("missing")) asksFor.push("issues");
  if (normalized.includes("overloaded")) asksFor.push("overloaded_session");

  return {
    programme: question.match(/\b(BIT|DIT|CS|BCS|BSCIT|BSCS)\b/i)?.[1]?.toUpperCase(),
    year_semester: question.match(/\b(\d:\d|year\s*\d+\s*semester\s*\d+)\b/i)?.[1],
    study_mode: question.match(/\b(Weekend|Day|Evening|Online)\b/i)?.[1],
    course_code: question.match(/\b([A-Z]{2,}\d{3,}[A-Z]?)\b/)?.[1],
    course_title: extractCourseTitle(question),
    asksFor,
    dateQuery: question.match(/\b(\d{1,2}\s+[A-Za-z]{3,9}(?:\s+\d{4})?)\b/i)?.[1]
  };
}

function extractCourseTitle(question: string) {
  const titledMatch = question.match(/(?:when is|which room is|who is invigilating|show|for)\s+(.+?)(?:\?|$)/i);
  const value = titledMatch?.[1]?.trim();
  if (!value || /\b(bit|dit|weekend|year|semester)\b/i.test(value)) {
    return undefined;
  }
  return value;
}

async function findMatchingEntries(documentId: string, intent: QuestionIntent, question: string) {
  let query = supabase.from("timetable_entries").select("*").eq("document_id", documentId);

  if (intent.programme) {
    query = query.ilike("programme", `%${intent.programme}%`);
  }
  if (intent.year_semester) {
    query = query.ilike("year_semester", `%${intent.year_semester}%`);
  }
  if (intent.study_mode) {
    query = query.ilike("study_mode", `%${intent.study_mode}%`);
  }
  if (intent.course_code) {
    query = query.ilike("course_code", `%${intent.course_code}%`);
  }
  if (intent.course_title) {
    query = query.ilike("course_title", `%${intent.course_title}%`);
  }
  if (intent.dateQuery) {
    query = query.ilike("exam_date", `%${intent.dateQuery}%`);
  }

  let { data, error } = await query.limit(20);

  if (error) {
    throw error;
  }

  if (!data?.length) {
    const fallback = await supabase.from("timetable_entries").select("*").eq("document_id", documentId).limit(100);

    if (fallback.error) {
      throw fallback.error;
    }

    const loweredQuestion = question.toLowerCase();
    data = (fallback.data ?? []).filter((entry) =>
      [
        entry.course_code,
        entry.course_title,
        entry.programme,
        entry.year_semester,
        entry.study_mode,
        entry.exam_date,
        entry.room,
        entry.invigilator
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(loweredQuestion))
    );
  }

  return data ?? [];
}

async function findRelatedIssues(documentId: string, entryIds: string[]) {
  let query = supabase.from("timetable_issues").select("*").eq("document_id", documentId);

  if (entryIds.length) {
    query = query.in("related_entry_id", entryIds);
  }

  const { data, error } = await query.limit(20);
  if (error) {
    throw error;
  }

  return data ?? [];
}
