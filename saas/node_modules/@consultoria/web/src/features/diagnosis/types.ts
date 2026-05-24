import type { PillarKey } from '@consultoria/domain';

export interface DiagnosisArea {
  key: PillarKey;
  label: string;
  description: string;
}

export interface DiagnosisQuestion {
  id: string;
  area: PillarKey;
  title: string;
  helperText: string;
}

export type DiagnosisAnswersState = Record<string, number>;

export interface AreaScoreSummary {
  area: PillarKey;
  label: string;
  answered: number;
  total: number;
  score: number;
  average: number;
  percentage: number;
}

export interface DiagnosisOverview {
  overallScore: number;
  overallAverage: number;
  completion: number;
  areaScores: AreaScoreSummary[];
}

export interface DashboardTask {
  id: string;
  title: string;
  area: string;
  priority: 'Alta' | 'Media' | 'Baixa';
}

export interface DashboardAlert {
  id: string;
  title: string;
  description: string;
}
