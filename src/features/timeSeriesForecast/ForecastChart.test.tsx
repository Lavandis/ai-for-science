import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { ForecastChart } from "./ForecastChart";
import type { ForecastSeriesPoint } from "./forecastContract";

function getSeriesLines(container: HTMLElement) {
  return Array.from(container.querySelectorAll(".series-line"));
}

describe("ForecastChart", () => {
  test("renders a clear empty state when series is empty", () => {
    render(<ForecastChart series={[]} />);

    expect(screen.getByRole("status")).toHaveTextContent("暂无预测序列数据");
  });

  test("uses finite coordinates for a one-point series", () => {
    const series: ForecastSeriesPoint[] = [
      { second: 10, actual: 0.12, physics: 0.13, panorama: 0.11, phase: "test" }
    ];

    const { container } = render(<ForecastChart series={series} />);

    expect(screen.getByRole("img", { name: /单摆角度真实值/ })).toBeInTheDocument();
    expect(container.innerHTML).not.toMatch(/NaN|Infinity/);
    expect(getSeriesLines(container)).toHaveLength(3);
  });

  test("uses finite coordinates when every point has the same second", () => {
    const series: ForecastSeriesPoint[] = [
      { second: 10, actual: 0.12, physics: 0.13, panorama: 0.11, phase: "test" },
      { second: 10, actual: 0.15, physics: 0.16, panorama: 0.14, phase: "test" }
    ];

    const { container } = render(<ForecastChart series={series} />);

    expect(screen.getByRole("img", { name: /单摆角度真实值/ })).toBeInTheDocument();
    expect(container.innerHTML).not.toMatch(/NaN|Infinity/);
  });

  test("renders chart semantics when prediction series are null", () => {
    const series: ForecastSeriesPoint[] = [
      { second: 0, actual: -0.12, physics: null, panorama: null, phase: "train" },
      { second: 5, actual: 0.18, physics: null, panorama: null, phase: "train" }
    ];

    const { container } = render(<ForecastChart series={series} />);

    expect(screen.getByRole("img", { name: /单摆角度真实值/ })).toBeInTheDocument();
    expect(screen.getByText(/共 2 个采样点/)).toBeInTheDocument();
    expect(container.innerHTML).not.toMatch(/NaN|Infinity/);
  });
});
