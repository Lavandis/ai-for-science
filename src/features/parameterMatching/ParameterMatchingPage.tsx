import { InfoPanel } from "../../components/InfoPanel";
import { MetricCard } from "../../components/MetricCard";
import { PageHeader } from "../../components/PageHeader";
import { candidates, parameterInputGroups, recommendedSet } from "./data";
import "./parameterMatching.css";

export function ParameterMatchingPage() {
  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="独立模块"
        title="参数匹配"
        description="展示科研参数匹配的输入结构、推荐组合和候选结果。当前为静态数据，后续可替换为模型 API 返回。"
      />

      <div className="module-layout">
        <InfoPanel title="输入配置">
          <div className="field-list">
            {parameterInputGroups.map((item) => (
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
              <h3>{recommendedSet.title}</h3>
              <p>{recommendedSet.description}</p>
            </div>
            <MetricCard label="匹配度" value={recommendedSet.score} note="静态示例评分" />
          </div>
        </InfoPanel>
      </div>

      <InfoPanel title="候选列表">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>候选</th>
                <th>匹配度</th>
                <th>稳定性</th>
                <th>效率</th>
                <th>说明</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((candidate) => (
                <tr key={candidate.name}>
                  <td>{candidate.name}</td>
                  <td>{candidate.match}</td>
                  <td>{candidate.stability}</td>
                  <td>{candidate.efficiency}</td>
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
