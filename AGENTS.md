# Repository Guidelines

## Project Structure & Module Organization

This is a React 19 + Vite + TypeScript frontend prototype for AI for Science workflows. Runtime source lives in `src/`. Shared layout and display components are in `src/components/`, route-level pages are in `src/pages/`, and feature modules live under `src/features/` with one folder per module, for example `imageRecognition/`, `templateMatching/`, and `timeSeriesForecast/`. Each feature keeps its component, local CSS, and static `data.ts` together. Global styles are split across `src/styles/base.css`, `layout.css`, and `tokens.css`. Tests currently sit beside source files as `*.test.tsx`; shared test setup is in `src/test/setup.ts`. Deployment files (`Dockerfile`, `docker-compose.yml`, `nginx.conf`) are at the repository root.

## Build, Test, and Development Commands

- `npm install`: install dependencies from `package-lock.json`.
- `npm run dev`: start the Vite development server, usually on `http://localhost:5173`.
- `npm test`: run Vitest once in jsdom with Testing Library setup.
- `npm run build`: run `tsc --noEmit` and produce the Vite production build in `dist/`.
- `npm run preview`: serve the built app locally for a production-like check.
- `docker compose up --build`: build and run the static Nginx container on `http://localhost:8080`.

## Coding Style & Naming Conventions

Use TypeScript, React function components, and ES modules. Match the existing two-space indentation, double quotes, and semicolon style. Name components in `PascalCase` (`PageHeader.tsx`), exported data collections in `camelCase`, and feature folders in `camelCase`. Keep route and module copy in Chinese unless the surrounding UI already uses English. Prefer module-local CSS files for feature-specific styling and shared CSS tokens for cross-cutting values.

## Testing Guidelines

Use Vitest with React Testing Library and `@testing-library/jest-dom`. Add or update tests when routes, navigation, visible text, or module behavior changes. Prefer user-facing queries such as `getByRole`, `getByText`, and `within` over implementation details. Name tests `*.test.tsx` near the code they cover, then run `npm test` and `npm run build` before submitting.

## Commit & Pull Request Guidelines

Recent history uses short imperative or conventional-style messages, including `fix: ...`, `docs: ...`, and concise Chinese summaries. Keep commits focused on one change. Pull requests should include a brief description, test/build results, linked issue if applicable, and screenshots or short recordings for UI changes, especially responsive layout updates.

## Agent-Specific Instructions

Do not commit generated build output from `dist/` unless explicitly requested. Preserve existing module boundaries: add new AI workflow pages under `src/features/<moduleName>/` and register navigation through the existing routing/catalog pattern.
