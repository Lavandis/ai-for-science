import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

// 【修改】加上 replace 把 Windows 的 \r\n 强行抹平为 \n，完美解决换行符导致的报错
const layoutCss = readFileSync(resolve(process.cwd(), "src/styles/layout.css"), "utf8").replace(/\r\n/g, '\n');
const imageRecognitionCss = readFileSync(
  resolve(process.cwd(), "src/features/imageRecognition/imageRecognition.css"),
  "utf8"
).replace(/\r\n/g, '\n');

describe("homepage feature grid layout", () => {
  test("uses three columns by default and collapses at the expected breakpoints", () => {
    expect(layoutCss).toContain(".feature-grid {\n  grid-template-columns: repeat(3, minmax(0, 1fr));\n}");
    expect(layoutCss).toContain("@media (max-width: 1080px) {\n  .feature-grid {\n    grid-template-columns: repeat(2, minmax(0, 1fr));\n  }\n}");
    expect(layoutCss).toContain(
      "@media (max-width: 860px) {\n  .site-header,\n  .hero-section,\n  .feature-grid,\n  .module-layout,\n  .metric-grid {\n    grid-template-columns: 1fr;\n  }"
    );
  });
});

describe("image recognition preview layout", () => {
  test("clips pendulum markers within a responsive preview frame", () => {
    expect(imageRecognitionCss).toContain("aspect-ratio:");
    expect(imageRecognitionCss).toContain("overflow: hidden;");
  });
});
