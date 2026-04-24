import { InfoPanel } from "../../components/InfoPanel";
import { MetricCard } from "../../components/MetricCard";
import { PageHeader } from "../../components/PageHeader";
import { forecastInputs, forecastMetrics, seriesPoints } from "./data";
import "./timeSeriesForecast.css";

export function TimeSeriesForecastPage() {
  const polylinePoints = seriesPoints
    .map((value, index) => `${index * 42 + 18},${110 - value}`)
    .join(" ");

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="独立模块"
        title="时序预测"
        description="展示科研序列预测的配置、趋势图占位、预测区间和摘要指标。当前为静态数据，后续可替换为模型 API 返回。"
      />

      <div className="module-layout">
        <InfoPanel title="预测配置">
          <div className="field-list">
            {forecastInputs.map((item) => (
              <div className="field-row" key={item.label}>
                <span>{item.label}</span>
                <p>{item.value}</p>
              </div>
            ))}
          </div>
        </InfoPanel>

        <InfoPanel title="趋势图占位" tone="soft">
          <div className="chart-card" role="img" aria-label="时序预测趋势图占位">
            <svg viewBox="0 0 500 140" preserveAspectRatio="none">
              <line x1="18" y1="118" x2="482" y2="118" />
              <line x1="18" y1="18" x2="18" y2="118" />
              <polyline points={polylinePoints} />
              <path d="M354 47 C394 44 426 35 482 28" />
            </svg>
            <div className="chart-legend">
              <span>历史观测</span>
              <span>预测区间</span>
            </div>
          </div>
        </InfoPanel>
      </div>

      <section className="metric-grid" aria-label="预测摘要指标">
        {forecastMetrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </section>

      <InfoPanel title="简短结论">
        <p className="summary-copy">
          该序列在预测窗口内保持温和上行，短期异常风险较低。建议在真实模型接入后补充误差分解、
          数据质量提示和模型版本信息。
        </p>
      </InfoPanel>

      <p className="api-note">API seam：将 `data.ts` 中的静态集合替换为 service/API 调用即可接入真实模型。</p>
    </div>
  );
}
