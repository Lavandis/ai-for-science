import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { ParameterMatchingPage as TemplateMatchingPage } from "./features/parameterMatching/ParameterMatchingPage";
import { HomePage } from "./pages/HomePage";
import { TimeSeriesForecastPage } from "./features/timeSeriesForecast/TimeSeriesForecastPage";

function ImageRecognitionPlaceholder() {
  return (
    <div className="page-stack">
      <section aria-label="图像识别模块占位">
        <p className="eyebrow">Module in Progress</p>
        <p>图像识别独立页将在后续任务中补齐真实内容。</p>
      </section>
    </div>
  );
}

export default function App() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/image-recognition" element={<ImageRecognitionPlaceholder />} />
        <Route path="/template-matching" element={<TemplateMatchingPage />} />
        <Route path="/time-series-forecast" element={<TimeSeriesForecastPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppLayout>
  );
}
