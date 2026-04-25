# Real PANORAMA Forecast Fixture Design

## Goal

Use the newly added `assets/PANORAMA_PROJECT-master` model and pendulum data to make the time-series forecast demo display real PANORAMA prediction output instead of hand-authored placeholder curves.

## Approach

The frontend remains a static React/Vite application. A repository script runs the PANORAMA PyTorch model against the included pendulum CSV and writes a compact JSON fixture under `src/features/timeSeriesForecast/`. The existing mock forecast service continues to simulate job lifecycle, but completed jobs now return the generated real fixture for the default theta + baseline run.

This keeps the website easy to demo with `npm run dev` and avoids requiring the browser or Vite build to load PyTorch. The future API seam stays intact: the JSON-backed fixture can later be replaced by an HTTP service that returns the same `ForecastResult` shape.

## Data Flow

1. `scripts/generate_panorama_forecast_fixture.py` reads:
   - `assets/PANORAMA_PROJECT-master/configs/train_config.yaml`
   - `assets/PANORAMA_PROJECT-master/data/processed/pendulum_data_updated.csv`
   - `assets/PANORAMA_PROJECT-master/assets/models/panorama_model.pth`
2. The script runs pure physics and PANORAMA rollout on CPU using the test split from config.
3. The script writes `src/features/timeSeriesForecast/panoramaForecastResult.json`.
4. `data.ts` imports the JSON and converts it into `ForecastResult`.
5. `mockForecastService.ts` returns the real theta fixture for the default model/dataset request.

## Scope

- In scope: generated real theta prediction data, real metrics, real evaluation rows, documented generation command, tests proving the default result comes from the fixture.
- Out of scope: real-time backend inference, file upload, task queues, GPU dependency, Dockerizing Python dependencies, and browser-side model execution.

## Testing

- Unit tests assert the default service result is marked as generated from PANORAMA assets and contains non-placeholder series data.
- Existing route tests continue to verify the time-series page lifecycle.
- `npm test` and `npm run build` must pass.
