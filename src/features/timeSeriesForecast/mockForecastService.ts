import {
  createStaticForecastResult,
  forecastDatasets,
  forecastModels
} from "./data";
import type {
  ForecastDataset,
  ForecastJob,
  ForecastJobRequest,
  ForecastModel,
  ForecastResult
} from "./forecastContract";

type JobStoreEntry = {
  job: ForecastJob;
  result: ForecastResult;
};

type MockForecastService = {
  listDatasets: () => Promise<ForecastDataset[]>;
  listModels: () => Promise<ForecastModel[]>;
  createForecastJob: (request: ForecastJobRequest) => Promise<ForecastJob>;
  getForecastJob: (jobId: string) => Promise<ForecastJob>;
  getForecastResult: (jobId: string) => Promise<ForecastResult>;
};

function cloneJob(job: ForecastJob): ForecastJob {
  return {
    ...job,
    request: { ...job.request }
  };
}

function cloneDataset(dataset: ForecastDataset): ForecastDataset {
  return {
    ...dataset,
    variables: [...dataset.variables]
  };
}

function cloneModel(model: ForecastModel): ForecastModel {
  return { ...model };
}

function cloneForecastResult(result: ForecastResult): ForecastResult {
  return {
    ...result,
    series: result.series.map((point) => ({ ...point })),
    metrics: result.metrics.map((metric) => ({ ...metric })),
    evaluationRows: result.evaluationRows.map((row) => ({ ...row })),
    modelSummary: { ...result.modelSummary }
  };
}

export function createMockForecastService(): MockForecastService {
  const jobs = new Map<string, JobStoreEntry>();
  let sequence = 0;

  return {
    async listDatasets() {
      return forecastDatasets.map(cloneDataset);
    },

    async listModels() {
      return forecastModels.map(cloneModel);
    },

    async createForecastJob(request) {
      sequence += 1;
      const now = new Date().toISOString();
      const id = `forecast-job-${sequence}`;
      const job: ForecastJob = {
        id,
        status: "queued",
        createdAt: now,
        updatedAt: now,
        request: { ...request },
        progress: 12,
        message: "预测任务已进入队列"
      };

      jobs.set(id, {
        job,
        result: createStaticForecastResult(id)
      });

      window.setTimeout(() => {
        const entry = jobs.get(id);
        if (!entry || entry.job.status !== "queued") return;

        entry.job = {
          ...entry.job,
          status: "running",
          updatedAt: new Date().toISOString(),
          progress: 58,
          message: "正在执行 PANORAMA 滚动积分"
        };
        jobs.set(id, entry);
      }, 700);

      window.setTimeout(() => {
        const entry = jobs.get(id);
        if (!entry || entry.job.status === "failed") return;

        entry.job = {
          ...entry.job,
          status: "completed",
          updatedAt: new Date().toISOString(),
          progress: 100,
          message: "预测完成"
        };
        jobs.set(id, entry);
      }, 1600);

      return cloneJob(job);
    },

    async getForecastJob(jobId) {
      const entry = jobs.get(jobId);
      if (!entry) {
        throw new Error("预测任务不存在");
      }

      return cloneJob(entry.job);
    },

    async getForecastResult(jobId) {
      const entry = jobs.get(jobId);
      if (!entry) {
        throw new Error("预测任务不存在");
      }

      if (entry.job.status !== "completed") {
        throw new Error("预测任务尚未完成");
      }

      return cloneForecastResult(entry.result);
    }
  };
}

export const mockForecastService = createMockForecastService();
