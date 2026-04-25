# AI for Science Three Modules Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the frontend from two modules to three by adding a static image-recognition page, renaming parameter matching to template matching, and updating the homepage/navigation to match the new product structure.

**Architecture:** Keep the existing React + Vite single-page app shape, preserve one feature folder per module, and continue using shared layout/components plus feature-local `data.ts` files as the API seam. Implement the new behavior with route-level changes, homepage content updates, one feature-folder rename, one new feature folder, and a small shared style extension for the image preview layout.

**Tech Stack:** React 19, React Router, TypeScript, Vitest, Testing Library, CSS files under `src/styles` and feature-local CSS.

---

## File Map

### Create

- `src/features/imageRecognition/ImageRecognitionPage.tsx`
- `src/features/imageRecognition/data.ts`
- `src/features/imageRecognition/imageRecognition.css`

### Rename

- `src/features/parameterMatching/ParameterMatchingPage.tsx` -> `src/features/templateMatching/TemplateMatchingPage.tsx`
- `src/features/parameterMatching/data.ts` -> `src/features/templateMatching/data.ts`
- `src/features/parameterMatching/parameterMatching.css` -> `src/features/templateMatching/templateMatching.css`

### Modify

- `src/App.tsx`
- `src/App.test.tsx`
- `src/components/AppLayout.tsx`
- `src/pages/HomePage.tsx`
- `src/styles/layout.css`

---

### Task 1: Update Route Tests For Three Modules

**Files:**
- Modify: `src/App.test.tsx`
- Test: `src/App.test.tsx`

- [ ] **Step 1: Write the failing test**

Replace the current test file contents with the following so the desired product behavior is fully described before implementation:

```tsx
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, test } from "vitest";
import App from "./App";

describe("AI for Science routes", () => {
  test("renders a home page with three separate module entry cards", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: /AI for Science/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /进入图像识别/ })).toHaveAttribute(
      "href",
      "/image-recognition"
    );
    expect(screen.getByRole("link", { name: /进入模板匹配/ })).toHaveAttribute(
      "href",
      "/template-matching"
    );
    expect(screen.getByRole("link", { name: /进入时序预测/ })).toHaveAttribute(
      "href",
      "/time-series-forecast"
    );
    expect(screen.getByText(/图像识别、模板匹配与时序预测/)).toBeInTheDocument();
  });

  test("renders the image recognition feature as an independent page", () => {
    render(
      <MemoryRouter initialEntries={["/image-recognition"]}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: "图像识别" })).toBeInTheDocument();
    expect(screen.getByText("样本来源")).toBeInTheDocument();
    expect(screen.getByText("关键点坐标")).toBeInTheDocument();
    expect(screen.getByText(/摆球中心/)).toBeInTheDocument();
  });

  test("renders the template matching feature as an independent page", () => {
    render(
      <MemoryRouter initialEntries={["/template-matching"]}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: "模板匹配" })).toBeInTheDocument();
    expect(screen.getByText("目标模板")).toBeInTheDocument();
    expect(screen.getByText("推荐模板")).toBeInTheDocument();
  });

  test("renders the time series forecast feature as an independent page", () => {
    render(
      <MemoryRouter initialEntries={["/time-series-forecast"]}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: "时序预测" })).toBeInTheDocument();
    expect(screen.getByText("预测步长")).toBeInTheDocument();
    expect(screen.getByText("趋势图占位")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`

Expected: FAIL because `/image-recognition` and `/template-matching` do not exist yet, homepage still says `参数匹配`, and assertions for new links/content fail.

- [ ] **Step 3: Commit**

```bash
git add src/App.test.tsx
git commit -m "test: define three-module routing behavior"
```

### Task 2: Update App Routing, Navigation, And Homepage

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/AppLayout.tsx`
- Modify: `src/pages/HomePage.tsx`
- Test: `src/App.test.tsx`

- [ ] **Step 1: Write the minimal routing and homepage implementation**

Update `src/App.tsx` to point to the new route structure:

```tsx
import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { ImageRecognitionPage } from "./features/imageRecognition/ImageRecognitionPage";
import { TemplateMatchingPage } from "./features/templateMatching/TemplateMatchingPage";
import { TimeSeriesForecastPage } from "./features/timeSeriesForecast/TimeSeriesForecastPage";
import { HomePage } from "./pages/HomePage";

