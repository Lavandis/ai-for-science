# PANORAMA Time Series Workbench Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a practical, interactive PANORAMA single-pendulum time series forecast workbench with a typed future API contract and a frontend mock service.

**Architecture:** Keep the module self-contained under `src/features/timeSeriesForecast/`. Define API-shaped TypeScript contracts first, drive the UI from a mock service that simulates job lifecycle, then split the current static page into focused feature-local components. The page owns orchestration state; child components stay presentational except the config form.

**Tech Stack:** React 19, Vite, TypeScript, CSS, Vitest, React Testing Library.

---

## Current Context

- Branch: `feature/time-series-module`.
- Spec: `docs/superpowers/specs/2026-04-25-time-series-panorama-workbench-design.md`.
- Existing draft files already contain useful PANORAMA copy and chart styling:
  - `src/features/timeSeriesForecast/TimeSeriesForecastPage.tsx`
  - `src/features/timeSeriesForecast/data.ts`
  - `src/features/timeSeriesForecast/timeSeriesForecast.css`
- Preserve unrelated untracked files `.codex` and `AGENTS.md`.
- Do not commit `dist/`.

## Target File Structure

- Create `src/features/timeSeriesForecast/forecastContract.ts`: shared API contract types.
- Create `src/features/timeSeriesForecast/mockForecastService.ts`: frontend-only service matching the contract shape.
- Create `src/features/timeSeriesForecast/mockForecastService.test.ts`: unit tests for job lifecycle and result access.
- Create `src/features/timeSeriesForecast/ForecastConfigPanel.tsx`: dataset/model/config form.
- Create `src/features/timeSeriesForecast/ForecastConfigPanel.test.tsx`: form submit and default state tests.
- Create `src/features/timeSeriesForecast/ForecastRunStatus.tsx`: job state card.
- Create `src/features/timeSeriesForecast/ForecastChart.tsx`: SVG comparison chart.
- Create `src/features/timeSeriesForecast/ForecastMetrics.tsx`: metric grid wrapper.
- Create `src/features/timeSeriesForecast/ForecastEvaluationTable.tsx`: result table.
- Create `src/features/timeSeriesForecast/ForecastPipeline.tsx`: PANORAMA pipeline cards.
- Modify `src/features/timeSeriesForecast/data.ts`: convert current static exports into typed fixtures.
- Modify `src/features/timeSeriesForecast/TimeSeriesForecastPage.tsx`: orchestrate config, mock job lifecycle, result rendering.
- Modify `src/features/timeSeriesForecast/timeSeriesForecast.css`: style new component class names and responsive workbench layout.
- Modify `src/App.test.tsx`: route-level coverage for the interactive workbench.
- Modify `src/layout.test.ts`: keep shared layout assertions aligned with restored module styles.
- Optionally modify `README.md`: add a short note that the time series module uses a mock task contract if the final UI introduces commands or assumptions not already documented.

---

### Task 1: API Contract Types And Typed Fixtures

**Files:**
- Create: `src/features/timeSeriesForecast/forecastContract.ts`
- Modify: `src/features/timeSeriesForecast/data.ts`

- [ ] **Step 1: Add the contract type file**

Create `src/features/timeSeriesForecast/forecastContract.ts` with this content:

```ts
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
  physics: number | null;
  panorama: number | null;
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
```

- [ ] **Step 2: Convert data fixtures to contract types**

Modify `src/features/timeSeriesForecast/data.ts` so it imports contract types and exports these typed values:

