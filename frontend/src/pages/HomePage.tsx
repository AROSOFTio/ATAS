import { Link } from "react-router-dom";
import { Panel } from "../components/Panel";

const features = [
  "Upload PDF, CSV, or TXT timetables.",
  "Run instant checks for clashes and missing fields.",
  "Search exams with RAG over the uploaded file.",
  "Ask questions without invented answers."
];

export function HomePage() {
  return (
    <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
      <Panel title="Overview">
        <div className="grid gap-4 text-sm text-[#d0d0d0] md:grid-cols-2">
          {features.map((feature) => (
            <div key={feature} className="rounded-3xl border border-[#4d4d4d] bg-[#202020] p-5">
              {feature}
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Quick Flow">
        <div className="space-y-4 text-sm text-[#d0d0d0]">
          <div className="rounded-3xl border border-[#aa8502]/25 bg-[#aa8502]/10 p-4">1. Upload a timetable.</div>
          <div className="rounded-3xl border border-[#4d4d4d] bg-[#242424] p-4">2. Run analysis.</div>
          <div className="rounded-3xl border border-[#4d4d4d] bg-[#202020] p-4">3. Ask the assistant.</div>
          <div className="flex gap-3">
            <Link to="/upload" className="rounded-full bg-[#aa8502] px-4 py-2.5 text-sm font-medium text-[#161616]">
              Upload
            </Link>
            <Link to="/assistant" className="rounded-full border border-[#4d4d4d] px-4 py-2.5 text-sm text-[#e2e2e2]">
              Ask AI
            </Link>
          </div>
        </div>
      </Panel>
    </div>
  );
}
