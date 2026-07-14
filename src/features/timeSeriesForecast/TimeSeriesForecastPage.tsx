import { useEffect, useMemo, useRef, useState } from "react";
import {
  defaultForecastJobRequest,
  forecastDatasets,
  forecastModels
} from "./data";
import { ForecastChart } from "./ForecastChart";
import { ForecastConfigPanel } from "./ForecastConfigPanel";
import { ForecastEvaluationTable } from "./ForecastEvaluationTable";
import { ForecastMetrics } from "./ForecastMetrics";
import { ForecastRunStatus } from "./ForecastRunStatus";
import type { ForecastJob, ForecastJobRequest, ForecastJobStatus, ForecastResult } from "./forecastContract";
import { createForecastService } from "./forecastService";
import "./timeSeriesForecast.css";

export function TimeSeriesForecastPage() {
  const [config, setConfig] = useState<ForecastJobRequest>(defaultForecastJobRequest);
  const [job, setJob] = useState<ForecastJob | null>(null);
  const [result, setResult] = useState<ForecastResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const activeRunId = useRef(0);
  const activeJobId = useRef<string | null>(null);
  const pollRequestId = useRef(0);
  const isPolling = useRef(false);
  const resultJobId = useRef<string | null>(null);

  const status: ForecastJobStatus = job?.status ?? "idle";
  const isRunning = status === "queued" || status === "running";

  const service = useMemo(() => createForecastService(), []);

  useEffect(() => {
    if (!job || job.status === "completed" || job.status === "failed") return;

    let isCancelled = false;
    const pollingJobId = job.id;

    const interval = window.setInterval(async () => {
      if (isPolling.current) return;

      isPolling.current = true;
      pollRequestId.current += 1;
      const requestId = pollRequestId.current;

      try {
        const nextJob = await service.getForecastJob(pollingJobId);

        if (isCancelled || activeJobId.current !== pollingJobId || requestId !== pollRequestId.current) return;

        if (nextJob.status === "completed" && resultJobId.current !== nextJob.id) {
          const nextResult = await service.getForecastResult(nextJob.id);
          if (isCancelled || activeJobId.current !== pollingJobId || requestId !== pollRequestId.current) return;
          resultJobId.current = nextJob.id;
          setJob(nextJob);
          setResult(nextResult);
          return;
        }

        setJob(nextJob);
      } catch (error) {
        if (isCancelled || activeJobId.current !== pollingJobId || requestId !== pollRequestId.current) return;

        const message = error instanceof Error ? error.message : "状态同步失败";
        setErrorMessage(message);
        setJob((currentJob) => {
          if (!currentJob || currentJob.id !== pollingJobId) return currentJob;

          return {
            ...currentJob,
            status: "failed",
            updatedAt: new Date().toISOString(),
            progress: 100,
            message
          };
        });
      } finally {
        if (requestId === pollRequestId.current) {
          isPolling.current = false;
        }
      }
    }, 350);

    return () => {
      isCancelled = true;
      window.clearInterval(interval);
    };
  }, [job, service]);

  const runForecast = async (request: ForecastJobRequest) => {
    activeRunId.current += 1;
    const runId = activeRunId.current;

    pollRequestId.current += 1;
    isPolling.current = false;
    resultJobId.current = null;
    setErrorMessage(null);
    setResult(null);

    try {
      const nextJob = await service.createForecastJob(request);
      if (runId !== activeRunId.current) return;

      activeJobId.current = nextJob.id;
      setJob(nextJob);
    } catch (error) {
      if (runId === activeRunId.current) {
        setErrorMessage(error instanceof Error ? error.message : "创建预测任务失败");
      }
    }
  };

  return (
    <div className="page-stack forecast-page">
      <header className="forecast-page-header">
        <h1>时序预测</h1>
        <p>基于单摆观测序列，比较 ORION 预测与物理基线。</p>
      </header>

      <div className="forecast-workbench">
        <aside className="forecast-left-column">
          <ForecastConfigPanel
            datasets={forecastDatasets}
            models={forecastModels}
            value={config}
            isRunning={isRunning}
            onChange={setConfig}
            onRun={runForecast}
          />
          <ForecastRunStatus status={status} job={job} errorMessage={errorMessage} />
        </aside>

        <section className="forecast-result-panel" aria-label="预测结果">
          {result ? (
            <ForecastChart
              baselineEnabled={result.baselineEnabled}
              series={result.series}
              targetVariable={result.targetVariable}
            />
          ) : isRunning ? (
            <div className="forecast-empty-state forecast-empty-state--running" role="status">
              <h2>正在计算 ORION 预测</h2>
              <p>正在读取观测窗口并执行滚动积分。</p>
            </div>
          ) : (
            <div className="forecast-empty-state">
              <h2>尚无预测结果</h2>
              <p>设置左侧参数后运行预测。</p>
            </div>
          )}
        </section>
      </div>

      {result ? (
        <>
          <ForecastMetrics metrics={result.metrics} status={status} />
          <p className="forecast-conclusion">{result.conclusion}</p>
          <details className="forecast-diagnostics">
            <summary>查看评估数据</summary>
            <ForecastEvaluationTable rows={result.evaluationRows} targetVariable={result.targetVariable} />
          </details>
        </>
      ) : null}
    </div>
  );
}