```ts
import type {
  ForecastDataset,
  ForecastEvaluationRow,
  ForecastJobRequest,
  ForecastMetric,
  ForecastModel,
  ForecastResult,
  ForecastSeriesPoint
} from "./forecastContract";

export const forecastDatasets: ForecastDataset[] = [
  {
    id: "pendulum-200fps",
    name: "单摆实验 200fps 样例",
    sourcePath: "data/processed/200_data.csv",
    sampleRateFps: 200,
    durationSeconds: 240,
    variables: ["theta", "omega"],
    description: "由单摆角度序列预处理得到，包含 theta 摆角和 omega 角速度。"
  }
];

export const forecastModels: ForecastModel[] = [
  {
    id: "panorama-v1",
    name: "PANORAMA 混合动力学模型",
    kind: "panorama",
    version: "v1-static",
    description: "物理白盒项 F_p 加神经残差项 F_a，并按原始 fps 数值积分。",
    supportsBaselineComparison: true
  }
];

export const defaultForecastJobRequest: ForecastJobRequest = {
  datasetId: "pendulum-200fps",
  modelId: "panorama-v1",
  targetVariable: "theta",
  trainRatio: 0.75,
  horizonSeconds: 60,
  sampleRateFps: 200,
  baselineEnabled: true
};

export const experimentProfile = {
  title: "单摆实验长时预测",
  model: "PANORAMA 混合动力学模型",
  description:
    "以单摆角度序列为例，将物理白盒模型、神经残差修正和数值积分组合起来，对测试段进行滚动外推。",
  source: "data/processed/200_data.csv"
};

export const modelStages = [
  {
    label: "01 数据预处理",
    value: "Time / theta / omega",
    note: "从角度序列构造状态量"
  },
  {
    label: "02 物理先验",
    value: "F_p",
    note: "重力、摆长、阻尼项"
  },
  {
    label: "03 神经残差",
    value: "F_a",
    note: "修正未建模实验误差"
  },
  {
    label: "04 数值积分",
    value: "Rollout",
    note: "按原始 fps 外推测试段"
  }
];

export const forecastMetrics: ForecastMetric[] = [
  {
    label: "PANORAMA RMSE",
    value: "0.0186 rad",
    note: "静态评估示例"
  },
  {
    label: "物理基线 RMSE",
    value: "0.0418 rad",
    note: "同一测试窗口"
  },
  {
    label: "误差改善",
    value: "+55.5%",
    note: "相对纯物理模型"
  },
  {
    label: "外推窗口",
    value: "60 s",
    note: "测试段滚动预测"
  }
];

export const pendulumSeries: ForecastSeriesPoint[] = [
  { second: 0, actual: -0.263, physics: null, panorama: null, phase: "train" },
  { second: 5, actual: -0.188, physics: null, panorama: null, phase: "train" },
  { second: 10, actual: 0.036, physics: null, panorama: null, phase: "train" },
  { second: 15, actual: 0.212, physics: null, panorama: null, phase: "train" },
  { second: 20, actual: 0.238, physics: null, panorama: null, phase: "train" },
  { second: 25, actual: 0.091, physics: null, panorama: null, phase: "train" },
  { second: 30, actual: -0.121, physics: null, panorama: null, phase: "train" },
  { second: 35, actual: -0.218, physics: null, panorama: null, phase: "train" },
  { second: 40, actual: -0.164, physics: -0.155, panorama: -0.161, phase: "test" },
  { second: 45, actual: 0.012, physics: 0.041, panorama: 0.017, phase: "test" },
  { second: 50, actual: 0.171, physics: 0.226, panorama: 0.179, phase: "test" },
  { second: 55, actual: 0.197, physics: 0.275, panorama: 0.207, phase: "test" },
  { second: 60, actual: 0.058, physics: 0.126, panorama: 0.066, phase: "test" },
  { second: 65, actual: -0.134, physics: -0.064, panorama: -0.125, phase: "test" },
  { second: 70, actual: -0.179, physics: -0.104, panorama: -0.171, phase: "test" },
  { second: 75, actual: -0.041, physics: 0.028, panorama: -0.035, phase: "test" },
  { second: 80, actual: 0.123, physics: 0.191, panorama: 0.131, phase: "test" },
  { second: 85, actual: 0.151, physics: 0.239, panorama: 0.159, phase: "test" }
];

export const forecastRows: ForecastEvaluationRow[] = [
  {
    time: "40 s",
    actual: "-0.164",
    physics: "-0.155",
    panorama: "-0.161",
    note: "测试段起点"
  },
  {
    time: "55 s",
    actual: "0.197",
    physics: "0.275",
    panorama: "0.207",
    note: "基线开始偏离"
  },
  {
    time: "70 s",
    actual: "-0.179",
    physics: "-0.104",
    panorama: "-0.171",
    note: "残差修正保持相位"
  },
  {
    time: "85 s",
    actual: "0.151",
    physics: "0.239",
    panorama: "0.159",
    note: "长时误差仍可控"
  }
];

export function createStaticForecastResult(jobId: string): ForecastResult {
  return {
    jobId,
    targetVariable: "theta",
    series: pendulumSeries,
    metrics: forecastMetrics,
    evaluationRows: forecastRows,
    conclusion:
      "PANORAMA 曲线相较纯物理基线更贴近真实角度序列，尤其在长时预测后段保留了更稳定的相位与幅值。",
    modelSummary: {
      physicsTerm: "F_p：阻尼单摆动力学",
      augmentationTerm: "F_a：神经网络残差修正",
      integrator: "原始 200fps 下滚动积分"
    }
  };
}
```

