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
    expect(within(featureEntrySection).getByRole("heading", { name: "图像识别" })).toBeInTheDocument();
    expect(within(featureEntrySection).getByRole("heading", { name: "模板匹配" })).toBeInTheDocument();
    expect(within(featureEntrySection).getByRole("heading", { name: "时序预测" })).toBeInTheDocument();
    expect(screen.getByText(/图像识别、模板匹配与时序预测/)).toBeInTheDocument();
  });

  test("renders 模板匹配 as an independent page", () => {
    render(
      <MemoryRouter initialEntries={["/template-matching"]}>
        <App />
      </MemoryRouter>
    );

    // 适配新的 HTPE 模板匹配页面标题
    expect(screen.getByRole("heading", { name: "HTPE 模板匹配" })).toBeInTheDocument();
    
    // 适配新的页面侧边栏标题和预览区文本
    expect(screen.getByText("实验数据配置")).toBeInTheDocument();
    expect(screen.getByText(/输入序列预览/)).toBeInTheDocument();

    // 确保没有渲染其他页面的内容
    expect(screen.queryByRole("region", { name: "功能入口" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "图像识别" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "时序预测" })).not.toBeInTheDocument();
  });
});
