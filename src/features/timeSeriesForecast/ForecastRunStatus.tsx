import type { ForecastJob, ForecastJobStatus } from "./forecastContract";

type ForecastRunStatusProps = {
  status: ForecastJobStatus;
  job: ForecastJob | null;
  errorMessage: string | null;
};

const idleMessage = "配置参数后点击运行，前端会模拟创建预测任务。";

export function ForecastRunStatus({ status, job, errorMessage }: ForecastRunStatusProps) {
  const message = errorMessage ?? job?.message ?? idleMessage;
  const progress = job?.progress ?? 0;

  return (
    <section className={`forecast-status forecast-status--${status}`} aria-label="预测任务状态">
      <div>
        <p className="eyebrow">Job Status</p>
        <h2>{status === "idle" ? "尚未运行" : job?.id}</h2>
        <p>{message}</p>
      </div>
      <div className="forecast-progress" aria-label={`任务进度 ${progress}%`}>
        <span style={{ width: `${progress}%` }} />
      </div>
      <div className="forecast-status-meta">
        <span>状态：{status}</span>
        <span>进度：{progress}%</span>
      </div>
    </section>
  );
}
