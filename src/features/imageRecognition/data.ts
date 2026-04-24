export const imageRecognitionInputs = [
  {
    label: "样本来源",
    value: "单摆实验帧图像 / 显微图像 / 实验装置照片"
  },
  {
    label: "识别目标",
    value: "摆球中心、支点、参考刻度"
  },
  {
    label: "输出类型",
    value: "关键点坐标 / 边界框摘要 / 目标标签"
  },
  {
    label: "实验备注",
    value: "用于后续轨迹分析与角位移计算"
  }
];

export const recognizedObjects = ["摆球", "支点", "刻度参考线"];

export const keypoints = [
  { name: "支点", x: 152, y: 36, confidence: "98%" },
  { name: "摆球中心", x: 244, y: 198, confidence: "94%" },
  { name: "参考刻度", x: 314, y: 210, confidence: "89%" }
];

export const imageRecognitionSummary = {
  confidence: "94%",
  note: "已提取摆球中心与支点坐标，可进一步推导摆长、偏角与轨迹变化。"
};
