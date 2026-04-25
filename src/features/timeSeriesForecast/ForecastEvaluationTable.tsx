import { InfoPanel } from "../../components/InfoPanel";
import type { ForecastEvaluationRow } from "./forecastContract";

type ForecastEvaluationTableProps = {
  rows: ForecastEvaluationRow[];
};

export function ForecastEvaluationTable({ rows }: ForecastEvaluationTableProps) {
  return (
    <InfoPanel title="评估切片">
      <div className="table-wrap">
        <table>
          <caption>预测评估切片对比表</caption>
          <thead>
            <tr>
              <th>时间</th>
              <th>真实 theta</th>
              <th>物理基线</th>
              <th>PANORAMA</th>
              <th>说明</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.time}>
                <td>{row.time}</td>
                <td>{row.actual}</td>
                <td>{row.physics}</td>
                <td>{row.panorama}</td>
                <td>{row.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </InfoPanel>
  );
}