export default function App() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/image-recognition" element={<ImageRecognitionPage />} />
        <Route path="/template-matching" element={<TemplateMatchingPage />} />
        <Route path="/time-series-forecast" element={<TimeSeriesForecastPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppLayout>
  );
}
```

Update `src/components/AppLayout.tsx` so the navigation order matches the spec:

```tsx
<nav className="site-nav" aria-label="主要导航">
  <NavLink to="/" end>
    首页
  </NavLink>
  <NavLink to="/image-recognition">图像识别</NavLink>
  <NavLink to="/template-matching">模板匹配</NavLink>
  <NavLink to="/time-series-forecast">时序预测</NavLink>
</nav>
```

Update `src/pages/HomePage.tsx` so the cards and hero copy match the new product wording:

```tsx
const features = [
  {
    eyebrow: "Module 01",
    title: "图像识别",
    description: "面向通用科研图像，展示识别对象、关键点坐标、置信度与结果说明。",
    details: ["独立页面", "样本预览占位", "关键点坐标表"],
    href: "/image-recognition",
    actionLabel: "进入图像识别"
  },
  {
    eyebrow: "Module 02",
    title: "模板匹配",
    description: "围绕目标模板、样本特征与约束条件，展示推荐模板与候选结果。",
    details: ["独立页面", "静态输入占位", "候选模板表格"],
    href: "/template-matching",
    actionLabel: "进入模板匹配"
  },
  {
    eyebrow: "Module 03",
    title: "时序预测",
    description: "面向科研序列数据，展示预测窗口、趋势图占位、预测区间与摘要指标。",
    details: ["独立页面", "趋势图占位", "预测摘要指标"],
    href: "/time-series-forecast",
    actionLabel: "进入时序预测"
  }
];
```

Also change the hero paragraph to:

```tsx
<p className="hero-copy">
  一个面向科研工作流的前端原型。首版保留三个清晰模块：图像识别、模板匹配与时序预测，
  后续可以在各自模块内替换为真实模型服务。
</p>
```

- [ ] **Step 2: Run test to verify it still fails for the missing pages**

Run: `npm test`

Expected: FAIL only on the missing `ImageRecognitionPage` / `TemplateMatchingPage` implementations or missing imports, while the homepage expectations move closer to passing.

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx src/components/AppLayout.tsx src/pages/HomePage.tsx
git commit -m "feat: update navigation and homepage for three modules"
```

### Task 3: Rename Parameter Matching To Template Matching

**Files:**
- Create: `src/features/templateMatching/TemplateMatchingPage.tsx`
- Create: `src/features/templateMatching/data.ts`
- Create: `src/features/templateMatching/templateMatching.css`
- Delete after copy: `src/features/parameterMatching/ParameterMatchingPage.tsx`
- Delete after copy: `src/features/parameterMatching/data.ts`
- Delete after copy: `src/features/parameterMatching/parameterMatching.css`
- Test: `src/App.test.tsx`

- [ ] **Step 1: Copy and rename the existing feature into the new folder**

Create `src/features/templateMatching/TemplateMatchingPage.tsx` with:

