import { Link } from "react-router-dom";

type FeatureCardProps = {
  eyebrow: string;
  title: string;
  description: string;
  details: string[];
  href: string;
  actionLabel: string;
};

export function FeatureCard({
  eyebrow,
  title,
  description,
  details,
  href,
  actionLabel
}: FeatureCardProps) {
  return (
    <article className="feature-card">
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      <p>{description}</p>
      <ul className="clean-list">
        {details.map((detail) => (
          <li key={detail}>{detail}</li>
        ))}
      </ul>
      <Link className="button-link" to={href}>
        {actionLabel}
      </Link>
    </article>
  );
}
