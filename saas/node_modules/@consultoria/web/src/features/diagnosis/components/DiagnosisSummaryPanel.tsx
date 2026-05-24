import type { DiagnosisOverview } from '../types';

interface DiagnosisSummaryPanelProps {
  overview: DiagnosisOverview;
}

export function DiagnosisSummaryPanel({ overview }: DiagnosisSummaryPanelProps) {
  return (
    <aside className="panel result-panel">
      <h3>Resumo do diagnostico</h3>
      <div className="executive-metrics">
        <div className="score-card">
          <span>Score geral</span>
          <strong>{overview.overallScore}%</strong>
        </div>
        <div className="score-card">
          <span>Media geral</span>
          <strong>{overview.overallAverage}/5</strong>
        </div>
      </div>

      <div className="score-list">
        {overview.areaScores.map((area) => (
          <div key={area.area} className="score-card">
            <span>{area.label}</span>
            <strong>{area.percentage}%</strong>
            <small>
              {area.answered}/{area.total} respondidas
            </small>
          </div>
        ))}
      </div>
    </aside>
  );
}
