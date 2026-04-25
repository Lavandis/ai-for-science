import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { defaultForecastJobRequest, forecastDatasets, forecastModels } from "./data";
import { ForecastConfigPanel } from "./ForecastConfigPanel";
import type { ForecastDataset } from "./forecastContract";

describe("ForecastConfigPanel", () => {
  test("renders default PANORAMA configuration", () => {
    render(
      <ForecastConfigPanel
        datasets={forecastDatasets}
        models={forecastModels}
        value={defaultForecastJobRequest}
        isRunning={false}
        onChange={vi.fn()}
        onRun={vi.fn()}
      />
    );

    expect(screen.getByLabelText("数据集")).toHaveValue("pendulum-200fps");
    expect(screen.getByLabelText("模型版本")).toHaveValue("panorama-v1");
    expect(screen.getByLabelText("输出变量")).toHaveValue("theta");
    expect(screen.getByLabelText("训练比例")).toHaveValue(75);
    expect(screen.getByRole("button", { name: "运行预测" })).toBeEnabled();
  });

  test("submits the current configuration", () => {
    const onRun = vi.fn();

    render(
      <ForecastConfigPanel
        datasets={forecastDatasets}
        models={forecastModels}
        value={defaultForecastJobRequest}
        isRunning={false}
        onChange={vi.fn()}
        onRun={onRun}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "运行预测" }));

    expect(onRun).toHaveBeenCalledWith(defaultForecastJobRequest);
  });

  test("disables run while a job is active", () => {
    render(
      <ForecastConfigPanel
        datasets={forecastDatasets}
        models={forecastModels}
        value={defaultForecastJobRequest}
        isRunning={true}
        onChange={vi.fn()}
        onRun={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: "预测运行中" })).toBeDisabled();
  });

  test("handles empty datasets and models without enabling run", () => {
    render(
      <ForecastConfigPanel
        datasets={[]}
        models={[]}
        value={defaultForecastJobRequest}
        isRunning={false}
        onChange={vi.fn()}
        onRun={vi.fn()}
      />
    );

    expect(screen.getByText("暂无可用数据集")).toBeInTheDocument();
    expect(screen.getByText("暂无可用模型")).toBeInTheDocument();
    expect(screen.getByText("请先配置可用数据集与模型")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "运行预测" })).toBeDisabled();
  });

  test("clamps numeric configuration changes to supported ranges", () => {
    const onChange = vi.fn();

    render(
      <ForecastConfigPanel
        datasets={forecastDatasets}
        models={forecastModels}
        value={defaultForecastJobRequest}
        isRunning={false}
        onChange={onChange}
        onRun={vi.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText("训练比例"), { target: { value: "95" } });
    fireEvent.change(screen.getByLabelText("预测窗口"), { target: { value: "" } });

    expect(onChange).toHaveBeenNthCalledWith(1, { ...defaultForecastJobRequest, trainRatio: 0.9 });
    expect(onChange).toHaveBeenNthCalledWith(2, { ...defaultForecastJobRequest, horizonSeconds: 10 });
  });

  test("disables run when selected dataset or model ids are stale", () => {
    const onRun = vi.fn();

    render(
      <ForecastConfigPanel
        datasets={forecastDatasets}
        models={forecastModels}
        value={{ ...defaultForecastJobRequest, datasetId: "missing-dataset", modelId: "missing-model" }}
        isRunning={false}
        onChange={vi.fn()}
        onRun={onRun}
      />
    );

    const runButton = screen.getByRole("button", { name: "运行预测" });

    expect(runButton).toBeDisabled();
    fireEvent.click(runButton);
    expect(onRun).not.toHaveBeenCalled();
  });

  test("updates sample rate and target variable when dataset changes", () => {
    const onChange = vi.fn();
    const omegaOnlyDataset: ForecastDataset = {
      id: "pendulum-omega-only",
      name: "单摆角速度样例",
      sourcePath: "data/processed/omega_only.csv",
      sampleRateFps: 120,
      durationSeconds: 180,
      variables: ["omega"],
      description: "仅包含 omega 角速度。"
    };

    render(
      <ForecastConfigPanel
        datasets={[...forecastDatasets, omegaOnlyDataset]}
        models={forecastModels}
        value={defaultForecastJobRequest}
        isRunning={false}
        onChange={onChange}
        onRun={vi.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText("数据集"), { target: { value: omegaOnlyDataset.id } });

    expect(onChange).toHaveBeenCalledWith({
      ...defaultForecastJobRequest,
      datasetId: omegaOnlyDataset.id,
      sampleRateFps: 120,
      targetVariable: "omega"
    });
  });

  test("ignores non-finite numeric configuration input", () => {
    const onChange = vi.fn();

    render(
      <ForecastConfigPanel
        datasets={forecastDatasets}
        models={forecastModels}
        value={defaultForecastJobRequest}
        isRunning={false}
        onChange={onChange}
        onRun={vi.fn()}
      />
    );

    const trainRatioInput = screen.getByLabelText("训练比例");
    const horizonInput = screen.getByLabelText("预测窗口");

    Object.defineProperty(trainRatioInput, "validity", { value: { badInput: true }, configurable: true });
    Object.defineProperty(horizonInput, "validity", { value: { badInput: true }, configurable: true });

    fireEvent.change(trainRatioInput, { target: { value: "" } });
    fireEvent.change(horizonInput, { target: { value: "" } });

    expect(onChange).not.toHaveBeenCalled();
  });
});
