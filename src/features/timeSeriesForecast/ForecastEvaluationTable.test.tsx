import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { ForecastEvaluationTable } from "./ForecastEvaluationTable";
import type { ForecastEvaluationRow } from "./forecastContract";

describe("ForecastEvaluationTable", () => {
  test("renders an accessible table caption", () => {
    const rows: ForecastEvaluationRow[] = [
      { time: "40 s", actual: "-0.164", physics: "-0.155", panorama: "-0.161", note: "测试段起点" }
    ];

    render(<ForecastEvaluationTable rows={rows} targetVariable="theta" />);

    expect(screen.getByText("预测评估切片对比表")).toBeInTheDocument();
  });

  test("uses the selected variable in table headings", () => {
    const rows: ForecastEvaluationRow[] = [
      { time: "40 s", actual: "-0.052 rad/s", physics: "未启用", panorama: "-0.049 rad/s", note: "测试段起点" }
    ];

    render(<ForecastEvaluationTable rows={rows} targetVariable="omega" />);

    expect(screen.getByRole("columnheader", { name: "真实 omega" })).toBeInTheDocument();
    expect(screen.getByText("-0.052 rad/s")).toBeInTheDocument();
    expect(screen.getByText("未启用")).toBeInTheDocument();
  });
});
