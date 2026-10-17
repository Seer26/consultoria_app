import { useMemo, useState } from 'react';

import type { AppSection } from './navigation';
import type { DiagnosisAnswersState } from '../features/diagnosis/types';
import { DashboardPage } from '../features/dashboard/pages/DashboardPage';
import { DiagnosisPage } from '../features/diagnosis/pages/DiagnosisPage';
import { diagnosisAreas, diagnosisQuestions, mockAlerts, mockPriorityTasks } from '../features/diagnosis/data/mockDiagnosis';
import { calculateDiagnosisOverview } from '../features/diagnosis/utils/diagnosisScoring';
import { MonitoringPage } from '../features/action-plan/MonitoringPage';
import { AppLayout } from './layout/AppLayout';

export function App() {
  const [activeSection, setActiveSection] = useState<AppSection>('action_plan');
  const [companyName, setCompanyName] = useState('Empresa Exemplo');
  const [answers, setAnswers] = useState<DiagnosisAnswersState>({});

  const overview = useMemo(
    () => calculateDiagnosisOverview(diagnosisAreas, diagnosisQuestions, answers),
    [answers],
  );

  const content = (() => {
    if (activeSection === 'action_plan') return <MonitoringPage />;
    if (activeSection === 'dashboard') {
      return (
        <DashboardPage
          companyName={companyName}
          overview={overview}
          priorityTasks={mockPriorityTasks}
          alerts={mockAlerts}
          onOpenDiagnosisArea={setActiveSection}
        />
      );
    }

    return (
      <DiagnosisPage
        activeSection={activeSection}
        onNavigate={setActiveSection}
        companyName={companyName}
        onCompanyNameChange={setCompanyName}
        answers={answers}
        onAnswerChange={setAnswers}
        overview={overview}
      />
    );
  })();

  return <AppLayout activeSection={activeSection} onNavigate={setActiveSection}>{content}</AppLayout>;
}
