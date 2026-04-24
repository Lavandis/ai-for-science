import { FeatureCard } from "../components/FeatureCard";

const features = [
  {
    eyebrow: "Module 01",
    title: "图像识别",
    description: "用于展示样本图像、关键区域与识别结果摘要，作为图像识别模块的独立入口。",
    details: ["独立页面", "图像样本预览", "识别结果摘要"],
    href: "/image-recognition",
    actionLabel: "进入图像识别"
  },
  {
    eyebrow: "Module 02",
    title: "模板匹配",
    description: "用于承接目标模板、候选模板与匹配结论，保持模板匹配流程在独立页面中展开。",
    details: ["独立页面", "模板输入占位", "匹配结果概览"],
    href: "/template-matching",
    actionLabel: "进入模板匹配"
  },
  {
    eyebrow: "Module 03",
    title: "时序预测",
    description: "面向科研序列数据，展示预测窗口、趋势图占位、预测区间与摘要指标。",
    details: ["独立页面", "趋势图占位", "预测摘要指标"],
    href: "/time-series-forecast",
    actionLabel: "进入时序预测"
  }
];

export function HomePage() {
  return (
    <div className="page-stack">
      <section className="hero-section">
        <div>
          <p className="eyebrow">Frontend Prototype</p>
          <h1>AI for Science</h1>
          <p className="hero-copy">
            一个面向科研工作流的前端原型首页，聚合图像识别、模板匹配与时序预测
            三个独立模块的入口，便于后续分别接入真实模型服务。
          </p>
        </div>
        <aside className="hero-note" aria-label="模型接入提示">
          <span>当前阶段</span>
          <strong>静态展示</strong>
          <p>不接后端、不做真实计算。数据集中在 feature 内，便于后续切换 API。</p>
        </aside>
      </section>

      <section className="feature-grid" aria-label="功能入口">
        {features.map((feature) => (
          <FeatureCard key={feature.href} {...feature} />
        ))}
      </section>
    </div>
  );
}
