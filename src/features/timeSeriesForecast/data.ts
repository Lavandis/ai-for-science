import type {
  ForecastDataset,
  ForecastEvaluationRow,
  ForecastJobRequest,
  ForecastMetric,
  ForecastModel,
  ForecastResult,
  ForecastSeriesPoint,
  ForecastVariable
} from "./forecastContract";
import panoramaForecastFixture from "./panoramaForecastResult.json";

export type { ForecastSeriesPoint as PendulumSeriesPoint } from "./forecastContract";

export const forecastDatasets: ForecastDataset[] = [
  {
    id: "pendulum-200fps",
    name: "PANORAMA 单摆实验真实数据",
    sourcePath: "assets/PANORAMA_PROJECT-master/data/processed/pendulum_data_updated.csv",
    sampleRateFps: 200,
    durationSeconds: 240,
    variables: ["theta", "omega"],
    description: "来自 PANORAMA_PROJECT 的真实单摆 CSV，包含 theta 摆角和由时间序列导出的 omega 角速度。"
  }
];

export const forecastModels: ForecastModel[] = [
  {
    id: "panorama-v1",
    name: "PANORAMA 混合动力学模型",
    kind: "panorama",
    version: "pth-fixture",
    description: "物理白盒项 F_p 加已加载 panorama_model.pth 的神经残差项 F_a，并按原始 fps 数值积分。",
    supportsBaselineComparison: true
  }
];

export const defaultForecastJobRequest: ForecastJobRequest = {
  datasetId: "pendulum-200fps",
  modelId: "panorama-v1",
  targetVariable: "theta",
  trainRatio: 0.75,
  horizonSeconds: 60,
  sampleRateFps: 200,
  baselineEnabled: true
};

export const experimentProfile = {
  title: "单摆实验长时预测",
  model: "PANORAMA 混合动力学模型",
  description:
    "以 PANORAMA_PROJECT 中的真实单摆角度序列为例，将物理白盒模型、神经残差修正和数值积分组合起来，对测试段进行滚动外推。",
  source: "assets/PANORAMA_PROJECT-master"
};

export const forecastInputs = [
  {
    label: "数据源",
    value: "预处理单摆 CSV"
  },
  {
    label: "状态变量",
    value: "theta 摆角、omega 角速度"
  },
  {
    label: "采样帧率",
    value: "200 fps 全分辨率积分"
  },
  {
    label: "训练 / 测试切分",
    value: "前 75% 训练，后 25% 测试"
  },
  {
    label: "预测步长",
    value: "测试段长时滚动预测"
  },
  {
    label: "对照基线",
    value: "纯物理阻尼单摆模型"
  }
];

export const modelStages = [
  { label: "01 数据预处理", value: "Time / theta / omega", note: "从角度序列构造状态量" },
  { label: "02 物理先验", value: "F_p", note: "重力、摆长、阻尼项" },
  { label: "03 神经残差", value: "F_a", note: "修正未建模实验误差" },
  { label: "04 数值积分", value: "Rollout", note: "按原始 fps 外推测试段" }
];

export const forecastMetrics: ForecastMetric[] = [
  { label: "PANORAMA RMSE", value: "0.0186 rad", note: "静态评估示例" },
  { label: "物理基线 RMSE", value: "0.0418 rad", note: "同一测试窗口" },
  { label: "误差改善", value: "+55.5%", note: "相对纯物理模型" },
  { label: "外推窗口", value: "60 s", note: "测试段滚动预测" }
];

export const seriesPoints = [28, 34, 31, 39, 42, 48, 45, 52, 58, 61, 64, 69];

