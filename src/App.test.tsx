import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, test, vi } from "vitest";
import App from "./App";

describe("AI for Science routes", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  test("renders the home page with links to the three product modules", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>
    );

    const featureEntrySection = screen.getByRole("region", { name: "功能入口" });

    expect(screen.getByRole("heading", { name: /AI for Science/i })).toBeInTheDocument();
    expect(within(featureEntrySection).getByRole("link", { name: "进入图像识别" })).toHaveAttribute(
      "href",
      "/image-recognition"
    );
    expect(within(featureEntrySection).getByRole("link", { name: "进入模板匹配" })).toHaveAttribute(
      "href",
      "/template-matching"
    );
    expect(within(featureEntrySection).getByRole("link", { name: "进入时序预测" })).toHaveAttribute(
      "href",
      "/time-series-forecast"
    );
    expect(within(featureEntrySection).getByRole("heading", { name: "图像识别" })).toBeInTheDocument();
    expect(within(featureEntrySection).getByRole("heading", { name: "模板匹配" })).toBeInTheDocument();
    expect(within(featureEntrySection).getByRole("heading", { name: "时序预测" })).toBeInTheDocument();
    expect(screen.getByText(/图像识别、模板匹配与时序预测/)).toBeInTheDocument();
  });

  test("renders 图像识别 as an independent page", () => {
    render(
      <MemoryRouter initialEntries={["/image-recognition"]}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: "图像识别" })).toBeInTheDocument();
    expect(screen.getByText("样本来源")).toBeInTheDocument();
    expect(screen.getByText("关键点坐标")).toBeInTheDocument();
    expect(screen.getByText("摆球中心")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "功能入口" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "模板匹配" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "时序预测" })).not.toBeInTheDocument();
  });

  test("renders 模板匹配 as an independent page", () => {
    render(
      <MemoryRouter initialEntries={["/template-matching"]}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: "模板匹配" })).toBeInTheDocument();
    expect(screen.getByText("目标模板")).toBeInTheDocument();
    expect(screen.getByText("推荐模板")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "功能入口" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "图像识别" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "时序预测" })).not.toBeInTheDocument();
  });

  test("renders 时序预测 as an interactive PANORAMA workbench", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    render(
      <MemoryRouter initialEntries={["/time-series-forecast"]}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: "时序预测" })).toBeInTheDocument();
    expect(screen.getByLabelText("数据集")).toHaveValue("pendulum-200fps");
    expect(screen.getByRole("button", { name: "运行预测" })).toBeInTheDocument();
    expect(screen.getByText("尚未运行")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "运行预测" }));
    expect(await screen.findByText("forecast-job-1")).toBeInTheDocument();
    expect(screen.getByText("预测任务已进入队列")).toBeInTheDocument();

    await vi.advanceTimersByTimeAsync(700);
    expect(await screen.findByText("正在执行 PANORAMA 滚动积分")).toBeInTheDocument();

    await vi.advanceTimersByTimeAsync(900);
    expect(await screen.findByText("预测完成")).toBeInTheDocument();
    expect(screen.getByText("PANORAMA RMSE")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /单摆角度真实值/ })).toBeInTheDocument();

    expect(screen.queryByRole("region", { name: "功能入口" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "图像识别" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "模板匹配" })).not.toBeInTheDocument();

    vi.useRealTimers();
  });
});
