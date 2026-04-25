export const forecastInputs = [
  {
    label: "序列名称",
    value: "实验观测指标序列 S-204"
  },
  {
    label: "时间窗口",
    value: "最近 120 个采样点"
  },
  {
    label: "预测步长",
    value: "向前预测 24 个采样点"
  },
  {
    label: "变量选择",
    value: "主指标、环境变量、控制参数"
  }
];

export const forecastMetrics = [
  {
    label: "趋势方向",
    value: "缓慢上升",
    note: "静态趋势判断"
  },
  {
    label: "置信区间",
    value: "± 6.8%",
    note: "示例预测区间"
  },
  {
    label: "异常风险",
    value: "低",
    note: "无明显突变信号"
  }
];

export const seriesPoints = [28, 34, 31, 39, 42, 48, 45, 52, 58, 61, 64, 69];
