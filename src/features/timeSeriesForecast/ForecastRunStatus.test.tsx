import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { defaultForecastJobRequest } from "./data";
import { ForecastRunStatus } from "./ForecastRunStatus";
import type { ForecastJob } from "./forecastContract";

describe("ForecastRunStatus", () => {
  test("uses neutral fallback copy for non-idle status without a job", () => {
    render(<ForecastRunStatus status="running" job={null} errorMessage={null} />);

    expect(screen.getByRole("heading", { name: "任务准备中" })).toBeInTheDocument();
    expect(screen.getByText("等待任务状态同步。")).toBeInTheDocument();
    expect(screen.queryByText("配置参数后点击运行，前端会模拟创建预测任务。")).not.toBeInTheDocument();
  });

  test("clamps progressbar semantics and visual width", () => {
    const job: ForecastJob = {
      id: "forecast-job-001",
      status: "running",
      createdAt: "2026-04-25T10:00:00.000Z",
      updatedAt: "2026-04-25T10:00:01.000Z",
      request: defaultForecastJobRequest,
      progress: 135,
      message: "预测任务运行中。"
    };

    render(<ForecastRunStatus status="running" job={job} errorMessage={null} />);

    const progressbar = screen.getByRole("progressbar", { name: "任务进度 100%" });

    expect(progressbar).toHaveAttribute("aria-valuemin", "0");
    expect(progressbar).toHaveAttribute("aria-valuemax", "100");
    expect(progressbar).toHaveAttribute("aria-valuenow", "100");
    expect(progressbar.firstElementChild).toHaveStyle({ width: "100%" });
  });

  test("sanitizes non-finite progress before rendering progressbar state", () => {
    const job: ForecastJob = {
      id: "forecast-job-002",
      status: "running",
      createdAt: "2026-04-25T10:00:00.000Z",
      updatedAt: "2026-04-25T10:00:01.000Z",
      request: defaultForecastJobRequest,
      progress: Number.NaN,
      message: "预测任务运行中。"
    };

    render(<ForecastRunStatus status="running" job={job} errorMessage={null} />);

    const progressbar = screen.getByRole("progressbar", { name: "任务进度 0%" });

    expect(progressbar).toHaveAttribute("aria-valuenow", "0");
    expect(progressbar.firstElementChild).toHaveStyle({ width: "0%" });
  });

  test("announces job state and message changes without folding progress into the live text", () => {
    const job: ForecastJob = {
      id: "forecast-job-003",
      status: "queued",
      createdAt: "2026-04-25T10:00:00.000Z",
      updatedAt: "2026-04-25T10:00:01.000Z",
      request: defaultForecastJobRequest,
      progress: 12,
      message: "预测任务已进入队列"
    };

    const { rerender } = render(<ForecastRunStatus status="queued" job={job} errorMessage={null} />);

    expect(screen.getByRole("region", { name: "预测任务状态" })).toBeInTheDocument();

    const status = screen.getByRole("status", { name: "预测任务状态更新" });

    expect(status).toHaveTextContent("forecast-job-003");
    expect(status).toHaveTextContent("queued");
    expect(status).toHaveTextContent("预测任务已进入队列");
    expect(status).not.toHaveTextContent("12%");

    rerender(
      <ForecastRunStatus
        status="failed"
        job={{ ...job, status: "failed", progress: 100, message: "状态同步失败" }}
        errorMessage="状态同步失败"
      />
    );

    expect(screen.getByRole("status", { name: "预测任务状态更新" })).toHaveTextContent("failed");
    expect(screen.getByRole("status", { name: "预测任务状态更新" })).toHaveTextContent("状态同步失败");
    expect(screen.getByRole("progressbar", { name: "任务进度 100%" })).toBeInTheDocument();
  });
});
