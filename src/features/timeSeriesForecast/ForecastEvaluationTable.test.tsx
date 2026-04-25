import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { ForecastEvaluationTable } from "./ForecastEvaluationTable";
import type { ForecastEvaluationRow } from "./forecastContract";

describe("ForecastEvaluationTable", () => {
  test("renders an accessible table caption", () => {
    const rows: ForecastEvaluationRow[] = [
      { time: "40 s", actual: "-0.164", physics: "-0.155", panorama: "-0.161", note: "测试段起点" }
    ];

    render(<ForecastEvaluationTable rows={rows} />);

    expect(screen.getByText("预测评估切片对比表")).toBeInTheDocument();
  });
});
