import { RetrievedChunk, TimetableEntryInput } from "../types";

export class CragService {
  evaluate(question: string, chunks: RetrievedChunk[], entries: TimetableEntryInput[]) {
    const normalizedQuestion = question.toLowerCase();
    const keywordHits = chunks.filter((chunk) =>
      normalizedQuestion
        .split(/\W+/)
        .filter((token) => token.length > 3)
        .some((token) => chunk.content.toLowerCase().includes(token))
    ).length;

    const bestSimilarity = chunks[0]?.similarity ?? 0;
    const hasStructuredMatch = entries.length > 0;
    const isRelevant = bestSimilarity >= 0.35 || keywordHits >= 2 || hasStructuredMatch;

    if (!isRelevant) {
      return {
        isRelevant: false,
        confidence: "low" as const,
        reason: "Weak retrieval confidence"
      };
    }

    if (bestSimilarity >= 0.7 && hasStructuredMatch) {
      return {
        isRelevant: true,
        confidence: "high" as const
      };
    }

    return {
      isRelevant: true,
      confidence: "medium" as const
    };
  }
}

export const cragService = new CragService();

