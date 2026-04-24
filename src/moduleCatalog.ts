export type ModuleCatalogEntry = {
  navLabel: string;
  href: string;
  eyebrow: string;
  title: string;
  description: string;
  details: string[];
  actionLabel: string;
};

export const moduleCatalog: ModuleCatalogEntry[] = [
  {
    navLabel: "图像识别",
    href: "/image-recognition",
    eyebrow: "Module 01",
    title: "图像识别入口",
    description: "用于展示样本图像、关键区域与识别结果摘要，作为图像识别模块的独立入口。",
    details: ["独立页面", "图像样本预览", "识别结果摘要"],
    actionLabel: "进入图像识别"
  },
  {
    navLabel: "模板匹配",
    href: "/template-matching",
    eyebrow: "Module 02",
    title: "模板匹配入口",
    description: "用于承接目标模板、候选模板与匹配结论，保持模板匹配流程在独立页面中展开。",
    details: ["独立页面", "模板输入占位", "匹配结果概览"],
    actionLabel: "进入模板匹配"
  },
  {
    navLabel: "时序预测",
    href: "/time-series-forecast",
    eyebrow: "Module 03",
    title: "时序预测入口",
    description: "面向科研序列数据，展示预测窗口、趋势图占位、预测区间与摘要指标。",
    details: ["独立页面", "趋势图占位", "预测摘要指标"],
    actionLabel: "进入时序预测"
  }
];
