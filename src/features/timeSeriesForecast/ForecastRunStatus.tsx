import type { ForecastJob, ForecastJobStatus } from "./forecastContract";

type ForecastRunStatusProps = {
  status: ForecastJobStatus;
  job: ForecastJob | null;
  errorMessage: string | null;
};

const idleMessage = "配置参数后点击运行，前端会模拟创建预测任务。";
const pendingMessage = "等待任务状态同步。";
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const sanitizeProgress = (value: number) => (Number.isFinite(value) ? value : 0);

export function ForecastRunStatus({ status, job, errorMessage }: ForecastRunStatusProps) {
  const message = errorMessage ?? job?.message ?? (status === "idle" ? idleMessage : pendingMessage);
  const progress = clamp(sanitizeProgress(job?.progress ?? 0), 0, 100);
  const heading = status === "idle" ? "尚未运行" : (job?.id ?? "任务准备中");

  return (
    <section className={`forecast-status forecast-status--${status}`} aria-label="预测任务状态">
      <div>
        <p className="eyebrow">Job Status</p>
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
      <div className="forecast-status-meta">
        <span>状态：{status}</span>
        <span>进度：{progress}%</span>
      </div>
    </section>
  );
}
