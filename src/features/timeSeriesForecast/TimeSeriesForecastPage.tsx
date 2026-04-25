import { useEffect, useMemo, useState } from "react";
import { InfoPanel } from "../../components/InfoPanel";
import { PageHeader } from "../../components/PageHeader";
import {
  defaultForecastJobRequest,
  experimentProfile,
  forecastDatasets,
  forecastModels,
  modelStages
} from "./data";
import { ForecastChart } from "./ForecastChart";
import { ForecastConfigPanel } from "./ForecastConfigPanel";
import { ForecastEvaluationTable } from "./ForecastEvaluationTable";
import { ForecastMetrics } from "./ForecastMetrics";
import { ForecastPipeline } from "./ForecastPipeline";
import { ForecastRunStatus } from "./ForecastRunStatus";
import type { ForecastJob, ForecastJobRequest, ForecastJobStatus, ForecastResult } from "./forecastContract";
import { mockForecastService } from "./mockForecastService";
import "./timeSeriesForecast.css";

export function TimeSeriesForecastPage() {
  const [config, setConfig] = useState<ForecastJobRequest>(defaultForecastJobRequest);
  const [job, setJob] = useState<ForecastJob | null>(null);
  const [result, setResult] = useState<ForecastResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const status: ForecastJobStatus = job?.status ?? "idle";
  const isRunning = status === "queued" || status === "running";

  const service = useMemo(() => mockForecastService, []);

  useEffect(() => {
    if (!job || job.status === "completed" || job.status === "failed") return;

    const interval = window.setInterval(async () => {
      try {
        const nextJob = await service.getForecastJob(job.id);
        setJob(nextJob);

        if (nextJob.status === "completed") {
          const nextResult = await service.getForecastResult(nextJob.id);
          setResult(nextResult);
        }
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "状态同步失败");
      }
    }, 350);

    return () => window.clearInterval(interval);
  }, [job, service]);

  const runForecast = async (request: ForecastJobRequest) => {
    setErrorMessage(null);
    setResult(null);

    try {
      const nextJob = await service.createForecastJob(request);
      setJob(nextJob);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "创建预测任务失败");
    }
  };

  return (
    <div className="page-stack forecast-page">
      <PageHeader
        eyebrow="PANORAMA 静态前端样例"
        title="时序预测"
        description="面向单摆实验的长时预测工作台：展示实验配置、物理基线、PANORAMA 预测曲线和误差摘要。当前使用前端 mock service 模拟任务式接口。"
      />

      <section className="forecast-hero" aria-label="PANORAMA 模型概览">
        <div>
          <p className="eyebrow">Hybrid Dynamics</p>
          <h2>{experimentProfile.title}</h2>
          <p>{experimentProfile.description}</p>
        </div>
        <div className="forecast-model-card">
          <span>当前模型</span>
          <strong>{experimentProfile.model}</strong>
          <small>{experimentProfile.source}</small>
        </div>
      </section>

      <div className="forecast-workbench">
        <div className="forecast-left-column">
          <ForecastConfigPanel
            datasets={forecastDatasets}
            models={forecastModels}
            value={config}
            isRunning={isRunning}
            onChange={setConfig}
            onRun={runForecast}
          />
          <ForecastRunStatus status={status} job={job} errorMessage={errorMessage} />
        </div>

        <InfoPanel title="长时滚动预测" tone="soft">
          {result ? (
            <ForecastChart series={result.series} />
          ) : (
            <div className="forecast-empty-state">
              <p className="eyebrow">Ready</p>
              <h2>等待运行预测</h2>
              <p>点击左侧“运行预测”后，将模拟创建任务、轮询状态并加载 PANORAMA 预测结果。</p>
            </div>
          )}
        </InfoPanel>
      </div>

      {result ? (
        <>
          <ForecastMetrics metrics={result.metrics} status={status} />
          <div className="forecast-detail-grid">
            <ForecastPipeline stages={modelStages} />
            <ForecastEvaluationTable rows={result.evaluationRows} />
          </div>
          <InfoPanel title="预测结论">
            <p className="summary-copy">{result.conclusion}</p>
          </InfoPanel>
        </>
      ) : null}

      <p className="api-note">API seam：`forecastContract.ts` 定义任务式接口类型，`mockForecastService.ts` 后续可替换为真实 HTTP service。</p>
    </div>
  );
}
