import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, test } from "vitest";
import App from "./App";

describe("AI for Science routes", () => {
  test("renders a minimal home page with separate module entry cards", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: /AI for Science/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /进入参数匹配/ })).toHaveAttribute(
      "href",
      "/parameter-matching"
    );
    expect(screen.getByRole("link", { name: /进入时序预测/ })).toHaveAttribute(
      "href",
      "/time-series-forecast"
    );
  });

  test("renders the parameter matching feature as an independent page", () => {
    render(
      <MemoryRouter initialEntries={["/parameter-matching"]}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: "参数匹配" })).toBeInTheDocument();
    expect(screen.getByText("研究目标")).toBeInTheDocument();
    expect(screen.getByText("推荐参数组合")).toBeInTheDocument();
  });

  test("renders the time series forecast feature as an independent page", () => {
    render(
      <MemoryRouter initialEntries={["/time-series-forecast"]}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: "时序预测" })).toBeInTheDocument();
    expect(screen.getByText("预测步长")).toBeInTheDocument();
    expect(screen.getByText("趋势图占位")).toBeInTheDocument();
  });
});
