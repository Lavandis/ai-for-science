import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

const layoutCss = readFileSync(resolve(process.cwd(), "src/styles/layout.css"), "utf8");
const imageRecognitionCss = readFileSync(
  resolve(process.cwd(), "src/features/imageRecognition/imageRecognition.css"),
  "utf8"
);
describe("shared layout styles", () => {
  test("keeps the home carousel and module pages responsive", () => {
    expect(layoutCss).toContain(".carousel-container");
    expect(layoutCss).toContain(".module-layout {\n  display: grid;");
    expect(layoutCss).toContain(".metric-grid {\n  display: grid;");
    expect(layoutCss).toContain("@media (max-width: 860px)");
    expect(layoutCss).toContain(".module-layout,\n  .metric-grid {\n    grid-template-columns: 1fr;\n  }");
  });
});

describe("image recognition preview layout", () => {
  test("clips pendulum markers within a responsive preview frame", () => {
    expect(imageRecognitionCss).toContain("aspect-ratio:");
    expect(imageRecognitionCss).toContain("overflow: hidden;");
  });
});
