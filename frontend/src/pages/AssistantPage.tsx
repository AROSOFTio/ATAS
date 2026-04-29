import { useEffect, useState } from "react";
import { DocumentIdField } from "../components/DocumentIdField";
import { Panel } from "../components/Panel";
import { apiRequest } from "../lib/api";

type AiResponse = {
  answer: string;
  matched_entries: Array<Record<string, unknown>>;
  referenced_chunks: Array<{ content: string; similarity: number }>;
  related_issues: Array<Record<string, unknown>>;
  confidence: string;
};

const suggestionQuestions = [
  "When does BIT 3:2 Weekend start exams?",
  "What is the first paper for BIT 3:2?",
  "When is IT Audit?",
  "Which exams have missing rooms?"
];

export function AssistantPage() {
  const [documentId, setDocumentId] = useState("");
  const [question, setQuestion] = useState(suggestionQuestions[0]);
  const [result, setResult] = useState<AiResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setDocumentId(localStorage.getItem("currentDocumentId") || "");
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!documentId || !question.trim()) {
      setError("Provide a document ID and question.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await apiRequest<AiResponse>("/api/ai/query", {
        method: "POST",
        body: JSON.stringify({
          document_id: documentId,
          question
        })
      });
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI request failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <Panel title="Assistant">
        <form onSubmit={submit} className="grid gap-4">
          <DocumentIdField value={documentId} onChange={setDocumentId} />
          <label className="block">
            <span className="mb-2 block text-sm text-slate-300">Question</span>
            <textarea
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              rows={4}
              className="w-full rounded-2xl border border-[#4d4d4d] bg-[#202020] px-4 py-3 text-sm text-white placeholder:text-[#8a8a8a]"
            />
          </label>

          <div className="flex flex-wrap gap-2">
            {suggestionQuestions.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setQuestion(item)}
                className="rounded-full border border-[#4d4d4d] px-3 py-2 text-xs text-[#d0d0d0] hover:border-[#aa8502]/40 hover:bg-[#282828]"
              >
                {item}
              </button>
            ))}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-fit rounded-full bg-[#aa8502] px-5 py-3 text-sm font-semibold text-[#161616] disabled:opacity-50"
          >
            {loading ? "Checking..." : "Ask AI"}
          </button>
        </form>

        {error ? <p className="mt-4 rounded-2xl border border-[#aa8502]/25 bg-[#2a2222] px-4 py-3 text-sm text-[#f0d48e]">{error}</p> : null}

        {result ? (
          <div className="mt-6 grid gap-4 rounded-[2rem] border border-[#4d4d4d] bg-[#202020] p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-white">Answer</h3>
              <span className="rounded-full bg-[#aa8502]/12 px-3 py-1 text-xs uppercase tracking-[0.2em] text-[#f0d48e]">
                {result.confidence}
              </span>
            </div>
            <p className="text-sm leading-6 text-[#e2e2e2]">{result.answer}</p>
          </div>
        ) : null}
      </Panel>

      <Panel title="Context">
        {!result ? (
          <p className="text-sm text-[#a8a8a8]">No result yet.</p>
        ) : (
          <div className="grid gap-5 text-sm text-[#d0d0d0]">
            <div>
              <h3 className="mb-2 font-medium text-white">Matched Entries</h3>
              <pre className="overflow-auto rounded-2xl border border-[#4d4d4d] bg-[#202020] p-4 text-xs">
                {JSON.stringify(result.matched_entries, null, 2)}
              </pre>
            </div>
            <div>
              <h3 className="mb-2 font-medium text-white">Referenced Chunks</h3>
              <pre className="overflow-auto rounded-2xl border border-[#4d4d4d] bg-[#202020] p-4 text-xs">
                {JSON.stringify(result.referenced_chunks, null, 2)}
              </pre>
            </div>
            <div>
              <h3 className="mb-2 font-medium text-white">Related Issues</h3>
              <pre className="overflow-auto rounded-2xl border border-[#4d4d4d] bg-[#202020] p-4 text-xs">
                {JSON.stringify(result.related_issues, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </Panel>
    </div>
  );
}
