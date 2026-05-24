import type { PillarKey } from '@consultoria/domain';

import type { DiagnosisArea, DiagnosisOverview } from '../types';

interface AreaNavigationProps {
  activeArea: PillarKey;
  areas: DiagnosisArea[];
  overview: DiagnosisOverview;
  onSelectArea: (area: PillarKey) => void;
}

export function AreaNavigation({ activeArea, areas, overview, onSelectArea }: AreaNavigationProps) {
  return (
    <section className="pillar-nav">
      {areas.map((area) => {
        const score = overview.areaScores.find((item) => item.area === area.key);

        return (
          <button
            key={area.key}
            type="button"
            className={activeArea === area.key ? 'pillar-chip active' : 'pillar-chip'}
            onClick={() => onSelectArea(area.key)}
          >
            <span>{area.label}</span>
            <strong>
              {score?.answered ?? 0}/{score?.total ?? 0}
            </strong>
          </button>
        );
      })}
    </section>
  );
}
