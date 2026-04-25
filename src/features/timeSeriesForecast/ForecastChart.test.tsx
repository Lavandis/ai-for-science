import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { ForecastChart } from "./ForecastChart";
import type { ForecastSeriesPoint } from "./forecastContract";

function getSeriesLines(container: HTMLElement) {
  return Array.from(container.querySelectorAll(".series-line"));
}

describe("ForecastChart", () => {
  test("renders a clear empty state when series is empty", () => {
    render(<ForecastChart baselineEnabled={true} series={[]} targetVariable="theta" />);

    expect(screen.getByRole("status")).toHaveTextContent("暂无预测序列数据");
  });

  test("uses finite coordinates for a one-point series", () => {
    const series: ForecastSeriesPoint[] = [
      { second: 10, actual: 0.12, physics: 0.13, panorama: 0.11, phase: "test" }
    ];

    const { container } = render(<ForecastChart baselineEnabled={true} series={series} targetVariable="theta" />);

    expect(screen.getByRole("img", { name: /单摆角度真实值/ })).toBeInTheDocument();
    expect(container.innerHTML).not.toMatch(/NaN|Infinity/);
    expect(getSeriesLines(container)).toHaveLength(3);
  });

  test("uses finite coordinates when every point has the same second", () => {
    const series: ForecastSeriesPoint[] = [
      { second: 10, actual: 0.12, physics: 0.13, panorama: 0.11, phase: "test" },
      { second: 10, actual: 0.15, physics: 0.16, panorama: 0.14, phase: "test" }
    ];

    const { container } = render(<ForecastChart baselineEnabled={true} series={series} targetVariable="theta" />);

    expect(screen.getByRole("img", { name: /单摆角度真实值/ })).toBeInTheDocument();
    expect(container.innerHTML).not.toMatch(/NaN|Infinity/);
  });

  test("renders chart semantics when prediction series are null", () => {
    const series: ForecastSeriesPoint[] = [
      { second: 0, actual: -0.12, physics: null, panorama: null, phase: "train" },
      { second: 5, actual: 0.18, physics: null, panorama: null, phase: "train" }
    ];

    const { container } = render(<ForecastChart baselineEnabled={true} series={series} targetVariable="theta" />);

    expect(screen.getByRole("img", { name: /单摆角度真实值/ })).toBeInTheDocument();
    expect(screen.getByText(/共 2 个采样点/)).toBeInTheDocument();
    expect(container.innerHTML).not.toMatch(/NaN|Infinity/);
  });

  test("labels omega charts and hides the physics baseline when it is disabled", () => {
    const series: ForecastSeriesPoint[] = [
      { second: 40, actual: -0.05, physics: null, panorama: -0.04, phase: "test" },
      { second: 45, actual: 0.08, physics: null, panorama: 0.07, phase: "test" }
    ];

    const { container } = render(<ForecastChart baselineEnabled={false} series={series} targetVariable="omega" />);

    expect(screen.getByRole("img", { name: /角速度 omega/ })).toBeInTheDocument();
    expect(screen.getByText("真实角速度 omega")).toBeInTheDocument();
    expect(screen.queryByText("纯物理基线")).not.toBeInTheDocument();
    expect(getSeriesLines(container)).toHaveLength(2);
  });

  test("draws omega charts from omega-specific series fields", () => {
    const series: ForecastSeriesPoint[] = [
      {
        second: 0,
        actual: 0,
        actualOmega: -1,
        physics: 0,
        physicsOmega: -0.5,
        panorama: 0,
        panoramaOmega: -0.8,
        phase: "test"
      },
      {
        second: 10,
        actual: 0,
        actualOmega: 1,
        physics: 0,
        physicsOmega: 0.5,
        panorama: 0,
        panoramaOmega: 0.8,
        phase: "test"
      }
    ];

    const { container } = render(<ForecastChart baselineEnabled={true} series={series} targetVariable="omega" />);
    const actualLine = container.querySelector(".series-line--actual");

    expect(actualLine?.getAttribute("points")).toBe("42.0,273.5 878.0,46.5");
  });
});
