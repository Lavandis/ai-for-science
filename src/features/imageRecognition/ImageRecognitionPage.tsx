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
              <span>摆球中心点</span>
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
