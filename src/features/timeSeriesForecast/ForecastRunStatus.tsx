import type { ForecastJob, ForecastJobStatus } from "./forecastContract";

type ForecastRunStatusProps = {
  status: ForecastJobStatus;
  job: ForecastJob | null;
  errorMessage: string | null;
};

const idleMessage = "设置完成后运行预测。";
const pendingMessage = "等待任务状态同步。";
const statusHeading: Record<ForecastJobStatus, string> = {
  idle: "准备就绪",
  queued: "等待计算",
  running: "正在计算",
  completed: "预测完成",
  failed: "运行失败"
};
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const sanitizeProgress = (value: number) => (Number.isFinite(value) ? value : 0);
const visuallyHiddenStyle = {
  position: "absolute",
  width: "1px",
  height: "1px",
  padding: 0,
  margin: "-1px",
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: 0
} as const;

export function ForecastRunStatus({ status, job, errorMessage }: ForecastRunStatusProps) {
  const message = errorMessage ?? job?.message ?? (status === "idle" ? idleMessage : pendingMessage);
  const progress = clamp(sanitizeProgress(job?.progress ?? 0), 0, 100);
  const heading = statusHeading[status];
  const liveStatusText = `${heading}，${message}`;

  return (
    <section className={`forecast-status forecast-status--${status}`} aria-label="预测任务状态">
      <div role="status" aria-label="预测任务状态更新" aria-atomic="true" style={visuallyHiddenStyle}>
        {liveStatusText}
      </div>
      <div className="forecast-status-copy">
        <h2>{heading}</h2>
        <p>{message}</p>
      </div>
      <div
        className="forecast-progress"
        role="progressbar"
        aria-label={`任务进度 ${progress}%`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress}
      >
        <span style={{ width: `${progress}%` }} />
      </div>
      <span className="forecast-status-meta">{progress}%</span>
    </section>
  );
}
