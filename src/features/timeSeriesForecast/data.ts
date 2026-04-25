import type {
  ForecastDataset,
  ForecastEvaluationRow,
  ForecastJobRequest,
  ForecastMetric,
  ForecastModel,
  ForecastResult,
  ForecastSeriesPoint
} from "./forecastContract";

export type { ForecastSeriesPoint as PendulumSeriesPoint } from "./forecastContract";

export const forecastDatasets: ForecastDataset[] = [
  {
    id: "pendulum-200fps",
    name: "单摆实验 200fps 样例",
    sourcePath: "data/processed/200_data.csv",
    sampleRateFps: 200,
    durationSeconds: 240,
    variables: ["theta", "omega"],
    description: "由单摆角度序列预处理得到，包含 theta 摆角和 omega 角速度。"
  }
];

export const forecastModels: ForecastModel[] = [
  {
    id: "panorama-v1",
    name: "PANORAMA 混合动力学模型",
    kind: "panorama",
    version: "v1-static",
    description: "物理白盒项 F_p 加神经残差项 F_a，并按原始 fps 数值积分。",
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
    "以单摆角度序列为例，将物理白盒模型、神经残差修正和数值积分组合起来，对测试段进行滚动外推。",
  source: "data/processed/200_data.csv"
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

export function createStaticForecastResult(jobId: string): ForecastResult {
  return {
    jobId,
    targetVariable: "theta",
    series: pendulumSeries,
    metrics: forecastMetrics,
    evaluationRows: forecastRows,
    conclusion:
      "PANORAMA 曲线相较纯物理基线更贴近真实角度序列，尤其在长时预测后段保留了更稳定的相位与幅值。",
    modelSummary: {
      physicsTerm: "F_p：阻尼单摆动力学",
      augmentationTerm: "F_a：神经网络残差修正",
      integrator: "原始 200fps 下滚动积分"
    }
  };
}
