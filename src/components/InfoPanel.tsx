type InfoPanelProps = {
  title: string;
  children: React.ReactNode;
  tone?: "default" | "soft";
};

export function InfoPanel({ title, children, tone = "default" }: InfoPanelProps) {
  return (
    <section className={`info-panel info-panel--${tone}`}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}
