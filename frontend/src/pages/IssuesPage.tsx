import { useEffect, useState } from "react";
import { DocumentIdField } from "../components/DocumentIdField";
import { Panel } from "../components/Panel";
import { apiRequest } from "../lib/api";

type IssuesResponse = {
  issues: Array<{
    id: string;
    title: string;
    description: string;
    severity: string;
    issue_type: string;
    status: string;
  }>;
};

export function IssuesPage() {
  const [documentId, setDocumentId] = useState("");
  const [issues, setIssues] = useState<IssuesResponse["issues"]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setDocumentId(localStorage.getItem("currentDocumentId") || "");
  }, []);

  const loadIssues = async () => {
    if (!documentId) {
      setError("Enter a document ID first.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await apiRequest<IssuesResponse>(`/api/analyze/${documentId}/issues`);
      setIssues(response.issues);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load issues.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Panel title="Issues">
      <div className="grid gap-4">
        <DocumentIdField value={documentId} onChange={setDocumentId} />
        <button
          onClick={loadIssues}
          disabled={loading}
          className="w-fit rounded-full border border-[#4d4d4d] bg-[#202020] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {loading ? "Loading..." : "Load"}
        </button>
        {error ? <p className="rounded-2xl border border-[#aa8502]/25 bg-[#2a2222] px-4 py-3 text-sm text-[#f0d48e]">{error}</p> : null}
      </div>

      <div className="mt-6 grid gap-3">
        {issues.map((issue) => (
          <div key={issue.id} className="rounded-3xl border border-[#4d4d4d] bg-[#202020] p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-medium text-white">{issue.title}</h3>
              <span className="rounded-full bg-[#aa8502]/12 px-3 py-1 text-xs uppercase tracking-[0.2em] text-[#f0d48e]">
                {issue.severity}
              </span>
            </div>
            <p className="mt-2 text-sm text-[#d0d0d0]">{issue.description}</p>
            <p className="mt-2 text-xs uppercase tracking-[0.2em] text-[#8d8d8d]">
              {issue.issue_type} | {issue.status}
            </p>
          </div>
        ))}

        {!issues.length && !error ? <p className="text-sm text-[#a8a8a8]">No issues yet.</p> : null}
      </div>
    </Panel>
  );
}
