interface DashboardStatCardProps {
  label: string;
  value: string;
  helper: string;
}

export function DashboardStatCard({ label, value, helper }: DashboardStatCardProps) {
  return (
    <article className="stat-card panel">
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{helper}</p>
    </article>
  );
}
