# PANORAMA 时序预测工作台设计

## Summary

时序预测模块第一版聚焦 PANORAMA 单摆实验，不做通用预测平台。页面目标是让科研用户能清楚完成一条可演示的预测链路：选择内置单摆数据集，配置预测参数，点击运行预测，看到任务状态变化，并查看真实角度、物理基线与 PANORAMA 预测的对比结果。

第一版全部在前端完成交互模拟，不接真实后端，不上传文件，不训练模型。代码仍保留清晰 API seam：静态数据和 mock service 集中在 `src/features/timeSeriesForecast/` 内，后续可替换为真实 HTTP service。

## Confirmed Decisions

- 页面定位：PANORAMA 单摆实验专用工作台。
- 布局方向：工作台优先，左侧配置，右侧主图，下方指标和评估详情。
- 交互深度：可操作静态工作台，模拟任务状态 `idle -> queued -> running -> completed`。
- 数据输入：仅使用内置单摆示例数据集，例如 `data/processed/200_data.csv`。
- 接口契约：采用任务式接口，设计为 `创建预测任务 -> 查询任务状态 -> 获取预测结果`。

## User Experience

页面需要优先服务“能不能用明白”，而不是做成纯展示页。

顶部保留简短说明，明确这是 PANORAMA 单摆预测样例。主体采用两栏工作台：左侧是配置表单，右侧是预测主图。配置区包含数据集、模型版本、训练/测试切分、预测窗口、输出变量和是否启用物理基线。主图区在未运行时显示内置示例说明；运行后显示三条曲线：真实 `theta`、纯物理基线、PANORAMA 预测。

运行按钮点击后，前端本地模拟任务状态。`queued` 显示任务已进入队列，`running` 显示正在积分和滚动预测，`completed` 显示结果和指标。第一版可以提供一个“重新运行”入口，方便演示和回归检查。

移动端布局改为单列：先显示配置和运行状态，再显示主图、指标和表格。所有表格区域必须允许局部横向滚动，页面整体不能出现横向滚动。

## Component Architecture

时序预测模块应拆成清晰的 feature-local 组件，避免继续扩大 `TimeSeriesForecastPage`。

- `TimeSeriesForecastPage`：页面编排、状态持有、调用 mock service。
- `ForecastConfigPanel`：左侧配置表单，负责收集预测请求参数。
- `ForecastRunStatus`：任务状态卡片，展示 `idle / queued / running / completed / failed`。
- `ForecastChart`：预测主图，展示真实值、物理基线和 PANORAMA 预测。
- `ForecastMetrics`：展示 RMSE、改善率、外推窗口、状态等摘要指标。
- `ForecastEvaluationTable`：展示关键时间点真实值、基线预测、PANORAMA 预测和说明。
- `ForecastPipeline`：展示 PANORAMA 的数据预处理、物理项、神经残差、数值积分流程。
- `forecastContract.ts`：集中定义接口契约 TypeScript 类型。
- `mockForecastService.ts`：模拟 datasets、models、job lifecycle 和 result 返回。
- `data.ts`：保存内置示例数据和默认选项，后续可逐步减少为 mock service 的 fixture。

## Frontend State Model

页面状态围绕一个预测任务组织：

```ts
type ForecastJobStatus = "idle" | "queued" | "running" | "completed" | "failed";

type ForecastWorkbenchState = {
  config: ForecastJobRequest;
  job: ForecastJob | null;
  result: ForecastResult | null;
  errorMessage: string | null;
};
```

第一版 mock 行为：

1. 初始状态为 `idle`，展示默认配置和示例说明。
2. 点击运行后立即创建本地 job，状态变为 `queued`。
3. 短暂延迟后变为 `running`。
4. 再次延迟后变为 `completed` 并注入静态结果。
5. 失败状态暂不随机触发，但 UI 和类型要支持 `failed`，用于未来接真实接口。

## API Contract

接口路径以 `/api/time-series` 为前缀。第一版只定义契约，不实际请求后端。

### GET `/api/time-series/datasets`

返回可选数据集列表。

```ts
type ForecastDataset = {
  id: string;
  name: string;
  sourcePath: string;
  sampleRateFps: number;
  durationSeconds: number;
  variables: Array<"theta" | "omega">;
  description: string;
};
```

### GET `/api/time-series/models`

返回可选模型列表。

```ts
type ForecastModel = {
  id: string;
  name: string;
  kind: "panorama" | "physics_baseline";
  version: string;
  description: string;
  supportsBaselineComparison: boolean;
};
```

### POST `/api/time-series/forecast-jobs`

创建预测任务。

```ts
type ForecastJobRequest = {
  datasetId: string;
  modelId: string;
  targetVariable: "theta" | "omega";
  trainRatio: number;
  horizonSeconds: number;
  sampleRateFps: number;
  baselineEnabled: boolean;
};

type ForecastJob = {
  id: string;
  status: "queued" | "running" | "completed" | "failed";
  createdAt: string;
  updatedAt: string;
  request: ForecastJobRequest;
  progress: number;
  message: string;
};
```

### GET `/api/time-series/forecast-jobs/:jobId`

查询任务状态。返回 `ForecastJob`。

### GET `/api/time-series/forecast-jobs/:jobId/result`

获取预测结果。只有任务完成后返回成功。

```ts
type ForecastSeriesPoint = {
  second: number;
  actual: number;
  physics: number | null;
  panorama: number | null;
  phase: "train" | "test";
};

type ForecastMetric = {
  label: string;
  value: string;
  note: string;
};

type ForecastEvaluationRow = {
  time: string;
  actual: string;
  physics: string;
  panorama: string;
  note: string;
};

type ForecastResult = {
  jobId: string;
  targetVariable: "theta" | "omega";
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

## Error Handling

前端需要为真实接口预留错误路径，即使第一版 mock 默认成功。

- 创建任务失败：保留当前配置，显示错误提示，运行按钮可重新点击。
- 查询状态失败：显示“状态同步失败”，保留最后一次 job 状态。
- 结果获取失败：显示“结果读取失败”，允许重新获取或重新运行。
- 参数非法：在字段附近显示提示，不只在页面顶部显示错误。

第一版不做复杂 toast 系统，优先使用状态卡片和字段级辅助文案。

## Testing Plan

- 更新路由测试，确认 `/time-series-forecast` 显示工作台核心文案、运行按钮、PANORAMA 指标和接口契约相关状态。
- 为 `ForecastConfigPanel` 添加基础测试，确认默认配置和提交参数正确。
- 为 `mockForecastService` 添加单元测试，确认 job 状态流和 result shape 符合契约。
- 运行 `npm test`。
- 运行 `npm run build`，确认 TypeScript 和 Vite 构建通过。
- 手动检查桌面和移动端宽度，确认主页面无横向滚动，表格区域可局部横向滚动。

## Out Of Scope

- 不上传 CSV。
- 不解析真实文件。
- 不连接 PANORAMA Python 服务。
- 不做模型训练、任务队列、鉴权、数据库或任务历史列表。
- 不引入图表库。第一版继续用 SVG/CSS 绘制静态曲线，避免过早增加依赖。

## Implementation Notes

已有时序预测页面可以作为视觉起点，但需要重构为小组件和 mock service。全局布局中已经恢复模块页基础样式的方向应保留，避免再次隐藏 `.info-panel` 或 `.metric-card` 这类共享组件。

后续实施时应先补类型和 mock service，再接 UI 组件，最后更新测试。这样接口契约会自然约束 UI，而不是 UI 先长成一团再补类型。
