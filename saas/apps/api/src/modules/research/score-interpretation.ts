export type DiagnosisScoreClassification =
  | 'CRITICO'
  | 'ATENCAO'
  | 'BOM'
  | 'EXCELENTE';

export interface DiagnosisScoreInterpretation {
  classification: DiagnosisScoreClassification;
  label: string;
  description: string;
}

export function getDiagnosisScoreInterpretation(
  score: number | null,
): DiagnosisScoreInterpretation | null {
  if (score == null || !Number.isFinite(score)) {
    return null;
  }

  if (score <= 39) {
    return {
      classification: 'CRITICO',
      label: 'Crítico',
      description:
        'Foram identificadas fragilidades importantes que exigem atenção prioritária da gestão.',
    };
  }

  if (score <= 59) {
    return {
      classification: 'ATENCAO',
      label: 'Atenção',
      description:
        'O diagnóstico identificou pontos relevantes de melhoria que podem impactar o desempenho da empresa.',
    };
  }

  if (score <= 79) {
    return {
      classification: 'BOM',
      label: 'Bom',
      description:
        'A empresa apresenta um cenário geral positivo, mas ainda possui pontos relevantes que podem ser aprimorados.',
    };
  }

  return {
    classification: 'EXCELENTE',
    label: 'Excelente',
    description:
      'O diagnóstico indica um cenário organizacional muito positivo, com oportunidades pontuais de evolução.',
  };
}
