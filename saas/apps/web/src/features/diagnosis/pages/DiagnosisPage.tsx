import type { Dispatch, SetStateAction } from 'react';
import type { PillarKey } from '@consultoria/domain';

import type { AppSection } from '../../../app/navigation';
import { diagnosisAreas, diagnosisQuestions } from '../data/mockDiagnosis';
import type { DiagnosisAnswersState, DiagnosisOverview } from '../types';
import { AreaNavigation } from '../components/AreaNavigation';
import { DiagnosisQuestionCard } from '../components/DiagnosisQuestionCard';
import { DiagnosisSummaryPanel } from '../components/DiagnosisSummaryPanel';

interface DiagnosisPageProps {
  activeSection: AppSection;
  onNavigate: (section: AppSection) => void;
  companyName: string;
  onCompanyNameChange: (value: string) => void;
  answers: DiagnosisAnswersState;
  onAnswerChange: Dispatch<SetStateAction<DiagnosisAnswersState>>;
  overview: DiagnosisOverview;
}

const diagnosisSections: PillarKey[] = ['strategy', 'people', 'processes', 'marketing_sales', 'financial'];

export function DiagnosisPage({
  activeSection,
  onNavigate,
  companyName,
  onCompanyNameChange,
  answers,
  onAnswerChange,
  overview,
}: DiagnosisPageProps) {
  const currentAreaKey = diagnosisSections.includes(activeSection as PillarKey) ? (activeSection as PillarKey) : 'strategy';
  const currentArea = diagnosisAreas.find((area) => area.key === currentAreaKey) ?? diagnosisAreas[0];
  const areaQuestions = diagnosisQuestions.filter((question) => question.area === currentArea.key);

  return (
    <div className="page-stack">
      <section className="hero panel">
        <span className="eyebrow">Diagnostico</span>
        <h2>Formulario por area</h2>
        <p>Diagnostico dividido pelos cinco pilares da consultoria com perguntas de 1 a 5 e score automatico.</p>
      </section>

      <div className="diagnosis-layout">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h3>{currentArea.label}</h3>
              <p>{currentArea.description}</p>
            </div>
            <strong>{overview.completion}% concluido</strong>
          </div>

          <label>
            Empresa
            <input
              value={companyName}
              onChange={(event) => onCompanyNameChange(event.target.value)}
              placeholder="Nome da empresa"
            />
          </label>

          <AreaNavigation
            activeArea={currentArea.key}
            areas={diagnosisAreas}
            overview={overview}
            onSelectArea={(area) => onNavigate(area)}
          />

          <div className="question-list">
            {areaQuestions.map((question, index) => (
              <DiagnosisQuestionCard
                key={question.id}
                index={index + 1}
                question={question}
                value={answers[question.id]}
                onSelect={(value) =>
                  onAnswerChange((current) => ({
                    ...current,
                    [question.id]: value,
                  }))
                }
              />
            ))}
          </div>
        </section>

        <DiagnosisSummaryPanel overview={overview} />
      </div>
    </div>
  );
}
