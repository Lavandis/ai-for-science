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

    expect(screen.getByRole("heading", { name: "探索未知的边界触手可及" })).toBeInTheDocument();
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
    expect(within(featureEntrySection).getByRole("link", { name: "了解更多：图像识别" })).toHaveAttribute(
      "href",
      "/image-recognition"
    );
    expect(within(featureEntrySection).getByRole("link", { name: "了解更多：模板匹配" })).toHaveAttribute(
      "href",
      "/template-matching"
    );
    expect(within(featureEntrySection).getByRole("link", { name: "了解更多：时序预测" })).toHaveAttribute(
      "href",
      "/time-series-forecast"
    );
    const pauseButton = within(featureEntrySection).getByRole("button", { name: "暂停轮播" });
    fireEvent.click(pauseButton);
    expect(within(featureEntrySection).getByRole("button", { name: "继续轮播" })).toBeInTheDocument();
    expect(screen.getByText(/识别与预测能力/)).toBeInTheDocument();
  });

  test("keeps the home carousel paused until hover and keyboard focus are both cleared", async () => {
    vi.useFakeTimers();
    const originalScrollTo = HTMLElement.prototype.scrollTo;
    const scrollToMock = vi.fn();
    HTMLElement.prototype.scrollTo = scrollToMock;

    try {
      render(
        <MemoryRouter initialEntries={["/"]}>
          <App />
        </MemoryRouter>
      );

      const featureEntrySection = screen.getByRole("region", { name: "功能入口" });
      const firstDetailLink = within(featureEntrySection).getByRole("link", { name: "了解更多：图像识别" });

      fireEvent.mouseEnter(featureEntrySection);
      fireEvent.focus(firstDetailLink);
      fireEvent.mouseLeave(featureEntrySection);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(4500);
      });

      expect(scrollToMock).not.toHaveBeenCalled();

      fireEvent.blur(firstDetailLink, { relatedTarget: document.body });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(4500);
      });

      expect(scrollToMock).toHaveBeenCalledTimes(1);
    } finally {
      HTMLElement.prototype.scrollTo = originalScrollTo;
    }
  });

  test("starts the home carousel paused for reduced motion users", () => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query === "(prefers-reduced-motion: reduce)",
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn()
    }));

    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>
    );

    const featureEntrySection = screen.getByRole("region", { name: "功能入口" });

    expect(within(featureEntrySection).getByRole("button", { name: "继续轮播" })).toBeInTheDocument();
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
});