- [ ] **Step 3: Run the type check through the build command**

Run:

```bash
npm run build
```

Expected: TypeScript compiles. Vite may also build `dist/`; do not commit generated `dist/`.

- [ ] **Step 4: Commit**

```bash
git add src/features/timeSeriesForecast/forecastContract.ts src/features/timeSeriesForecast/data.ts
git commit -m "feat: add forecast contract fixtures"
```

---

### Task 2: Mock Forecast Service

**Files:**
- Create: `src/features/timeSeriesForecast/mockForecastService.test.ts`
- Create: `src/features/timeSeriesForecast/mockForecastService.ts`

- [ ] **Step 1: Write the failing service tests**

Create `src/features/timeSeriesForecast/mockForecastService.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { defaultForecastJobRequest } from "./data";
import { createMockForecastService } from "./mockForecastService";

describe("createMockForecastService", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-25T08:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("returns datasets and models for the configuration panel", async () => {
    const service = createMockForecastService();

    await expect(service.listDatasets()).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: "pendulum-200fps" })])
    );
    await expect(service.listModels()).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: "panorama-v1" })])
    );
  });

  test("moves a forecast job from queued to running to completed", async () => {
    const service = createMockForecastService();
    const job = await service.createForecastJob(defaultForecastJobRequest);

    expect(job).toMatchObject({
      id: "forecast-job-1",
      status: "queued",
      progress: 12,
      message: "预测任务已进入队列"
    });

    await vi.advanceTimersByTimeAsync(700);
    expect(await service.getForecastJob(job.id)).toMatchObject({
      status: "running",
      progress: 58,
      message: "正在执行 PANORAMA 滚动积分"
    });

    await vi.advanceTimersByTimeAsync(900);
    expect(await service.getForecastJob(job.id)).toMatchObject({
      status: "completed",
      progress: 100,
      message: "预测完成"
    });
  });

  test("returns result only after the job is completed", async () => {
    const service = createMockForecastService();
    const job = await service.createForecastJob(defaultForecastJobRequest);

    await expect(service.getForecastResult(job.id)).rejects.toThrow("预测任务尚未完成");

    await vi.advanceTimersByTimeAsync(1600);

    await expect(service.getForecastResult(job.id)).resolves.toMatchObject({
      jobId: job.id,
      targetVariable: "theta",
      metrics: expect.arrayContaining([expect.objectContaining({ label: "PANORAMA RMSE" })])
    });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run:

```bash
npm test -- src/features/timeSeriesForecast/mockForecastService.test.ts
```

Expected: FAIL because `mockForecastService.ts` does not exist.

- [ ] **Step 3: Implement the mock service**

Create `src/features/timeSeriesForecast/mockForecastService.ts`:

```ts
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

export function createMockForecastService(): MockForecastService {
  const jobs = new Map<string, JobStoreEntry>();
  let sequence = 0;

  return {
    async listDatasets() {
      return forecastDatasets;
    },

    async listModels() {
      return forecastModels;
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
        request,
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

      return entry.result;
    }
  };
}

