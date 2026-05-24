import type { AppSection } from '../../../app/navigation';
import type { DashboardAlert, DashboardTask, DiagnosisOverview } from '../../diagnosis/types';
import { AreaScoreCard } from '../components/AreaScoreCard';
import { DashboardStatCard } from '../components/DashboardStatCard';
import { InfoListCard } from '../components/InfoListCard';

interface DashboardPageProps {
  companyName: string;
  overview: DiagnosisOverview;
  priorityTasks: DashboardTask[];
  alerts: DashboardAlert[];
  onOpenDiagnosisArea: (section: AppSection) => void;
}

export function DashboardPage({
  companyName,
  overview,
  priorityTasks,
  alerts,
  onOpenDiagnosisArea,
}: DashboardPageProps) {
  return (
    <div className="page-stack">
      <section className="hero panel">
        <span className="eyebrow">Dashboard</span>
        <h2>{companyName}</h2>
        <p>Visao inicial do diagnostico empresarial com foco em score geral, areas e prioridades.</p>
      </section>

      <section className="stats-grid">
        <DashboardStatCard
          label="Score geral"
          value={`${overview.overallScore}%`}
          helper="Pontuacao consolidada do diagnostico"
        />
        <DashboardStatCard
          label="Media geral"
          value={`${overview.overallAverage}/5`}
          helper="Media das respostas preenchidas"
        />
        <DashboardStatCard
          label="Progresso"
          value={`${overview.completion}%`}
          helper="Percentual respondido no formulario"
        />
      </section>

      <section className="section-block">
        <div className="section-header">
          <div>
            <span className="eyebrow">Areas</span>
            <h3>Pilares da consultoria</h3>
          </div>
        </div>
        <div className="area-card-grid">
          {overview.areaScores.map((area) => (
            <AreaScoreCard key={area.area} area={area} onOpen={() => onOpenDiagnosisArea(area.area)} />
          ))}
        </div>
      </section>

      <section className="content-grid">
        <InfoListCard
          title="Tarefas prioritarias"
          items={priorityTasks.map((task) => `${task.title} - ${task.area} - ${task.priority}`)}
        />
        <InfoListCard
          title="Alertas"
          items={alerts.map((alert) => `${alert.title} - ${alert.description}`)}
        />
      </section>
    </div>
  );
}