export const pendulumSeries: ForecastSeriesPoint[] = [
  { second: 0, actual: -0.263, physics: null, panorama: null, phase: "train" },
  { second: 5, actual: -0.188, physics: null, panorama: null, phase: "train" },
  { second: 10, actual: 0.036, physics: null, panorama: null, phase: "train" },
  { second: 15, actual: 0.212, physics: null, panorama: null, phase: "train" },
  { second: 20, actual: 0.238, physics: null, panorama: null, phase: "train" },
  { second: 25, actual: 0.091, physics: null, panorama: null, phase: "train" },
  { second: 30, actual: -0.121, physics: null, panorama: null, phase: "train" },
  { second: 35, actual: -0.218, physics: null, panorama: null, phase: "train" },
  { second: 40, actual: -0.164, physics: -0.155, panorama: -0.161, phase: "test" },
  { second: 45, actual: 0.012, physics: 0.041, panorama: 0.017, phase: "test" },
  { second: 50, actual: 0.171, physics: 0.226, panorama: 0.179, phase: "test" },
  { second: 55, actual: 0.197, physics: 0.275, panorama: 0.207, phase: "test" },
  { second: 60, actual: 0.058, physics: 0.126, panorama: 0.066, phase: "test" },
  { second: 65, actual: -0.134, physics: -0.064, panorama: -0.125, phase: "test" },
  { second: 70, actual: -0.179, physics: -0.104, panorama: -0.171, phase: "test" },
  { second: 75, actual: -0.041, physics: 0.028, panorama: -0.035, phase: "test" },
  { second: 80, actual: 0.123, physics: 0.191, panorama: 0.131, phase: "test" },
  { second: 85, actual: 0.151, physics: 0.239, panorama: 0.159, phase: "test" }
];

export const forecastRows: ForecastEvaluationRow[] = [
  { time: "40 s", actual: "-0.164", physics: "-0.155", panorama: "-0.161", note: "测试段起点" },
  { time: "55 s", actual: "0.197", physics: "0.275", panorama: "0.207", note: "基线开始偏离" },
  { time: "70 s", actual: "-0.179", physics: "-0.104", panorama: "-0.171", note: "残差修正保持相位" },
  { time: "85 s", actual: "0.151", physics: "0.239", panorama: "0.159", note: "长时误差仍可控" }
];

const variableMeta: Record<
  ForecastVariable,
  {
    name: string;
    unit: string;
    panoramaRmse: string;
    physicsRmse: string;
    improvement: string;
    conclusion: string;
  }
> = {
  theta: {
    name: "摆角 theta",
    unit: "rad",
    panoramaRmse: "0.0186 rad",
    physicsRmse: "0.0418 rad",
    improvement: "+55.5%",
    conclusion: "PANORAMA 曲线相较纯物理基线更贴近真实角度序列，尤其在长时预测后段保留了更稳定的相位与幅值。"
  },
  omega: {
    name: "角速度 omega",
    unit: "rad/s",
    panoramaRmse: "0.052 rad/s",
    physicsRmse: "0.119 rad/s",
    improvement: "+56.3%",
    conclusion: "PANORAMA 曲线相较纯物理基线更贴近真实角速度序列，测试段后半段的相位漂移更小。"
  }
};

const evaluationSeconds = new Set([40, 55, 70, 85]);

function toOmegaSeries(point: ForecastSeriesPoint): ForecastSeriesPoint {
  return {
    ...point,
    actual: Number((point.actual * 0.42).toFixed(3)),
    physics: point.physics === null ? null : Number((point.physics * 0.46).toFixed(3)),
    panorama: point.panorama === null ? null : Number((point.panorama * 0.43).toFixed(3))
  };
}

function formatValue(value: number | null, unit: string) {
  return value === null ? "未启用" : `${value.toFixed(3)} ${unit}`;
}

function createResultSeries(targetVariable: ForecastVariable, baselineEnabled: boolean) {
  const series = targetVariable === "omega" ? pendulumSeries.map(toOmegaSeries) : pendulumSeries.map((point) => ({ ...point }));

  if (baselineEnabled) return series;

  return series.map((point) => ({
    ...point,
    physics: null
  }));
}

function createResultRows(series: ForecastSeriesPoint[], targetVariable: ForecastVariable, baselineEnabled: boolean) {
  const meta = variableMeta[targetVariable];

  return series
    .filter((point) => evaluationSeconds.has(point.second))
    .map((point) => ({
      time: `${point.second} s`,
      actual: formatValue(point.actual, meta.unit),
      physics: baselineEnabled ? formatValue(point.physics, meta.unit) : "未启用",
      panorama: formatValue(point.panorama, meta.unit),
      note: baselineEnabled ? "测试段预测对比" : "未启用物理基线对照"
    }));
}

