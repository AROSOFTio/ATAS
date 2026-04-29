import { gemini } from "../lib/gemini";

export class EmbeddingService {
  async embedText(text: string) {
    return gemini.embedText(text, "RETRIEVAL_QUERY");
  }

  async embedTexts(texts: string[]) {
    return gemini.embedTexts(texts, "RETRIEVAL_DOCUMENT");
  }
}

export const embeddingService = new EmbeddingService();