export const mockForecastService = createMockForecastService();
```

- [ ] **Step 4: Run the service tests**

Run:

```bash
npm test -- src/features/timeSeriesForecast/mockForecastService.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/timeSeriesForecast/mockForecastService.ts src/features/timeSeriesForecast/mockForecastService.test.ts
git commit -m "feat: add mock forecast service"
```

---

### Task 3: Configuration And Run Status Components

**Files:**
- Create: `src/features/timeSeriesForecast/ForecastConfigPanel.tsx`
- Create: `src/features/timeSeriesForecast/ForecastConfigPanel.test.tsx`
- Create: `src/features/timeSeriesForecast/ForecastRunStatus.tsx`
- Modify: `src/features/timeSeriesForecast/timeSeriesForecast.css`

- [ ] **Step 1: Write the failing config panel tests**

Create `src/features/timeSeriesForecast/ForecastConfigPanel.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { defaultForecastJobRequest, forecastDatasets, forecastModels } from "./data";
import { ForecastConfigPanel } from "./ForecastConfigPanel";

describe("ForecastConfigPanel", () => {
  test("renders default PANORAMA configuration", () => {
    render(
      <ForecastConfigPanel
        datasets={forecastDatasets}
        models={forecastModels}
        value={defaultForecastJobRequest}
        isRunning={false}
        onChange={vi.fn()}
        onRun={vi.fn()}
      />
    );

    expect(screen.getByLabelText("数据集")).toHaveValue("pendulum-200fps");
    expect(screen.getByLabelText("模型版本")).toHaveValue("panorama-v1");
    expect(screen.getByLabelText("输出变量")).toHaveValue("theta");
    expect(screen.getByLabelText("训练比例")).toHaveValue(75);
    expect(screen.getByRole("button", { name: "运行预测" })).toBeEnabled();
  });

  test("submits the current configuration", () => {
    const onRun = vi.fn();

    render(
      <ForecastConfigPanel
        datasets={forecastDatasets}
        models={forecastModels}
        value={defaultForecastJobRequest}
        isRunning={false}
        onChange={vi.fn()}
        onRun={onRun}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "运行预测" }));

    expect(onRun).toHaveBeenCalledWith(defaultForecastJobRequest);
  });

  test("disables run while a job is active", () => {
    render(
      <ForecastConfigPanel
        datasets={forecastDatasets}
        models={forecastModels}
        value={defaultForecastJobRequest}
        isRunning={true}
        onChange={vi.fn()}
        onRun={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: "预测运行中" })).toBeDisabled();
  });
});
```

- [ ] **Step 2: Run the config panel tests to verify they fail**

Run:

```bash
npm test -- src/features/timeSeriesForecast/ForecastConfigPanel.test.tsx
```

Expected: FAIL because `ForecastConfigPanel.tsx` does not exist.

- [ ] **Step 3: Implement `ForecastConfigPanel`**

Create `src/features/timeSeriesForecast/ForecastConfigPanel.tsx`:

```tsx
import type { ForecastDataset, ForecastJobRequest, ForecastModel, ForecastVariable } from "./forecastContract";

type ForecastConfigPanelProps = {
  datasets: ForecastDataset[];
  models: ForecastModel[];
  value: ForecastJobRequest;
  isRunning: boolean;
  onChange: (nextValue: ForecastJobRequest) => void;
  onRun: (request: ForecastJobRequest) => void;
};

