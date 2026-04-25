# Real PANORAMA Forecast Fixture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hand-authored time-series forecast demo output with a generated fixture from the included PANORAMA model and pendulum dataset.

**Architecture:** Add a Python generation script that emits a frontend JSON fixture matching `ForecastResult`. Keep React runtime static: the existing mock service simulates task lifecycle and returns the generated fixture for the default theta run.

**Tech Stack:** React 19, TypeScript, Vite JSON imports, Vitest, Python 3, PyTorch/Pandas/PyYAML for offline fixture generation.

---

## Tasks

### Task 1: Generate Real Forecast Fixture

**Files:**
- Create `scripts/generate_panorama_forecast_fixture.py`
- Create `src/features/timeSeriesForecast/panoramaForecastResult.json`

- [ ] Write the generator that loads PANORAMA assets from `assets/PANORAMA_PROJECT-master`.
- [ ] Run the generator locally to create JSON with `source: "panorama_project_assets"`.
- [ ] Verify the JSON contains actual, physics, and panorama series.

### Task 2: Wire Fixture Into Frontend Service

**Files:**
- Modify `src/features/timeSeriesForecast/data.ts`
- Modify `src/features/timeSeriesForecast/forecastContract.ts`
- Modify `src/features/timeSeriesForecast/mockForecastService.ts`
- Modify `src/features/timeSeriesForecast/mockForecastService.test.ts`

- [ ] Add fixture metadata to the forecast contract.
- [ ] Import the generated JSON in `data.ts`.
- [ ] Return the real fixture for default theta + baseline requests.
- [ ] Keep omega and baseline-disabled derived behavior for UI controls.
- [ ] Add tests that fail if the default service result is not fixture-backed.

### Task 3: Document And Verify

**Files:**
- Modify `README.md`

- [ ] Document `python3 scripts/generate_panorama_forecast_fixture.py`.
- [ ] Run `npm test`.
- [ ] Run `npm run build`.
