import type { DiagnosisQuestionnaire, DiagnosisResult, DiagnosisSubmissionInput } from '@consultoria/domain';

const API_BASE_URL = 'http://localhost:3333/api';

export async function fetchQuestionnaire(): Promise<DiagnosisQuestionnaire> {
  const response = await fetch(`${API_BASE_URL}/diagnosis/questionnaires/default`);

  if (!response.ok) {
    throw new Error('Falha ao carregar o questionario.');
  }

  return response.json();
}

export async function submitDiagnosis(payload: DiagnosisSubmissionInput): Promise<DiagnosisResult> {
  const response = await fetch(`${API_BASE_URL}/diagnosis/submissions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error('Falha ao enviar o diagnostico.');
  }

  return response.json();
}
