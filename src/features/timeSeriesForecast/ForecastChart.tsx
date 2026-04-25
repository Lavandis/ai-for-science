import { useId } from "react";
import type { ForecastSeriesPoint, ForecastVariable } from "./forecastContract";

type ForecastChartProps = {
  baselineEnabled: boolean;
  series: ForecastSeriesPoint[];
  targetVariable: ForecastVariable;
};

const variableLabel: Record<ForecastVariable, string> = {
  theta: "单摆角度",
  omega: "角速度 omega"
};

const chartWidth = 920;
const chartHeight = 320;
const chartPadding = 42;

function getY(value: number, minValue: number, maxValue: number) {
  const plotHeight = chartHeight - chartPadding * 2;
  const ratio = (value - minValue) / (maxValue - minValue);
  return chartHeight - chartPadding - ratio * plotHeight;
}

function getX(pointSecond: number, firstSecond: number, lastSecond: number) {
  const plotWidth = chartWidth - chartPadding * 2;
  const secondRange = lastSecond - firstSecond;

  if (secondRange <= 0) {
    return chartPadding + plotWidth / 2;
  }

  return chartPadding + ((pointSecond - firstSecond) / secondRange) * plotWidth;
}

function toPolyline(
  series: ForecastSeriesPoint[],
  key: "actual" | "physics" | "panorama",
  minValue: number,
  maxValue: number
) {
  const first = series[0];
  const last = series[series.length - 1];

  return series
    .filter((point) => point[key] !== null)
    .map((point) => {
      const x = getX(point.second, first.second, last.second);
      const y = getY(point[key] ?? 0, minValue, maxValue);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

export function ForecastChart({ baselineEnabled, series, targetVariable }: ForecastChartProps) {
  const gradientId = useId();
  const label = variableLabel[targetVariable];

  if (series.length === 0) {
    return (
      <div className="forecast-chart-card forecast-chart-card--empty" role="status">
        <p>暂无预测序列数据</p>
        <span>运行预测任务后将在此显示真实值{baselineEnabled ? "、物理基线" : ""}与 PANORAMA 预测曲线。</span>
      </div>
    );
  }

  const values = series.flatMap((point) => {
    const pointValues = [point.actual, point.panorama ?? point.actual];
    return baselineEnabled ? [...pointValues, point.physics ?? point.actual] : pointValues;
  });
  const minValue = Math.min(...values) - 0.04;
  const maxValue = Math.max(...values) + 0.04;
  const firstPoint = series[0];
  const lastPoint = series[series.length - 1];
  const splitPoint = series.find((point) => point.phase === "test") ?? firstPoint;
  const splitX = getX(splitPoint.second, firstPoint.second, lastPoint.second);
  const summary =
    splitPoint.phase === "test"
      ? `共 ${series.length} 个采样点，测试段从 ${splitPoint.second} s 开始。`
      : `共 ${series.length} 个采样点，当前序列未包含测试段。`;

  return (
    <div
      className="forecast-chart-card"
      role="img"
      aria-label={`${label}真实值${baselineEnabled ? "、物理基线" : ""}与 PANORAMA 预测对比图`}
    >
      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id={gradientId} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="rgba(47, 111, 159, 0.04)" />
            <stop offset="100%" stopColor="rgba(47, 111, 159, 0.14)" />
          </linearGradient>
        </defs>
        <rect
          className="forecast-test-band"
          x={splitX}
          y={chartPadding}
          width={chartWidth - chartPadding - splitX}
          height={chartHeight - chartPadding * 2}
          fill={`url(#${gradientId})`}
        />
        {[0, 1, 2, 3].map((index) => {
          const y = chartPadding + index * ((chartHeight - chartPadding * 2) / 3);
          return <line className="forecast-grid-line" key={index} x1={chartPadding} x2={chartWidth - chartPadding} y1={y} y2={y} />;
        })}
        <line className="forecast-axis" x1={chartPadding} x2={chartWidth - chartPadding} y1={chartHeight - chartPadding} y2={chartHeight - chartPadding} />
        <line className="forecast-axis" x1={chartPadding} x2={chartPadding} y1={chartPadding} y2={chartHeight - chartPadding} />
        <line className="forecast-split" x1={splitX} x2={splitX} y1={chartPadding} y2={chartHeight - chartPadding} />
        <polyline className="series-line series-line--actual" points={toPolyline(series, "actual", minValue, maxValue)} />
        {baselineEnabled ? (
          <polyline className="series-line series-line--physics" points={toPolyline(series, "physics", minValue, maxValue)} />
        ) : null}
        <polyline className="series-line series-line--panorama" points={toPolyline(series, "panorama", minValue, maxValue)} />
      </svg>
      <div className="chart-legend">
        <span className="legend-actual">真实{label}</span>
        {baselineEnabled ? <span className="legend-physics">纯物理基线</span> : null}
        <span className="legend-panorama">PANORAMA 预测</span>
        <span className="legend-band">测试段</span>
      </div>
      <p className="forecast-chart-summary">{summary}</p>
    </div>
  );
}
