import { InfoPanel } from "../../components/InfoPanel";

type ForecastPipelineProps = {
  stages: Array<{
    label: string;
    value: string;
    note: string;
  }>;
};

export function ForecastPipeline({ stages }: ForecastPipelineProps) {
  return (
    <InfoPanel title="模型流水线">
      <div className="pipeline-list">
        {stages.map((stage) => (
          <article className="pipeline-step" key={stage.label}>
            <span>{stage.label}</span>
            <strong>{stage.value}</strong>
            <p>{stage.note}</p>
          </article>
        ))}
      </div>
    </InfoPanel>
  );
}
