import { afterEach, describe, expect, test, vi } from "vitest";
import { defaultForecastJobRequest } from "./data";
import { createHttpForecastService } from "./forecastService";

describe("createHttpForecastService", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("creates a forecast job through the backend API", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: "forecast-job-1",
        status: "queued",
        createdAt: "2026-05-02T00:00:00.000Z",
        updatedAt: "2026-05-02T00:00:00.000Z",
        request: defaultForecastJobRequest,
        progress: 12,
        message: "预测任务已进入队列"
      })
    });
    vi.stubGlobal("fetch", fetchMock);

    const service = createHttpForecastService("http://127.0.0.1:8000");
    const job = await service.createForecastJob(defaultForecastJobRequest);

    expect(job.id).toBe("forecast-job-1");
    expect(fetchMock).toHaveBeenCalledWith("http://127.0.0.1:8000/api/forecast/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(defaultForecastJobRequest)
    });
  });

  test("surfaces backend errors with a readable message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 409,
        json: async () => ({ detail: "预测任务尚未完成" })
      })
    );

    const service = createHttpForecastService("http://127.0.0.1:8000");

    await expect(service.getForecastResult("forecast-job-1")).rejects.toThrow("预测任务尚未完成");
  });
});
