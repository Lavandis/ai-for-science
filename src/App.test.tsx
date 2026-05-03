import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, test, vi } from "vitest";
import App from "./App";

describe("AI for Science routes", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  test("renders the home page with links to the three product modules", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>
    );

    const featureEntrySection = screen.getByRole("region", { name: "功能入口" });

    expect(screen.getByRole("heading", { name: "科学边界 下一代物理通用模型" })).toBeInTheDocument();
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
    expect(screen.getByRole("link", { name: "开启探索之旅" })).toHaveAttribute("href", "#showcase");
    expect(screen.getAllByRole("link", { name: "了解更多" })).toHaveLength(3);
    expect(screen.getAllByRole("link", { name: "进入模块" })).toHaveLength(3);
  });

  test("renders home carousel pagination controls", () => {
    vi.useFakeTimers();

    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByRole("button", { name: "切换到第 1 个卡片" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "切换到第 2 个卡片" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "切换到第 3 个卡片" })).toBeInTheDocument();
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

    expect(screen.getByRole("heading", { name: "HTPE Template Matching" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Experimental Data Config" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Sequence Preview" })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "功能入口" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "图像识别" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "时序预测" })).not.toBeInTheDocument();
  });

  test("renders 时序预测 as an interactive PANORAMA workbench", async () => {
    vi.useFakeTimers();

    render(
      <MemoryRouter initialEntries={["/time-series-forecast"]}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: "时序预测" })).toBeInTheDocument();
    expect(screen.getByLabelText("数据集")).toHaveValue("pendulum-200fps");
    expect(screen.getByRole("button", { name: "运行预测" })).toBeInTheDocument();
    expect(screen.getByText("尚未运行")).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "运行预测" }));
    });
    expect(screen.getByText("forecast-job-1")).toBeInTheDocument();
    expect(screen.getByText("预测任务已进入队列")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "预测运行中" })).toBeDisabled();
    expect(screen.getByText("正在准备 PANORAMA 预测")).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(700);
    });
    expect(screen.getByText("正在执行 PANORAMA 滚动积分")).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1050);
    });
    expect(screen.getByText("预测完成")).toBeInTheDocument();
    expect(screen.getByText("PANORAMA RMSE")).toBeInTheDocument();
    expect(screen.getByText("0.012909 rad")).toBeInTheDocument();
    expect(screen.getByText("+91.33%")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /单摆角度真实值/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "运行预测" })).toBeEnabled();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "运行预测" }));
    });
    expect(screen.getByText("forecast-job-2")).toBeInTheDocument();
    expect(screen.getByText("预测任务已进入队列")).toBeInTheDocument();
    expect(screen.queryByText("PANORAMA RMSE")).not.toBeInTheDocument();

    expect(screen.queryByRole("region", { name: "功能入口" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "图像识别" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "模板匹配" })).not.toBeInTheDocument();

    vi.useRealTimers();
  });

  test("creates a fresh forecast service for each time series page render", async () => {
    vi.useFakeTimers();

    render(
      <MemoryRouter initialEntries={["/time-series-forecast"]}>
        <App />
      </MemoryRouter>
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "运行预测" }));
    });

    expect(screen.getByText("forecast-job-1")).toBeInTheDocument();

    vi.useRealTimers();
  });

  test("renders omega results without physics baseline when configured", async () => {
    vi.useFakeTimers();

    render(
      <MemoryRouter initialEntries={["/time-series-forecast"]}>
        <App />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText("输出变量"), { target: { value: "omega" } });
    fireEvent.click(screen.getByLabelText("启用纯物理基线对比"));

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "运行预测" }));
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1750);
    });

    expect(screen.getByRole("img", { name: /角速度 omega真实值与 PANORAMA 预测对比图/ })).toBeInTheDocument();
    expect(screen.getByText("真实角速度 omega")).toBeInTheDocument();
    expect(screen.getByText("基线对照")).toBeInTheDocument();
    expect(screen.getByText("已关闭")).toBeInTheDocument();
    expect(screen.queryByText("纯物理基线")).not.toBeInTheDocument();

    vi.useRealTimers();
  });
});
