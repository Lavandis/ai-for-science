import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { ImageRecognitionPage } from "./features/imageRecognition/ImageRecognitionPage";
import { TemplateMatchingPage } from "./features/templateMatching/TemplateMatchingPage";
import { HomePage } from "./pages/HomePage";
import { TimeSeriesForecastPage } from "./features/timeSeriesForecast/TimeSeriesForecastPage";

export default function App() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/image-recognition" element={<ImageRecognitionPage />} />
        <Route path="/template-matching" element={<TemplateMatchingPage />} />
        <Route path="/time-series-forecast" element={<TimeSeriesForecastPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppLayout>
  );
}
