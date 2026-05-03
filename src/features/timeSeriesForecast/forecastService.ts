import { createMockForecastService, type MockForecastService } from "./mockForecastService";
import type { ForecastDataset, ForecastJob, ForecastJobRequest, ForecastModel, ForecastResult } from "./forecastContract";

export type ForecastService = MockForecastService;

const defaultApiBaseUrl = "http://127.0.0.1:8000";

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

async function readJson<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message = payload?.detail ?? payload?.error ?? `请求失败：${response.status}`;
    throw new Error(message);
  }

  return payload as T;
}

export function createHttpForecastService(baseUrl: string): ForecastService {
  const apiBaseUrl = trimTrailingSlash(baseUrl);

  return {
    async listDatasets() {
      const response = await fetch(`${apiBaseUrl}/api/forecast/datasets`);
      return readJson<ForecastDataset[]>(response);
    },

    async listModels() {
      const response = await fetch(`${apiBaseUrl}/api/forecast/models`);
      return readJson<ForecastModel[]>(response);
    },

    async createForecastJob(request: ForecastJobRequest) {
      const response = await fetch(`${apiBaseUrl}/api/forecast/jobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request)
      });
      return readJson<ForecastJob>(response);
    },

    async getForecastJob(jobId: string) {
      const response = await fetch(`${apiBaseUrl}/api/forecast/jobs/${jobId}`);
      return readJson<ForecastJob>(response);
    },

    async getForecastResult(jobId: string) {
      const response = await fetch(`${apiBaseUrl}/api/forecast/jobs/${jobId}/result`);
      return readJson<ForecastResult>(response);
    }
  };
}

export function createForecastService(): ForecastService {
  if (import.meta.env.MODE === "test" || import.meta.env.VITE_FORECAST_SERVICE === "mock") {
    return createMockForecastService();
  }

  return createHttpForecastService(import.meta.env.VITE_API_BASE_URL ?? defaultApiBaseUrl);
}
