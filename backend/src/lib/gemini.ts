const geminiApiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;

if (!geminiApiKey) {
  throw new Error("Missing GEMINI_API_KEY in environment.");
}

const geminiApiKeyValue: string = geminiApiKey;

const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

type GeminiPart = {
  text: string;
};

type GenerateJsonOptions = {
  model: string;
  systemInstruction?: string;
  prompt: string;
  responseSchema?: Record<string, unknown>;
};

async function geminiRequest<T>(path: string, body: Record<string, unknown>) {
  const response = await fetch(`${GEMINI_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": geminiApiKeyValue
    },
    body: JSON.stringify(body)
  });

  const payload = (await response.json()) as {
    error?: { message?: string };
  } & T;

  if (!response.ok) {
    throw new Error(payload.error?.message ?? "Gemini API request failed.");
  }

  return payload;
}

function getTextFromCandidate(parts: GeminiPart[] | undefined) {
  return (parts ?? [])
    .map((part) => part.text)
    .filter(Boolean)
    .join("");
}

export const gemini = {
  async embedText(text: string, taskType: "RETRIEVAL_QUERY" | "RETRIEVAL_DOCUMENT" = "RETRIEVAL_QUERY") {
    const response = await geminiRequest<{
      embedding: {
        values: number[];
      };
    }>("/models/gemini-embedding-001:embedContent", {
      model: "models/gemini-embedding-001",
      content: {
        parts: [{ text }]
      },
      taskType,
      outputDimensionality: 1536
    });

    return response.embedding.values;
  },

  async embedTexts(texts: string[], taskType: "RETRIEVAL_QUERY" | "RETRIEVAL_DOCUMENT" = "RETRIEVAL_DOCUMENT") {
    if (!texts.length) {
      return [];
    }

    const response = await geminiRequest<{
      embeddings: Array<{
        values: number[];
      }>;
    }>("/models/gemini-embedding-001:batchEmbedContents", {
      requests: texts.map((text) => ({
        model: "models/gemini-embedding-001",
        content: {
          parts: [{ text }]
        },
        taskType,
        outputDimensionality: 1536
      }))
    });

    return response.embeddings.map((item) => item.values);
  },

  async generateJson({ model, systemInstruction, prompt, responseSchema }: GenerateJsonOptions) {
    const response = await geminiRequest<{
      candidates?: Array<{
        content?: {
          parts?: GeminiPart[];
        };
      }>;
    }>(`/models/${model}:generateContent`, {
      ...(systemInstruction
        ? {
            systemInstruction: {
              parts: [{ text: systemInstruction }]
            }
          }
        : {}),
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        responseMimeType: "application/json",
        ...(responseSchema ? { responseJsonSchema: responseSchema } : {})
      }
    });

    const rawText = getTextFromCandidate(response.candidates?.[0]?.content?.parts);
    if (!rawText) {
      throw new Error("Gemini returned an empty response.");
    }

    return JSON.parse(rawText);
  }
};