export function ForecastConfigPanel({
  datasets,
  models,
  value,
  isRunning,
  onChange,
  onRun
}: ForecastConfigPanelProps) {
  const update = (nextValue: Partial<ForecastJobRequest>) => {
    onChange({ ...value, ...nextValue });
  };

  const selectedDataset = datasets.find((dataset) => dataset.id === value.datasetId) ?? datasets[0];

  return (
    <section className="forecast-config-card" aria-label="预测配置">
      <div>
        <p className="eyebrow">Forecast Setup</p>
        <h2>实验与预测配置</h2>
        <p>使用内置单摆样例数据，先把预测任务流程跑通。</p>
      </div>

      <label className="forecast-control">
        <span>数据集</span>
        <select value={value.datasetId} onChange={(event) => update({ datasetId: event.target.value })}>
          {datasets.map((dataset) => (
            <option key={dataset.id} value={dataset.id}>
              {dataset.name}
            </option>
          ))}
        </select>
      </label>

      <label className="forecast-control">
        <span>模型版本</span>
        <select value={value.modelId} onChange={(event) => update({ modelId: event.target.value })}>
          {models.map((model) => (
            <option key={model.id} value={model.id}>
              {model.name} {model.version}
            </option>
          ))}
        </select>
      </label>

      <label className="forecast-control">
        <span>输出变量</span>
        <select
          value={value.targetVariable}
          onChange={(event) => update({ targetVariable: event.target.value as ForecastVariable })}
        >
          <option value="theta">theta 摆角</option>
          <option value="omega">omega 角速度</option>
        </select>
      </label>

      <label className="forecast-control">
        <span>训练比例</span>
        <input
          min="50"
          max="90"
          step="5"
          type="number"
          value={Math.round(value.trainRatio * 100)}
          onChange={(event) => update({ trainRatio: Number(event.target.value) / 100 })}
        />
      </label>

      <label className="forecast-control">
        <span>预测窗口</span>
        <input
          min="10"
          max="120"
          step="10"
          type="number"
          value={value.horizonSeconds}
          onChange={(event) => update({ horizonSeconds: Number(event.target.value) })}
        />
      </label>

      <label className="forecast-check">
        <input
          checked={value.baselineEnabled}
          type="checkbox"
          onChange={(event) => update({ baselineEnabled: event.target.checked })}
        />
        <span>启用纯物理基线对比</span>
      </label>

      <div className="forecast-config-summary">
        <span>{selectedDataset.sampleRateFps} fps</span>
        <span>{selectedDataset.durationSeconds}s 原始序列</span>
        <span>{selectedDataset.sourcePath}</span>
      </div>

      <button className="forecast-run-button" type="button" disabled={isRunning} onClick={() => onRun(value)}>
        {isRunning ? "预测运行中" : "运行预测"}
      </button>
    </section>
  );
}
```

- [ ] **Step 4: Implement `ForecastRunStatus`**

Create `src/features/timeSeriesForecast/ForecastRunStatus.tsx`:

```tsx
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
```

- [ ] **Step 5: Add component styles**

Append these classes to `src/features/timeSeriesForecast/timeSeriesForecast.css`:

```css
.forecast-config-card,
.forecast-status {
  display: grid;
  gap: var(--space-4);
  padding: clamp(1.1rem, 3vw, 1.5rem);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: rgba(255, 255, 255, 0.86);
  box-shadow: var(--shadow-soft);
}

.forecast-config-card h2,
.forecast-status h2 {
  margin: var(--space-1) 0 var(--space-2);
}

.forecast-config-card p,
.forecast-status p {
  margin: 0;
  color: var(--color-muted);
  line-height: 1.65;
}

.forecast-control,
.forecast-check {
  display: grid;
  gap: var(--space-2);
  color: var(--color-muted);
  font-size: 0.92rem;
}

.forecast-control select,
.forecast-control input {
  min-height: 44px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 0.65rem 0.75rem;
  color: var(--color-text);
  background: #ffffff;
}

.forecast-check {
  grid-template-columns: auto 1fr;
  align-items: center;
}

.forecast-config-summary {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.forecast-config-summary span {
  padding: 0.38rem 0.62rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
  color: var(--color-muted);
  background: rgba(255, 255, 255, 0.68);
  font-size: 0.84rem;
}

.forecast-run-button {
  min-height: 46px;
  border: 0;
  border-radius: var(--radius-pill);
  color: #ffffff;
  background: var(--color-accent-dark);
  cursor: pointer;
  font-weight: 700;
}

.forecast-run-button:disabled {
  cursor: not-allowed;
  opacity: 0.68;
}

.forecast-progress {
  height: 10px;
  overflow: hidden;
  border-radius: var(--radius-pill);
  background: rgba(47, 111, 159, 0.12);
}

.forecast-progress span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--gradient-ai);
  transition: width 220ms ease;
}

