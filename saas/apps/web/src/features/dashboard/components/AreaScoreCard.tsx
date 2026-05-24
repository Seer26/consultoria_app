import type { AreaScoreSummary } from '../../diagnosis/types';

interface AreaScoreCardProps {
  area: AreaScoreSummary;
  onOpen: () => void;
}

export function AreaScoreCard({ area, onOpen }: AreaScoreCardProps) {
  return (
    <article className="score-area-card">
      <div className="score-area-card__top">
        <span>{area.label}</span>
        <strong>{area.percentage}%</strong>
      </div>
      <p>
        Respostas: {area.answered}/{area.total}
      </p>
      <p>Media: {area.average}/5</p>
      <button type="button" className="ghost-button" onClick={onOpen}>
        Abrir area
      </button>
    </article>
  );
}
