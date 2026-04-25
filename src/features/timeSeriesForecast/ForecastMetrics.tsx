import { MetricCard } from "../../components/MetricCard";
import type { ForecastJobStatus, ForecastMetric } from "./forecastContract";

type ForecastMetricsProps = {
  metrics: ForecastMetric[];
  status: ForecastJobStatus;
};

export function ForecastMetrics({ metrics, status }: ForecastMetricsProps) {
  const statusMetric: ForecastMetric = {
    label: "任务状态",
    value: status,
    note: status === "completed" ? "结果已生成" : "等待预测完成"
  };

  return (
    <section className="metric-grid forecast-metrics" aria-label="预测摘要指标">
      {[...metrics, statusMetric].map((metric) => (
        <MetricCard key={metric.label} {...metric} />
      ))}
    </section>
  );
}
