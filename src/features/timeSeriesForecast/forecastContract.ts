export type ForecastVariable = "theta" | "omega";

export type ForecastJobStatus = "idle" | "queued" | "running" | "completed" | "failed";

export type ForecastDataset = {
  id: string;
  name: string;
  sourcePath: string;
  sampleRateFps: number;
  durationSeconds: number;
  variables: ForecastVariable[];
  description: string;
};

export type ForecastModel = {
  id: string;
  name: string;
  kind: "panorama" | "physics_baseline";
  version: string;
  description: string;
  supportsBaselineComparison: boolean;
};

export type ForecastJobRequest = {
  datasetId: string;
  modelId: string;
  targetVariable: ForecastVariable;
  trainRatio: number;
  horizonSeconds: number;
  sampleRateFps: number;
  baselineEnabled: boolean;
};

export type ForecastJob = {
  id: string;
  status: Exclude<ForecastJobStatus, "idle">;
  createdAt: string;
  updatedAt: string;
  request: ForecastJobRequest;
  progress: number;
  message: string;
};

export type ForecastSeriesPoint = {
  second: number;
  actual: number;
  actualOmega?: number;
  physics: number | null;
  physicsOmega?: number | null;
  panorama: number | null;
  panoramaOmega?: number | null;
  phase: "train" | "test";
};

export type ForecastMetric = {
  label: string;
  value: string;
  note: string;
};

export type ForecastEvaluationRow = {
  time: string;
  actual: string;
  physics: string;
  panorama: string;
  note: string;
};

export type ForecastResult = {
  jobId: string;
  targetVariable: ForecastVariable;
  baselineEnabled: boolean;
  source?: "static_demo" | "panorama_project_assets";
  generatedFrom?: {
    dataset: string;
    model: string;
    trainRatio: number;
    fps: number;
    horizonSeconds: number;
    hiddenDim?: number;
    rawPoints: number;
  };
  series: ForecastSeriesPoint[];
  metrics: ForecastMetric[];
  evaluationRows: ForecastEvaluationRow[];
  conclusion: string;
  modelSummary: {
    physicsTerm: string;
    augmentationTerm: string;
    integrator: string;
  };
};
