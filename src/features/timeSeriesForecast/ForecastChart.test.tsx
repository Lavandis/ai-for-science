import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { ForecastChart } from "./ForecastChart";
import type { ForecastSeriesPoint } from "./forecastContract";

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
    expect(screen.getByText("横轴：时间 (s)")).toBeInTheDocument();
    expect(screen.getByText("纵轴：单摆角度 (rad)")).toBeInTheDocument();
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

    render(<ForecastChart baselineEnabled={false} series={series} targetVariable="omega" />);

    expect(screen.getByRole("img", { name: /角速度 omega/ })).toBeInTheDocument();
    expect(screen.getByText("真实角速度 omega")).toBeInTheDocument();
    expect(screen.queryByText("纯物理基线")).not.toBeInTheDocument();
    expect(screen.getByText("纵轴：角速度 omega (rad/s)")).toBeInTheDocument();
  });

  test("opens an enlarged chart dialog", async () => {
    const series: ForecastSeriesPoint[] = [
      { second: 0, actual: -0.12, physics: -0.1, panorama: -0.11, phase: "test" },
      { second: 5, actual: 0.18, physics: 0.2, panorama: 0.17, phase: "test" }
    ];
    render(<ForecastChart baselineEnabled={true} series={series} targetVariable="theta" />);

    fireEvent.click(screen.getByRole("button", { name: "放大查看预测图" }));

    expect(screen.getByRole("dialog", { name: "放大预测图" })).toBeInTheDocument();
    expect(screen.getByText("标准坐标视图")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "关闭放大图" }));

    expect(screen.queryByRole("dialog", { name: "放大预测图" })).not.toBeInTheDocument();
  });
});
