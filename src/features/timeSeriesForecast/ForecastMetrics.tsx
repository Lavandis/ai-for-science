import type { ForecastJobStatus, ForecastMetric } from "./forecastContract";

type ForecastMetricsProps = {
  metrics: ForecastMetric[];
  status: ForecastJobStatus;
};

export function ForecastMetrics({ metrics, status }: ForecastMetricsProps) {
  const statusMetric: ForecastMetric = {
    label: "结果状态",
    value: status === "completed" ? "预测完成" : "处理中",
    note: status === "completed" ? "结果已生成" : "等待预测完成"
  };

  return (
    <section className="forecast-metrics" role="list" aria-label="预测摘要">
      {[...metrics, statusMetric].map((metric) => (
        <div className="forecast-metric" key={metric.label} role="listitem">
          <span>{metric.label}</span>
          <strong>{metric.value}</strong>
          <small>{metric.note}</small>
        </div>
      ))}
    </section>
  );
}
