import { useState } from "react";
import { Panel } from "../components/Panel";
import { apiRequest } from "../lib/api";

type UploadResponse = {
  document_id: string;
  total_chunks: number;
  parsed_entries: number;
  processing_status: string;
};

export function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [result, setResult] = useState<UploadResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file) {
      setError("Choose a PDF, CSV, or TXT timetable.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      if (title.trim()) {
        formData.append("title", title.trim());
      }

      const response = await apiRequest<UploadResponse>("/api/upload", {
        method: "POST",
        body: formData
      });

      setResult(response);
      localStorage.setItem("currentDocumentId", response.document_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Panel title="Upload">
      <form onSubmit={submit} className="grid gap-5">
        <label className="block">
          <span className="mb-2 block text-sm text-[#d0d0d0]">Title</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Semester timetable"
            className="w-full rounded-2xl border border-[#4d4d4d] bg-[#202020] px-4 py-3 text-sm text-white placeholder:text-[#8a8a8a]"
          />
        </label>

        <label className="block rounded-[2rem] border border-dashed border-[#aa8502]/35 bg-[#222222] p-6">
          <span className="mb-3 block text-sm text-[#d0d0d0]">File</span>
          <input
            type="file"
            accept=".pdf,.csv,.txt"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className="block w-full text-sm"
          />
          {file ? <p className="mt-3 text-sm text-[#b1b1b1]">{file.name}</p> : null}
        </label>

        <button
          type="submit"
          disabled={loading}
          className="w-fit rounded-full bg-[#aa8502] px-5 py-3 text-sm font-semibold text-[#161616] disabled:opacity-50"
        >
          {loading ? "Uploading..." : "Upload"}
        </button>
      </form>

      {error ? <p className="mt-4 rounded-2xl border border-[#aa8502]/25 bg-[#2a2222] px-4 py-3 text-sm text-[#f0d48e]">{error}</p> : null}

      {result ? (
        <div className="mt-6 grid gap-3 rounded-[2rem] border border-[#4d4d4d] bg-[#202020] p-5 text-sm text-[#e2e2e2]">
          <div>
            <span className="text-[#a8a8a8]">Document ID:</span> {result.document_id}
          </div>
          <div>
            <span className="text-[#a8a8a8]">Chunks:</span> {result.total_chunks}
          </div>
          <div>
            <span className="text-[#a8a8a8]">Entries:</span> {result.parsed_entries}
          </div>
          <div>
            <span className="text-[#a8a8a8]">Status:</span> {result.processing_status}
          </div>
        </div>
      ) : null}
    </Panel>
  );
}