.forecast-status-meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  color: var(--color-muted);
  font-size: 0.9rem;
}
```

- [ ] **Step 6: Run component tests**

Run:

```bash
npm test -- src/features/timeSeriesForecast/ForecastConfigPanel.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/features/timeSeriesForecast/ForecastConfigPanel.tsx src/features/timeSeriesForecast/ForecastConfigPanel.test.tsx src/features/timeSeriesForecast/ForecastRunStatus.tsx src/features/timeSeriesForecast/timeSeriesForecast.css
git commit -m "feat: add forecast configuration controls"
```

---

### Task 4: Result Display Components

**Files:**
- Create: `src/features/timeSeriesForecast/ForecastChart.tsx`
- Create: `src/features/timeSeriesForecast/ForecastMetrics.tsx`
- Create: `src/features/timeSeriesForecast/ForecastEvaluationTable.tsx`
- Create: `src/features/timeSeriesForecast/ForecastPipeline.tsx`
- Modify: `src/features/timeSeriesForecast/timeSeriesForecast.css`

- [ ] **Step 1: Create `ForecastChart`**

Create `src/features/timeSeriesForecast/ForecastChart.tsx`:

```tsx
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
```

- [ ] **Step 2: Create result components**

Create `src/features/timeSeriesForecast/ForecastMetrics.tsx`:

```tsx
import { MetricCard } from "../../components/MetricCard";
import type { ForecastJobStatus, ForecastMetric } from "./forecastContract";

type ForecastMetricsProps = {
  metrics: ForecastMetric[];
  status: ForecastJobStatus;
};

export function ForecastMetrics({ metrics, status }: ForecastMetricsProps) {
  const statusMetric: ForecastMetric = {
    label: "任务状态",
    value: status,
    note: status === "completed" ? "结果已生成" : "等待预测完成"
  };

  return (
    <section className="metric-grid forecast-metrics" aria-label="预测摘要指标">
      {[...metrics, statusMetric].map((metric) => (
        <MetricCard key={metric.label} {...metric} />
      ))}
    </section>
  );
}
```

Create `src/features/timeSeriesForecast/ForecastEvaluationTable.tsx`:

```tsx
import { InfoPanel } from "../../components/InfoPanel";
import type { ForecastEvaluationRow } from "./forecastContract";

type ForecastEvaluationTableProps = {
  rows: ForecastEvaluationRow[];
};

export function ForecastEvaluationTable({ rows }: ForecastEvaluationTableProps) {
  return (
    <InfoPanel title="评估切片">
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>时间</th>
              <th>真实 theta</th>
              <th>物理基线</th>
              <th>PANORAMA</th>
              <th>说明</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.time}>
                <td>{row.time}</td>
                <td>{row.actual}</td>
                <td>{row.physics}</td>
                <td>{row.panorama}</td>
                <td>{row.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </InfoPanel>
  );
}
```

Create `src/features/timeSeriesForecast/ForecastPipeline.tsx`:

```tsx
import { InfoPanel } from "../../components/InfoPanel";

type ForecastPipelineProps = {
  stages: Array<{
    label: string;
    value: string;
    note: string;
  }>;
};

