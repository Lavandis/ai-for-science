import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

const layoutCss = readFileSync(resolve(process.cwd(), "src/styles/layout.css"), "utf8").replace(/\r\n/g, "\n");
const imageRecognitionCss = readFileSync(
  resolve(process.cwd(), "src/features/imageRecognition/imageRecognition.css"),
  "utf8"
).replace(/\r\n/g, "\n");

describe("shared layout styles", () => {
  test("keeps the remote home grid and module pages responsive", () => {
    expect(layoutCss).toContain(".carousel-container");
    expect(layoutCss).toContain(".feature-grid {\n  grid-template-columns: repeat(3, minmax(0, 1fr));\n}");
    expect(layoutCss).toContain("@media (max-width: 1080px)");
    expect(layoutCss).toContain(".module-layout {\n  display: grid;");
    expect(layoutCss).toContain(".metric-grid {\n  display: grid;");
    expect(layoutCss).toContain("@media (max-width: 860px)");
    expect(layoutCss).toContain(".module-layout,\n  .metric-grid {\n    grid-template-columns: 1fr;\n  }");
    expect(layoutCss).toContain(".site-header {\n    box-sizing: border-box;");
  });
});

describe("image recognition preview layout", () => {
  test("clips pendulum markers within a responsive preview frame", () => {
    expect(imageRecognitionCss).toContain("aspect-ratio:");
    expect(imageRecognitionCss).toContain("overflow: hidden;");
  });
});
