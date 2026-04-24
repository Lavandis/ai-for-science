import { FeatureCard } from "../components/FeatureCard";

const features = [
  {
    eyebrow: "Module 01",
    title: "参数匹配",
    description: "围绕研究目标、输入参数和约束条件，展示推荐参数组合与候选方案。",
    details: ["独立页面", "静态输入占位", "推荐结果表格"],
    href: "/parameter-matching",
    actionLabel: "进入参数匹配"
  },
  {
    eyebrow: "Module 02",
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
            一个面向科研工作流的前端原型。首版只保留两个清晰模块：
            参数匹配与时序预测，后续可以在各自模块内替换为真实模型服务。
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