export function ForecastPipeline({ stages }: ForecastPipelineProps) {
  return (
    <InfoPanel title="模型流水线">
      <div className="pipeline-list">
        {stages.map((stage) => (
          <article className="pipeline-step" key={stage.label}>
            <span>{stage.label}</span>
            <strong>{stage.value}</strong>
            <p>{stage.note}</p>
          </article>
        ))}
      </div>
    </InfoPanel>
  );
}
```

- [ ] **Step 3: Confirm styles still apply to moved markup**

Run:

```bash
npm run build
```

Expected: PASS. If TypeScript reports an unused import from `TimeSeriesForecastPage.tsx`, remove that import in Task 5 when composing the page.

- [ ] **Step 4: Commit**

```bash
git add src/features/timeSeriesForecast/ForecastChart.tsx src/features/timeSeriesForecast/ForecastMetrics.tsx src/features/timeSeriesForecast/ForecastEvaluationTable.tsx src/features/timeSeriesForecast/ForecastPipeline.tsx src/features/timeSeriesForecast/timeSeriesForecast.css
git commit -m "feat: add forecast result components"
```

---

### Task 5: Compose The Interactive Workbench Page

**Files:**
- Modify: `src/features/timeSeriesForecast/TimeSeriesForecastPage.tsx`
- Modify: `src/App.test.tsx`

- [ ] **Step 1: Update route test for interactive behavior**

Modify the time series route test in `src/App.test.tsx` to use fake timers and click the run button:

```tsx
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, test, vi } from "vitest";
import App from "./App";
```

Replace the existing `renders 时序预测 as an independent page` test with:

```tsx
  test("renders 时序预测 as an interactive PANORAMA workbench", async () => {
    vi.useFakeTimers();

    render(
      <MemoryRouter initialEntries={["/time-series-forecast"]}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: "时序预测" })).toBeInTheDocument();
    expect(screen.getByLabelText("数据集")).toHaveValue("pendulum-200fps");
    expect(screen.getByRole("button", { name: "运行预测" })).toBeInTheDocument();
    expect(screen.getByText("尚未运行")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "运行预测" }));
    expect(await screen.findByText("forecast-job-1")).toBeInTheDocument();
    expect(screen.getByText("预测任务已进入队列")).toBeInTheDocument();

    await vi.advanceTimersByTimeAsync(700);
    expect(await screen.findByText("正在执行 PANORAMA 滚动积分")).toBeInTheDocument();

    await vi.advanceTimersByTimeAsync(900);
    expect(await screen.findByText("预测完成")).toBeInTheDocument();
    expect(screen.getByText("PANORAMA RMSE")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /单摆角度真实值/ })).toBeInTheDocument();

    expect(screen.queryByRole("region", { name: "功能入口" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "图像识别" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "模板匹配" })).not.toBeInTheDocument();

    vi.useRealTimers();
  });
```

Add this cleanup near the top-level route `describe` block:

```tsx
afterEach(() => {
  vi.useRealTimers();
});
```

- [ ] **Step 2: Run the route test to verify it fails**

Run:

```bash
npm test -- src/App.test.tsx
```

Expected: FAIL because the page has not yet wired the interactive mock service.

- [ ] **Step 3: Compose `TimeSeriesForecastPage`**

Replace `src/features/timeSeriesForecast/TimeSeriesForecastPage.tsx` with:

```tsx
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
```

- [ ] **Step 4: Add page layout styles**

Append these classes to `src/features/timeSeriesForecast/timeSeriesForecast.css`:

```css
.forecast-left-column {
  display: grid;
  gap: var(--space-4);
  align-content: start;
}

.forecast-empty-state {
  display: grid;
  align-content: center;
  min-height: 320px;
  padding: var(--space-6);
  border: 1px dashed rgba(47, 111, 159, 0.24);
  border-radius: var(--radius-lg);
  background: rgba(255, 255, 255, 0.62);
}

.forecast-empty-state h2 {
  margin: var(--space-2) 0;
}

