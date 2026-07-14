import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { ForecastMetrics } from "./ForecastMetrics";

describe("ForecastMetrics", () => {
  test("renders forecast metrics as a compact definition list", () => {
    render(
      <ForecastMetrics
        status="completed"
        metrics={[
          { label: "ORION RMSE", value: "0.012909 rad", note: "测试窗口" },
          { label: "外推窗口", value: "60 s", note: "滚动预测" },
        ]}
      />
    );

    expect(screen.getByRole("list", { name: "预测摘要" })).toBeInTheDocument();
    expect(screen.getByText("ORION RMSE")).toBeInTheDocument();
    expect(screen.getByText("预测完成")).toBeInTheDocument();
  });
});
