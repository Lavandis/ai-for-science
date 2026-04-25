import type { ForecastSeriesPoint } from "./forecastContract";

type ForecastChartProps = {
  series: ForecastSeriesPoint[];
};

const chartWidth = 920;
const chartHeight = 320;
const chartPadding = 42;

function getY(value: number, minValue: number, maxValue: number) {
  const plotHeight = chartHeight - chartPadding * 2;
  const ratio = (value - minValue) / (maxValue - minValue);
  return chartHeight - chartPadding - ratio * plotHeight;
}

function toPolyline(
  series: ForecastSeriesPoint[],
  key: "actual" | "physics" | "panorama",
  minValue: number,
  maxValue: number
) {
  const first = series[0];
  const last = series[series.length - 1];
  const plotWidth = chartWidth - chartPadding * 2;

  return series
    .filter((point) => point[key] !== null)
    .map((point) => {
      const x = chartPadding + ((point.second - first.second) / (last.second - first.second)) * plotWidth;
      const y = getY(point[key] ?? 0, minValue, maxValue);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

export function ForecastChart({ series }: ForecastChartProps) {
  const values = series.flatMap((point) => [
    point.actual,
    point.physics ?? point.actual,
    point.panorama ?? point.actual
  ]);
  const minValue = Math.min(...values) - 0.04;
  const maxValue = Math.max(...values) + 0.04;
  const splitPoint = series.find((point) => point.phase === "test") ?? series[0];
  const splitX =
    chartPadding +
    ((splitPoint.second - series[0].second) / (series[series.length - 1].second - series[0].second)) *
      (chartWidth - chartPadding * 2);

  return (
    <div className="forecast-chart-card" role="img" aria-label="单摆角度真实值、物理基线与 PANORAMA 预测对比图">
      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="forecast-test-band" x1="0" x2="1" y1="0" y2="0">
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
        />
        {[0, 1, 2, 3].map((index) => {
          const y = chartPadding + index * ((chartHeight - chartPadding * 2) / 3);
          return <line className="forecast-grid-line" key={index} x1={chartPadding} x2={chartWidth - chartPadding} y1={y} y2={y} />;
        })}
        <line className="forecast-axis" x1={chartPadding} x2={chartWidth - chartPadding} y1={chartHeight - chartPadding} y2={chartHeight - chartPadding} />
        <line className="forecast-axis" x1={chartPadding} x2={chartPadding} y1={chartPadding} y2={chartHeight - chartPadding} />
        <line className="forecast-split" x1={splitX} x2={splitX} y1={chartPadding} y2={chartHeight - chartPadding} />
        <polyline className="series-line series-line--actual" points={toPolyline(series, "actual", minValue, maxValue)} />
        <polyline className="series-line series-line--physics" points={toPolyline(series, "physics", minValue, maxValue)} />
        <polyline className="series-line series-line--panorama" points={toPolyline(series, "panorama", minValue, maxValue)} />
      </svg>
      <div className="chart-legend">
        <span className="legend-actual">真实角度 theta</span>
        <span className="legend-physics">纯物理基线</span>
        <span className="legend-panorama">PANORAMA 预测</span>
        <span className="legend-band">测试段</span>
      </div>
    </div>
  );
}