```tsx
import { InfoPanel } from "../../components/InfoPanel";
import { MetricCard } from "../../components/MetricCard";
import { PageHeader } from "../../components/PageHeader";
import { candidates, recommendedTemplate, templateInputGroups } from "./data";
import "./templateMatching.css";

export function TemplateMatchingPage() {
  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="独立模块"
        title="模板匹配"
        description="展示科研模板匹配的输入结构、推荐模板与候选结果。当前为静态数据，后续可替换为模型 API 返回。"
      />

      <div className="module-layout">
        <InfoPanel title="输入配置">
          <div className="field-list">
            {templateInputGroups.map((item) => (
              <div className="field-row" key={item.label}>
                <span>{item.label}</span>
                <p>{item.value}</p>
              </div>
            ))}
          </div>
        </InfoPanel>

        <InfoPanel title="静态结果" tone="soft">
          <div className="recommendation-card">
            <div>
              <p className="eyebrow">Best Match</p>
              <h3>{recommendedTemplate.title}</h3>
              <p>{recommendedTemplate.description}</p>
            </div>
            <MetricCard label="匹配度" value={recommendedTemplate.score} note="静态示例评分" />
          </div>
        </InfoPanel>
      </div>

      <InfoPanel title="候选模板列表">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>模板</th>
                <th>匹配度</th>
                <th>相似性</th>
                <th>适配性</th>
                <th>说明</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((candidate) => (
                <tr key={candidate.name}>
                  <td>{candidate.name}</td>
                  <td>{candidate.match}</td>
                  <td>{candidate.similarity}</td>
                  <td>{candidate.fitness}</td>
                  <td>{candidate.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </InfoPanel>

      <p className="api-note">API seam：将 `data.ts` 中的静态集合替换为 service/API 调用即可接入真实模型。</p>
    </div>
  );
}
```

Create `src/features/templateMatching/data.ts` with:

```ts
export const templateInputGroups = [
  {
    label: "目标模板",
    value: "在标准实验模板库中寻找与当前观测最接近的流程模板"
  },
  {
    label: "输入样本特征",
    value: "关键点位置、形态摘要、实验阶段标签、观测指标"
  },
  {
    label: "约束条件",
    value: "优先保留解释性强、历史复现率高的模板"
  },
  {
    label: "匹配策略",
    value: "先按核心特征过滤，再按综合相似度排序"
  }
];

export const recommendedTemplate = {
  title: "推荐模板",
  score: "91%",
  description: "模板 A 在结构相似性与实验适配性之间最均衡，适合作为当前样本的首选模板。"
};

export const candidates = [
  {
    name: "模板 A",
    match: "91%",
    similarity: "高",
    fitness: "中高",
    note: "综合表现最均衡"
  },
  {
    name: "模板 B",
    match: "87%",
    similarity: "高",
    fitness: "中",
    note: "形态相近，但约束适配略弱"
  },
  {
    name: "模板 C",
    match: "83%",
    similarity: "中高",
    fitness: "高",
    note: "适合保守方案对照"
  }
];
```

Create `src/features/templateMatching/templateMatching.css` by copying the existing `recommendation-card` rules from the old CSS file.

- [ ] **Step 2: Remove the old parameter-matching files**

Delete:

```text
src/features/parameterMatching/ParameterMatchingPage.tsx
src/features/parameterMatching/data.ts
src/features/parameterMatching/parameterMatching.css
```

- [ ] **Step 3: Run test to verify the template matching route passes while image recognition still fails**

Run: `npm test`

Expected: The `模板匹配` route test passes. Remaining failures, if any, should now be limited to the missing `图像识别` page or style/layout details.

- [ ] **Step 4: Commit**

```bash
git add src/features/templateMatching src/App.tsx
git rm -r src/features/parameterMatching
git commit -m "feat: rename parameter matching to template matching"
```

### Task 4: Add The Image Recognition Feature

**Files:**
- Create: `src/features/imageRecognition/ImageRecognitionPage.tsx`
- Create: `src/features/imageRecognition/data.ts`
- Create: `src/features/imageRecognition/imageRecognition.css`
- Test: `src/App.test.tsx`

- [ ] **Step 1: Write the feature data**

Create `src/features/imageRecognition/data.ts` with:

```ts
export const imageRecognitionInputs = [
  {
    label: "样本来源",
    value: "单摆实验帧图像 / 显微图像 / 实验装置照片"
  },
  {
    label: "识别目标",
    value: "摆球中心、支点、参考刻度"
  },
  {
    label: "输出类型",
    value: "关键点坐标 / 边界框摘要 / 目标标签"
  },
  {
    label: "实验备注",
    value: "用于后续轨迹分析与角位移计算"
  }
];

export const recognizedObjects = ["摆球", "支点", "刻度参考线"];

export const keypoints = [
  { name: "支点", x: 152, y: 36, confidence: "98%" },
  { name: "摆球中心", x: 244, y: 198, confidence: "94%" },
  { name: "参考刻度", x: 314, y: 210, confidence: "89%" }
];

export const imageRecognitionSummary = {
  confidence: "94%",
  note: "已提取摆球中心与支点坐标，可进一步推导摆长、偏角与轨迹变化。"
};
```

