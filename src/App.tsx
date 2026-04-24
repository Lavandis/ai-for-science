import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { HomePage } from "./pages/HomePage";
import { ParameterMatchingPage } from "./features/parameterMatching/ParameterMatchingPage";
import { TimeSeriesForecastPage } from "./features/timeSeriesForecast/TimeSeriesForecastPage";

export default function App() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/parameter-matching" element={<ParameterMatchingPage />} />
        <Route path="/time-series-forecast" element={<TimeSeriesForecastPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppLayout>
  );
}
