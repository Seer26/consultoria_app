interface InfoListCardProps {
  title: string;
  items: string[];
}

export function InfoListCard({ title, items }: InfoListCardProps) {
  return (
    <section className="panel">
      <h3>{title}</h3>
      <ul className="info-list">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