- [ ] **Step 2: Write the page implementation**

Create `src/features/imageRecognition/ImageRecognitionPage.tsx` with:

```tsx
import { InfoPanel } from "../../components/InfoPanel";
import { MetricCard } from "../../components/MetricCard";
import { PageHeader } from "../../components/PageHeader";
import {
  imageRecognitionInputs,
  imageRecognitionSummary,
  keypoints,
  recognizedObjects
} from "./data";
import "./imageRecognition.css";

export function ImageRecognitionPage() {
  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="独立模块"
        title="图像识别"
        description="展示科研图像识别的输入结构、关键点坐标与结果说明。当前为静态数据，默认示例为单摆实验图像。"
      />

      <div className="module-layout">
        <InfoPanel title="输入配置">
          <div className="field-list">
            {imageRecognitionInputs.map((item) => (
              <div className="field-row" key={item.label}>
                <span>{item.label}</span>
                <p>{item.value}</p>
              </div>
            ))}
          </div>
        </InfoPanel>

        <InfoPanel title="样本预览" tone="soft">
          <div className="image-preview-card" role="img" aria-label="单摆实验样本预览">
            <div className="pendulum-frame">
              <span className="pivot-dot" />
              <span className="pendulum-line" />
              <span className="bob-dot" />
              <span className="scale-mark" />
            </div>
            <div className="preview-legend">
              <span>支点</span>
              <span>摆球中心</span>
              <span>参考刻度</span>
            </div>
          </div>
        </InfoPanel>
      </div>

      <div className="module-layout image-results-layout">
        <InfoPanel title="识别摘要">
          <div className="recognized-object-list" aria-label="识别对象">
            {recognizedObjects.map((item) => (
              <span key={item} className="recognized-object-chip">
                {item}
              </span>
            ))}
          </div>
          <MetricCard
            label="整体置信度"
            value={imageRecognitionSummary.confidence}
            note="静态识别示例"
          />
          <p className="summary-copy">{imageRecognitionSummary.note}</p>
        </InfoPanel>

        <InfoPanel title="关键点坐标">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>名称</th>
                  <th>x</th>
                  <th>y</th>
                  <th>置信度</th>
                </tr>
              </thead>
              <tbody>
                {keypoints.map((point) => (
                  <tr key={point.name}>
                    <td>{point.name}</td>
                    <td>{point.x}</td>
                    <td>{point.y}</td>
                    <td>{point.confidence}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </InfoPanel>
      </div>

      <p className="api-note">API seam：将 `data.ts` 中的静态集合替换为 service/API 调用即可接入真实模型。</p>
    </div>
  );
}
```

- [ ] **Step 3: Write the feature-local styles**

Create `src/features/imageRecognition/imageRecognition.css` with:

