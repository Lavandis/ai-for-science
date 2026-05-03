import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import type { ForecastSeriesPoint, ForecastVariable } from "./forecastContract";

type ForecastChartProps = {
  baselineEnabled: boolean;
  series: ForecastSeriesPoint[];
  targetVariable: ForecastVariable;
};

type SeriesKey = "actual" | "physics" | "panorama";

type ChartPoint = {
  second: number;
  actual: number | null;
  physics: number | null;
  panorama: number | null;
  phase: "train" | "test";
};

const variableLabel: Record<ForecastVariable, string> = {
  theta: "单摆角度",
  omega: "角速度 omega"
};

const variableUnit: Record<ForecastVariable, string> = {
  theta: "rad",
  omega: "rad/s"
};

const seriesNames: Record<SeriesKey, string> = {
  actual: "真实值",
  physics: "纯物理基线",
  panorama: "PANORAMA 预测"
};

const seriesColors: Record<SeriesKey, string> = {
  actual: "#16a34a",
  physics: "#2563eb",
  panorama: "#dc2626"
};

function getSeriesValue(point: ForecastSeriesPoint, key: SeriesKey, targetVariable: ForecastVariable) {
  if (targetVariable === "omega") {
    if (key === "actual") return point.actualOmega ?? point.actual;
    if (key === "physics") return point.physicsOmega ?? point.physics;
    return point.panoramaOmega ?? point.panorama;
  }

  return point[key];
}

function toChartPoint(point: ForecastSeriesPoint, targetVariable: ForecastVariable): ChartPoint {
  return {
    second: point.second,
    actual: getSeriesValue(point, "actual", targetVariable),
    physics: getSeriesValue(point, "physics", targetVariable),
    panorama: getSeriesValue(point, "panorama", targetVariable),
    phase: point.phase
  };
}

function formatTick(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function ForecastLineChart({
  baselineEnabled,
  chartData,
  height,
  targetVariable
}: {
  baselineEnabled: boolean;
  chartData: ChartPoint[];
  height: number;
  targetVariable: ForecastVariable;
}) {
  const unit = variableUnit[targetVariable];
  const firstPoint = chartData[0];
  const lastPoint = chartData[chartData.length - 1];
  const splitPoint = chartData.find((point) => point.phase === "test") ?? firstPoint;

  return (
    <div className="forecast-recharts-frame" role="img" aria-label={`${variableLabel[targetVariable]}真实值${baselineEnabled ? "、物理基线" : ""}与 PANORAMA 预测对比图`}>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={chartData} margin={{ top: 18, right: 28, bottom: 30, left: 16 }}>
          <CartesianGrid stroke="rgba(52, 74, 98, 0.16)" strokeDasharray="4 6" />
          <XAxis
            dataKey="second"
            domain={[firstPoint.second, lastPoint.second]}
            label={{ value: "时间 (s)", position: "insideBottom", offset: -18, fill: "#64748b", fontSize: 13 }}
            tick={{ fill: "#64748b", fontSize: 12 }}
            tickFormatter={formatTick}
            type="number"
          />
          <YAxis
            label={{
              value: `${variableLabel[targetVariable]} (${unit})`,
              angle: -90,
              position: "insideLeft",
              fill: "#64748b",
              fontSize: 13
            }}
            tick={{ fill: "#64748b", fontSize: 12 }}
            tickFormatter={(value) => Number(value).toFixed(2)}
            width={72}
          />
          <Tooltip
            formatter={(value, name) => {
              const numericValue = typeof value === "number" ? value : Number(value ?? 0);
              return [`${numericValue.toFixed(5)} ${unit}`, seriesNames[name as SeriesKey] ?? name];
            }}
            labelFormatter={(value) => `t = ${Number(value).toFixed(2)} s`}
          />
          <Legend verticalAlign="top" height={36} />
          <ReferenceArea
            x1={splitPoint.second}
            x2={lastPoint.second}
            fill="rgba(47, 111, 159, 0.12)"
            stroke="rgba(47, 111, 159, 0.22)"
            label={{ value: "测试段", fill: "#64748b", fontSize: 12, position: "insideTopRight" }}
          />
          <Line
            connectNulls
            dataKey="actual"
            dot={false}
            isAnimationActive={false}
            name={seriesNames.actual}
            stroke={seriesColors.actual}
            strokeWidth={2.2}
            type="monotone"
          />
          {baselineEnabled ? (
            <Line
              connectNulls
              dataKey="physics"
              dot={false}
              isAnimationActive={false}
              name={seriesNames.physics}
              stroke={seriesColors.physics}
              strokeDasharray="8 8"
              strokeWidth={2.2}
              type="monotone"
            />
          ) : null}
          <Line
            connectNulls
            dataKey="panorama"
            dot={false}
            isAnimationActive={false}
            name={seriesNames.panorama}
            stroke={seriesColors.panorama}
            strokeWidth={2.4}
            type="monotone"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ForecastChart({ baselineEnabled, series, targetVariable }: ForecastChartProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const label = variableLabel[targetVariable];
  const chartData = useMemo(() => series.map((point) => toChartPoint(point, targetVariable)), [series, targetVariable]);

  if (series.length === 0) {
    return (
      <div className="forecast-chart-card forecast-chart-card--empty" role="status">
        <p>暂无预测序列数据</p>
        <span>运行预测任务后将在此显示真实值{baselineEnabled ? "、物理基线" : ""}与 PANORAMA 预测曲线。</span>
      </div>
    );
  }

  const firstPoint = series[0];
  const splitPoint = series.find((point) => point.phase === "test") ?? firstPoint;
  const summary =
    splitPoint.phase === "test"
      ? `共 ${series.length} 个采样点，测试段从 ${splitPoint.second} s 开始。`
      : `共 ${series.length} 个采样点，当前序列未包含测试段。`;

  return (
    <div className="forecast-chart-card">
      <div className="forecast-chart-toolbar">
        <div>
          <p className="eyebrow">Standard Plot</p>
          <h3>{label}预测对比</h3>
        </div>
        <button className="forecast-expand-button" type="button" onClick={() => setIsExpanded(true)}>
          放大查看预测图
        </button>
      </div>

      <ForecastLineChart baselineEnabled={baselineEnabled} chartData={chartData} height={360} targetVariable={targetVariable} />

      <div className="forecast-chart-readable-legend" aria-label="预测图坐标与图例">
        <span>横轴：时间 (s)</span>
        <span>纵轴：{label} ({variableUnit[targetVariable]})</span>
        <span className="legend-actual">真实{label}</span>
        {baselineEnabled ? <span className="legend-physics">纯物理基线</span> : null}
        <span className="legend-panorama">PANORAMA 预测</span>
      </div>

      <p className="forecast-chart-summary">{summary}</p>

      {isExpanded ? (
        <div className="forecast-chart-dialog-backdrop">
          <section className="forecast-chart-dialog" role="dialog" aria-label="放大预测图" aria-modal="true">
            <div className="forecast-chart-dialog-header">
              <div>
                <p className="eyebrow">标准坐标视图</p>
                <h2>{label}真实值{baselineEnabled ? "、物理基线" : ""}与 PANORAMA 预测</h2>
              </div>
              <button className="forecast-expand-button" type="button" onClick={() => setIsExpanded(false)}>
                关闭放大图
              </button>
            </div>
            <ForecastLineChart baselineEnabled={baselineEnabled} chartData={chartData} height={620} targetVariable={targetVariable} />
          </section>
        </div>
      ) : null}
    </div>
  );
}