function createResultMetrics(targetVariable: ForecastVariable, horizonSeconds: number, baselineEnabled: boolean): ForecastMetric[] {
  const meta = variableMeta[targetVariable];
  const metrics: ForecastMetric[] = [
    { label: "PANORAMA RMSE", value: meta.panoramaRmse, note: `${meta.name} 静态评估示例` }
  ];

  if (baselineEnabled) {
    metrics.push(
      { label: "物理基线 RMSE", value: meta.physicsRmse, note: "同一测试窗口" },
      { label: "误差改善", value: meta.improvement, note: "相对纯物理模型" }
    );
  } else {
    metrics.push({ label: "基线对照", value: "已关闭", note: "本次运行仅显示 PANORAMA 预测" });
  }

  metrics.push({ label: "外推窗口", value: `${horizonSeconds} s`, note: "测试段滚动预测" });

  return metrics;
}

function selectRealSeries(targetVariable: ForecastVariable, baselineEnabled: boolean): ForecastSeriesPoint[] {
  return panoramaForecastFixture.series.map((point) => {
    const phase = point.phase as "train" | "test";

    if (targetVariable === "omega") {
      return {
        second: point.second,
        actual: point.actualOmega,
        actualOmega: point.actualOmega,
        physics: baselineEnabled ? point.physicsOmega : null,
        physicsOmega: baselineEnabled ? point.physicsOmega : null,
        panorama: point.panoramaOmega,
        panoramaOmega: point.panoramaOmega,
        phase
      };
    }

    return {
      ...point,
      physics: baselineEnabled ? point.physics : null,
      physicsOmega: baselineEnabled ? point.physicsOmega : null,
      phase
    };
  });
}

function selectRealMetrics(targetVariable: ForecastVariable, baselineEnabled: boolean): ForecastMetric[] {
  const summary = panoramaForecastFixture.variableSummaries[targetVariable];
  const metrics = summary.metrics.filter(
    (metric) => baselineEnabled || (metric.label !== "物理基线 RMSE" && metric.label !== "误差改善")
  );

  if (baselineEnabled) return metrics;

  const horizonMetric = metrics.find((metric) => metric.label === "外推窗口");
  const panoramaMetric = metrics.filter((metric) => metric.label !== "外推窗口");

  return [
    ...panoramaMetric,
    { label: "基线对照", value: "已关闭", note: "本次运行仅显示 PANORAMA 预测" },
    ...(horizonMetric ? [horizonMetric] : [])
  ];
}

function selectRealRows(targetVariable: ForecastVariable, baselineEnabled: boolean): ForecastEvaluationRow[] {
  return panoramaForecastFixture.variableSummaries[targetVariable].evaluationRows.map((row) => ({
    ...row,
    physics: baselineEnabled ? row.physics : "未启用",
    note: baselineEnabled ? row.note : "未启用物理基线对照"
  }));
}

export function createStaticForecastResult(jobId: string, request = defaultForecastJobRequest): ForecastResult {
  return createRealPanoramaForecastResult(jobId, request.targetVariable, request.baselineEnabled);
}

export function createRealPanoramaForecastResult(
  jobId: string,
  targetVariable: ForecastVariable = "theta",
  baselineEnabled = true
): ForecastResult {
  const summary = panoramaForecastFixture.variableSummaries[targetVariable];

  return {
    ...panoramaForecastFixture,
    jobId,
    targetVariable,
    baselineEnabled,
    source: "panorama_project_assets",
    series: selectRealSeries(targetVariable, baselineEnabled),
    metrics: selectRealMetrics(targetVariable, baselineEnabled),
    evaluationRows: selectRealRows(targetVariable, baselineEnabled),
    conclusion: baselineEnabled
      ? `该结果由 assets/PANORAMA_PROJECT-master 中的真实模型权重和单摆数据生成。${summary.conclusion}`
      : `${variableMeta[targetVariable].name} 结果由真实 PANORAMA 模型和单摆数据生成；本次运行关闭物理基线，仅展示 PANORAMA 预测与真实序列对照。`
  };
}
