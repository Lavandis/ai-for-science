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
