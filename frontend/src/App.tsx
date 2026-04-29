import { Routes, Route } from "react-router-dom";
import { Shell } from "./components/Shell";
import { HomePage } from "./pages/HomePage";
import { UploadPage } from "./pages/UploadPage";
import { AnalysisPage } from "./pages/AnalysisPage";
import { AssistantPage } from "./pages/AssistantPage";
import { IssuesPage } from "./pages/IssuesPage";

export default function App() {
  return (
    <Shell>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/analysis" element={<AnalysisPage />} />
        <Route path="/assistant" element={<AssistantPage />} />
        <Route path="/issues" element={<IssuesPage />} />
      </Routes>
    </Shell>
  );
}

