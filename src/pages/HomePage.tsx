import { FeatureCard } from "../components/FeatureCard";
import { moduleCatalog } from "../moduleCatalog";

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
        {moduleCatalog.map((feature) => (
          <FeatureCard key={feature.href} {...feature} />
        ))}
      </section>
    </div>
  );
}