```css
.image-preview-card {
  display: grid;
  gap: var(--space-4);
}

.pendulum-frame {
  position: relative;
  min-height: 260px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background:
    linear-gradient(180deg, rgba(248, 251, 255, 0.95), rgba(236, 244, 252, 0.92)),
    radial-gradient(circle at 20% 20%, rgba(47, 111, 159, 0.08), transparent 8rem);
}

.pivot-dot,
.bob-dot,
.scale-mark,
.pendulum-line {
  position: absolute;
  display: block;
}

.pivot-dot {
  top: 28px;
  left: 148px;
  width: 12px;
  height: 12px;
  border-radius: 999px;
  background: var(--color-accent-dark);
}

.pendulum-line {
  top: 38px;
  left: 154px;
  width: 2px;
  height: 170px;
  background: linear-gradient(180deg, var(--color-accent-dark), var(--color-accent-soft));
  transform: rotate(29deg);
  transform-origin: top center;
}

.bob-dot {
  top: 188px;
  left: 238px;
  width: 24px;
  height: 24px;
  border-radius: 999px;
  background: var(--color-accent);
  box-shadow: 0 0 0 8px rgba(47, 111, 159, 0.14);
}

.scale-mark {
  top: 208px;
  left: 306px;
  width: 48px;
  height: 4px;
  border-radius: 999px;
  background: var(--color-accent-soft);
}

.preview-legend,
.recognized-object-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
}

.preview-legend span,
.recognized-object-chip {
  padding: 0.45rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  color: var(--color-muted);
  font-size: 0.92rem;
  background: rgba(255, 255, 255, 0.78);
}

.image-results-layout {
  grid-template-columns: minmax(0, 0.75fr) minmax(0, 1.25fr);
}

.summary-copy {
  margin: 0;
  color: var(--color-muted);
  line-height: 1.75;
}

@media (max-width: 860px) {
  .image-results-layout {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 4: Run test to verify all route tests pass**

Run: `npm test`

Expected: PASS with 4 passing tests in `src/App.test.tsx`.

- [ ] **Step 5: Commit**

```bash
git add src/features/imageRecognition src/App.tsx src/App.test.tsx
git commit -m "feat: add image recognition module"
```

### Task 5: Adjust Shared Responsive Layout And Run Final Verification

**Files:**
- Modify: `src/styles/layout.css`
- Test: `src/App.test.tsx`

- [ ] **Step 1: Update the homepage grid to support three cards cleanly**

Modify `src/styles/layout.css`:

```css
.feature-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

@media (max-width: 1080px) {
  .feature-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 860px) {
  .feature-grid,
  .module-layout,
  .metric-grid {
    grid-template-columns: 1fr;
  }
}
```

Keep the existing mobile spacing rules, but make sure this new `1080px` breakpoint is inserted before the `860px` media block.

- [ ] **Step 2: Run tests**

Run: `npm test`

Expected: PASS with all tests green.

- [ ] **Step 3: Run production build**

Run: `npm run build`

Expected: PASS with Vite production output under `dist/`.

- [ ] **Step 4: Run the container build**

Run: `docker build -t ai-for-science-frontend:test .`

Expected: PASS with a successfully tagged image.

- [ ] **Step 5: Smoke-test the SPA routes in the container**

Run:

```bash
bash -lc 'cid=$(docker run -d -p 18082:80 ai-for-science-frontend:test) && trap "docker rm -f $cid >/dev/null" EXIT && sleep 2 && curl --noproxy "*" -I http://127.0.0.1:18082/ && curl --noproxy "*" -I http://127.0.0.1:18082/image-recognition && curl --noproxy "*" -I http://127.0.0.1:18082/template-matching'
```

Expected: `HTTP/1.1 200 OK` for `/`, `/image-recognition`, and `/template-matching`.

- [ ] **Step 6: Commit**

```bash
git add src/styles/layout.css src/App.tsx src/App.test.tsx
git commit -m "style: polish three-module responsive layout"
```

---

## Self-Review

### Spec coverage

- Three modules with homepage entry order: covered in Task 1, Task 2, and Task 5.
- Rename parameter matching to template matching: covered in Task 3.
- Add image recognition page with pendulum example and coordinate output: covered in Task 4.
- Preserve time-series route and behavior: covered by Task 1 regression test and untouched feature code.
- Responsive behavior and no horizontal overflow regressions: covered in Task 5.
- Docker verification retained: covered in Task 5.

### Placeholder scan

- No `TODO`, `TBD`, or “implement later” placeholders remain.
- Every code-changing step includes concrete code or exact file operations.
- Every verification step includes an exact command and expected outcome.

### Type consistency

- Route names consistently use `image-recognition`, `template-matching`, and `time-series-forecast`.
- Component names consistently use `ImageRecognitionPage`, `TemplateMatchingPage`, and `TimeSeriesForecastPage`.
- Data exports align with component imports in each feature task.