.forecast-empty-state p:last-child {
  max-width: 46rem;
  margin: 0;
  color: var(--color-muted);
  line-height: 1.75;
}
```

- [ ] **Step 5: Run route tests**

Run:

```bash
npm test -- src/App.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/features/timeSeriesForecast/TimeSeriesForecastPage.tsx src/features/timeSeriesForecast/timeSeriesForecast.css src/App.test.tsx
git commit -m "feat: compose interactive forecast workbench"
```

---

### Task 6: Shared Layout And Responsive Polish

**Files:**
- Modify: `src/styles/tokens.css`
- Modify: `src/styles/layout.css`
- Modify: `src/layout.test.ts`
- Modify: `src/pages/HomePage.tsx`

- [ ] **Step 1: Confirm shared module styles exist and are not hidden**

Ensure `src/styles/layout.css` contains `.page-stack`, `.module-layout`, `.metric-grid`, `.info-panel`, `.field-row`, `.table-wrap`, and `.api-note` definitions. Ensure it does not contain this rule:

```css
.info-panel, .metric-card { display: none; }
```

- [ ] **Step 2: Keep homepage accessibility aligned with tests**

Ensure `src/pages/HomePage.tsx` has:

```tsx
<section
  aria-label="功能入口"
  className="showcase-section"
  id="showcase"
  onMouseEnter={() => setIsAutoPlaying(false)}
  onMouseLeave={() => setIsAutoPlaying(true)}
>
```

Ensure the module action link uses the catalog action label:

```tsx
<Link to={feature.href} className="btn-apple-outline">{feature.actionLabel}</Link>
```

Ensure pagination buttons have accessible labels:

```tsx
aria-label={`切换到${visualCards[index].title}`}
```

- [ ] **Step 3: Update the layout style test**

Ensure `src/layout.test.ts` contains assertions for the restored module layout:

```ts
describe("shared layout styles", () => {
  test("keeps the home carousel and module pages responsive", () => {
    expect(layoutCss).toContain(".carousel-container");
    expect(layoutCss).toContain(".module-layout {\n  display: grid;");
    expect(layoutCss).toContain(".metric-grid {\n  display: grid;");
    expect(layoutCss).toContain("@media (max-width: 860px)");
    expect(layoutCss).toContain(".module-layout,\n  .metric-grid {\n    grid-template-columns: 1fr;\n  }");
  });
});
```

- [ ] **Step 4: Run layout tests**

Run:

```bash
npm test -- src/layout.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/styles/tokens.css src/styles/layout.css src/layout.test.ts src/pages/HomePage.tsx
git commit -m "fix: restore responsive module layout"
```

---

### Task 7: Final Verification And Documentation

**Files:**
- Modify if needed: `README.md`

- [ ] **Step 1: Run the full test suite**

Run:

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 2: Run the production build**

Run:

```bash
npm run build
```

Expected: TypeScript and Vite build pass.

- [ ] **Step 3: Inspect git status**

Run:

```bash
git status --short --branch
```

Expected:

- The branch is `feature/time-series-module`.
- `dist/` is not staged.
- `.superpowers/` is ignored.
- `.codex` and `AGENTS.md` remain untracked unless the user explicitly asks to commit them.

- [ ] **Step 4: Update README only if the UI added user-facing commands**

If no commands changed, skip this step. If the README needs a module note, add this concise paragraph under the time series section:

```md
第一版时序预测模块使用前端 mock service 模拟任务式接口，流程为配置内置单摆数据集、运行预测任务、查看状态和预测结果。真实模型服务接入时可替换 `src/features/timeSeriesForecast/mockForecastService.ts`。
```

- [ ] **Step 5: Commit final documentation if changed**

If `README.md` changed, run:

```bash
git add README.md
git commit -m "docs: describe forecast workbench mock flow"
```

If `README.md` did not change, do not create an empty commit.

- [ ] **Step 6: Record verification evidence**

In the final implementation response, include:

```text
npm test
npm run build
```

Also mention any manual check that was not performed.

---

## Plan Self-Review

- Spec coverage: The plan implements the PANORAMA-specific workbench, static built-in dataset, interactive mock job lifecycle, task-style API contract, result chart, metrics, evaluation table, pipeline, error-ready state shape, tests, and responsive layout checks.
- Scope control: Uploading CSV, real PANORAMA Python service calls, auth, databases, task history, and chart libraries remain outside the plan.
- Type consistency: `ForecastJobRequest`, `ForecastJob`, `ForecastResult`, `ForecastSeriesPoint`, `ForecastMetric`, and `ForecastEvaluationRow` are defined once in `forecastContract.ts` and used by fixtures, service, page, and components.
