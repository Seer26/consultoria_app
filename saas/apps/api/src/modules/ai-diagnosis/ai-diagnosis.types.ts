export interface AiDiagnosisAnswerInput {
  questionId?: string;
  question?: string;
  area?: string;
  answer: number | string;
  notes?: string;
}

export interface AiDiagnosisInput {
  answers: AiDiagnosisAnswerInput[];
}

export interface AiDiagnosisProblem {
  area: string;
  title: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
}

export interface AiDiagnosisQuestion {
  area: string;
  question: string;
  reason: string;
}

export interface AiDiagnosisAction {
  area: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
}

export interface AiDiagnosisResult {
  problems: AiDiagnosisProblem[];
  questions: AiDiagnosisQuestion[];
  actions: AiDiagnosisAction[];
}
