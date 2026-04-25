import type { ForecastDataset, ForecastJobRequest, ForecastModel, ForecastVariable } from "./forecastContract";

type ForecastConfigPanelProps = {
  datasets: ForecastDataset[];
  models: ForecastModel[];
  value: ForecastJobRequest;
  isRunning: boolean;
  onChange: (nextValue: ForecastJobRequest) => void;
  onRun: (request: ForecastJobRequest) => void;
};

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

  const selectedDataset = datasets.find((dataset) => dataset.id === value.datasetId) ?? datasets[0];

  return (
    <section className="forecast-config-card" aria-label="预测配置">
      <div>
        <p className="eyebrow">Forecast Setup</p>
        <h2>实验与预测配置</h2>
        <p>使用内置单摆样例数据，先把预测任务流程跑通。</p>
      </div>

      <label className="forecast-control">
        <span>数据集</span>
        <select value={value.datasetId} onChange={(event) => update({ datasetId: event.target.value })}>
          {datasets.map((dataset) => (
            <option key={dataset.id} value={dataset.id}>
              {dataset.name}
            </option>
          ))}
        </select>
      </label>

      <label className="forecast-control">
        <span>模型版本</span>
        <select value={value.modelId} onChange={(event) => update({ modelId: event.target.value })}>
          {models.map((model) => (
            <option key={model.id} value={model.id}>
              {model.name} {model.version}
            </option>
          ))}
        </select>
      </label>

      <label className="forecast-control">
        <span>输出变量</span>
        <select
          value={value.targetVariable}
          onChange={(event) => update({ targetVariable: event.target.value as ForecastVariable })}
        >
          <option value="theta">theta 摆角</option>
          <option value="omega">omega 角速度</option>
        </select>
      </label>

      <label className="forecast-control">
        <span>训练比例</span>
        <input
          min="50"
          max="90"
          step="5"
          type="number"
          value={Math.round(value.trainRatio * 100)}
          onChange={(event) => update({ trainRatio: Number(event.target.value) / 100 })}
        />
      </label>

      <label className="forecast-control">
        <span>预测窗口</span>
        <input
          min="10"
          max="120"
          step="10"
          type="number"
          value={value.horizonSeconds}
          onChange={(event) => update({ horizonSeconds: Number(event.target.value) })}
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

      <div className="forecast-config-summary">
        <span>{selectedDataset.sampleRateFps} fps</span>
        <span>{selectedDataset.durationSeconds}s 原始序列</span>
        <span>{selectedDataset.sourcePath}</span>
      </div>

      <button className="forecast-run-button" type="button" disabled={isRunning} onClick={() => onRun(value)}>
        {isRunning ? "预测运行中" : "运行预测"}
      </button>
    </section>
  );
}
