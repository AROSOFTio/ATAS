import { useEffect, useState } from "react";
import { DocumentIdField } from "../components/DocumentIdField";
import { Panel } from "../components/Panel";
import { apiRequest } from "../lib/api";

type AnalysisResponse = {
  total_entries: number;
  total_issues: number;
  high_issues: number;
  medium_issues: number;
  low_issues: number;
  issues: Array<{
    title: string;
    description: string;
    severity: string;
    issue_type: string;
  }>;
};

export function AnalysisPage() {
  const [documentId, setDocumentId] = useState("");
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setDocumentId(localStorage.getItem("currentDocumentId") || "");
  }, []);

  const runAnalysis = async () => {
    if (!documentId) {
      setError("Enter a document ID first.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await apiRequest<AnalysisResponse>(`/api/analyze/${documentId}`, {
        method: "POST"
      });
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Panel title="Analysis">
      <div className="grid gap-4">
        <DocumentIdField value={documentId} onChange={setDocumentId} />
        <button
          onClick={runAnalysis}
          disabled={loading}
          className="w-fit rounded-full bg-[#aa8502] px-5 py-3 text-sm font-semibold text-[#161616] disabled:opacity-50"
        >
          {loading ? "Running..." : "Run"}
        </button>
        {error ? <p className="rounded-2xl border border-[#aa8502]/25 bg-[#2a2222] px-4 py-3 text-sm text-[#f0d48e]">{error}</p> : null}
      </div>

      {result ? (
        <div className="mt-6 grid gap-6">
          <div className="grid gap-4 md:grid-cols-5">
            {[
              ["Entries", result.total_entries],
              ["Issues", result.total_issues],
              ["High", result.high_issues],
              ["Medium", result.medium_issues],
              ["Low", result.low_issues]
            ].map(([label, value]) => (
              <div key={label} className="rounded-3xl border border-[#4d4d4d] bg-[#202020] p-4 text-center">
                <div className="text-xs uppercase tracking-[0.2em] text-[#a7a7a7]">{label}</div>
                <div className="mt-2 text-2xl font-semibold text-white">{value}</div>
              </div>
            ))}
          </div>

          <div className="grid gap-3">
            {result.issues.map((issue, index) => (
              <div key={`${issue.issue_type}-${index}`} className="rounded-3xl border border-[#4d4d4d] bg-[#202020] p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-medium text-white">{issue.title}</h3>
                  <span className="rounded-full bg-[#aa8502]/12 px-3 py-1 text-xs uppercase tracking-[0.2em] text-[#f0d48e]">
                    {issue.severity}
                  </span>
                </div>
                <p className="mt-2 text-sm text-[#d0d0d0]">{issue.description}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </Panel>
  );
}
