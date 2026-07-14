import type { ForecastDataset, ForecastJobRequest, ForecastModel, ForecastVariable } from "./forecastContract";

type ForecastConfigPanelProps = {
  datasets: ForecastDataset[];
  models: ForecastModel[];
  value: ForecastJobRequest;
  isRunning: boolean;
  onChange: (nextValue: ForecastJobRequest) => void;
  onRun: (request: ForecastJobRequest) => void;
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export function ForecastConfigPanel({
  datasets,
  models,
  value,
  isRunning,
  onChange,
  onRun
}: ForecastConfigPanelProps) {
  const update = (nextValue: Partial<ForecastJobRequest>) => {
    onChange({ ...value, ...nextValue });
  };

  const selectedDataset = datasets.find((dataset) => dataset.id === value.datasetId);
  const selectedModel = models.find((model) => model.id === value.modelId);
  const isTargetSupported = selectedDataset?.variables.includes(value.targetVariable) ?? false;
  const canRun = !isRunning && Boolean(selectedDataset) && Boolean(selectedModel) && isTargetSupported;
  const targetVariables = selectedDataset?.variables ?? ["theta", "omega"];

  const updateDataset = (datasetId: string) => {
    const nextDataset = datasets.find((dataset) => dataset.id === datasetId);

    if (!nextDataset) {
      update({ datasetId });
      return;
    }

    update({
      datasetId,
      sampleRateFps: nextDataset.sampleRateFps,
      targetVariable: nextDataset.variables.includes(value.targetVariable)
        ? value.targetVariable
        : (nextDataset.variables[0] ?? value.targetVariable)
    });
  };

  const updateNumber = (
    input: HTMLInputElement,
    min: number,
    max: number,
    onValidValue: (nextValue: number) => void
  ) => {
    const rawValue = input.value;
    const numericValue = Number(rawValue);

    if (input.validity.badInput || (rawValue !== "" && !Number.isFinite(numericValue))) {
      return;
    }

    onValidValue(clamp(numericValue, min, max));
  };

  return (
    <section className="forecast-config-card" aria-label="预测配置">
      <div>
        <h2>预测设置</h2>
        <p>设置观测区间与预测时长。</p>
      </div>

      {datasets.length > 1 ? (
        <label className="forecast-control">
          <span>实验数据</span>
          <select value={value.datasetId} onChange={(event) => updateDataset(event.target.value)}>
            {datasets.map((dataset) => (
              <option key={dataset.id} value={dataset.id}>
                {dataset.name}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <div className="forecast-readonly-field">
          <span>实验数据</span>
          <strong>{selectedDataset?.name ?? "暂无可用数据集"}</strong>
        </div>
      )}

      {models.length > 1 ? (
        <label className="forecast-control">
          <span>预测模型</span>
          <select value={value.modelId} onChange={(event) => update({ modelId: event.target.value })}>
            {models.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name} {model.version}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <div className="forecast-readonly-field">
          <span>预测模型</span>
          <strong>{selectedModel?.name ?? "暂无可用模型"}</strong>
        </div>
      )}

      <label className="forecast-control">
        <span>输出变量</span>
        <select
          value={value.targetVariable}
          onChange={(event) => update({ targetVariable: event.target.value as ForecastVariable })}
        >
          {targetVariables.includes("theta") ? <option value="theta">theta 摆角</option> : null}
          {targetVariables.includes("omega") ? <option value="omega">omega 角速度</option> : null}
        </select>
      </label>

      <label className="forecast-control">
        <span>观测窗口比例</span>
        <input
          min="50"
          max="90"
          step="5"
          type="number"
          value={Math.round(value.trainRatio * 100)}
          onChange={(event) =>
            updateNumber(event.currentTarget, 50, 90, (nextValue) => update({ trainRatio: nextValue / 100 }))
          }
        />
      </label>

      <label className="forecast-control">
        <span>预测时长</span>
        <input
          min="10"
          max="120"
          step="10"
          type="number"
          value={value.horizonSeconds}
          onChange={(event) =>
            updateNumber(event.currentTarget, 10, 120, (nextValue) => update({ horizonSeconds: nextValue }))
          }
        />
      </label>

      <label className="forecast-check">
        <input
          checked={value.baselineEnabled}
          type="checkbox"
          onChange={(event) => update({ baselineEnabled: event.target.checked })}
        />
        <span>启用纯物理基线对比</span>
      </label>

      <div className="forecast-config-summary" aria-label="数据概览">
        {selectedDataset ? (
          <>
            <span>{selectedDataset.sampleRateFps} fps</span>
            <span>{selectedDataset.durationSeconds} s 序列</span>
          </>
        ) : (
          <span>请先配置可用数据与模型</span>
        )}
      </div>

      <button className="forecast-run-button" type="button" disabled={!canRun} onClick={() => onRun(value)}>
        {isRunning ? "预测运行中" : "运行预测"}
      </button>
    </section>
  );
}
