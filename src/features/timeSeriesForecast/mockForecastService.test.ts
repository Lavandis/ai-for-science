import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { defaultForecastJobRequest } from "./data";
import { createMockForecastService } from "./mockForecastService";

describe("createMockForecastService", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-25T08:00:00.000Z"));
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  test("returns datasets and models for the configuration panel", async () => {
    const service = createMockForecastService();

    await expect(service.listDatasets()).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: "pendulum-200fps" })])
    );
    await expect(service.listModels()).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: "panorama-v1" })])
    );
  });

  test("moves a forecast job from queued to running to completed", async () => {
    const service = createMockForecastService();
    const job = await service.createForecastJob(defaultForecastJobRequest);

    expect(job).toMatchObject({
      id: "forecast-job-1",
      status: "queued",
      progress: 12,
      message: "预测任务已进入队列"
    });

    await vi.advanceTimersByTimeAsync(700);
    expect(await service.getForecastJob(job.id)).toMatchObject({
      status: "running",
      progress: 58,
      message: "正在执行 PANORAMA 滚动积分"
    });

    await vi.advanceTimersByTimeAsync(900);
    expect(await service.getForecastJob(job.id)).toMatchObject({
      status: "completed",
      progress: 100,
      message: "预测完成"
    });
  });

  test("returns result only after the job is completed", async () => {
    const service = createMockForecastService();
    const job = await service.createForecastJob(defaultForecastJobRequest);

    await expect(service.getForecastResult(job.id)).rejects.toThrow("预测任务尚未完成");

    await vi.advanceTimersByTimeAsync(1600);

    await expect(service.getForecastResult(job.id)).resolves.toMatchObject({
      jobId: job.id,
      targetVariable: "theta",
      metrics: expect.arrayContaining([expect.objectContaining({ label: "PANORAMA RMSE" })])
    });
  });

  test("returns a result matching an omega job request", async () => {
    const service = createMockForecastService();
    const job = await service.createForecastJob({
      ...defaultForecastJobRequest,
      targetVariable: "omega"
    });

    await vi.advanceTimersByTimeAsync(1600);

    await expect(service.getForecastResult(job.id)).resolves.toMatchObject({
      jobId: job.id,
      targetVariable: "omega",
      baselineEnabled: true,
      metrics: expect.arrayContaining([expect.objectContaining({ value: expect.stringContaining("rad/s") })]),
      evaluationRows: expect.arrayContaining([expect.objectContaining({ actual: expect.stringContaining("rad/s") })])
    });
  });

  test("omits physics baseline values when baseline comparison is disabled", async () => {
    const service = createMockForecastService();
    const job = await service.createForecastJob({
      ...defaultForecastJobRequest,
      baselineEnabled: false
    });

    await vi.advanceTimersByTimeAsync(1600);

    const result = await service.getForecastResult(job.id);

    expect(result.baselineEnabled).toBe(false);
    expect(result.series.every((point) => point.physics === null)).toBe(true);
    expect(result.metrics).not.toEqual(expect.arrayContaining([expect.objectContaining({ label: "物理基线 RMSE" })]));
    expect(result.evaluationRows).toEqual(
      expect.arrayContaining([expect.objectContaining({ physics: "未启用" })])
    );
  });
});
