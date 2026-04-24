import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, test } from "vitest";
import App from "./App";

describe("AI for Science routes", () => {
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
    expect(screen.getByText(/图像识别、模板匹配与时序预测/)).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "图像识别" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "模板匹配" })).not.toBeInTheDocument();
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
    expect(screen.queryByRole("heading", { name: "模板匹配" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "时序预测" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "进入图像识别" })).not.toBeInTheDocument();
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
    expect(screen.queryByRole("heading", { name: "图像识别" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "时序预测" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "进入模板匹配" })).not.toBeInTheDocument();
  });

  test("renders 时序预测 as an independent page", () => {
    render(
      <MemoryRouter initialEntries={["/time-series-forecast"]}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: "时序预测" })).toBeInTheDocument();
    expect(screen.getByText("预测步长")).toBeInTheDocument();
    expect(screen.getByText("趋势图占位")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "图像识别" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "模板匹配" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "进入时序预测" })).not.toBeInTheDocument();
  });
});
