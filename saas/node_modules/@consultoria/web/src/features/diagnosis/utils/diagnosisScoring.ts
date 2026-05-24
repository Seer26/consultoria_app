import type { DiagnosisAnswersState, DiagnosisArea, DiagnosisOverview, DiagnosisQuestion } from '../types';

export function calculateDiagnosisOverview(
  areas: DiagnosisArea[],
  questions: DiagnosisQuestion[],
  answers: DiagnosisAnswersState,
): DiagnosisOverview {
  const areaScores = areas.map((area) => {
    const areaQuestions = questions.filter((question) => question.area === area.key);
    const answeredValues = areaQuestions
      .map((question) => answers[question.id])
      .filter((value): value is number => typeof value === 'number');
    const score = answeredValues.reduce((sum, value) => sum + value, 0);
    const total = areaQuestions.length;
    const answered = answeredValues.length;
    const average = answered === 0 ? 0 : Number((score / answered).toFixed(1));
    const percentage = total === 0 ? 0 : Math.round((score / (total * 5)) * 100);

    return {
      area: area.key,
      label: area.label,
      answered,
      total,
      score,
      average,
      percentage,
    };
  });

  const totalAnswered = Object.keys(answers).length;
  const totalQuestions = questions.length;
  const totalScore = Object.values(answers).reduce((sum, value) => sum + value, 0);
  const overallAverage = totalAnswered === 0 ? 0 : Number((totalScore / totalAnswered).toFixed(1));
  const overallScore = totalQuestions === 0 ? 0 : Math.round((totalScore / (totalQuestions * 5)) * 100);
  const completion = totalQuestions === 0 ? 0 : Math.round((totalAnswered / totalQuestions) * 100);

  return {
    overallScore,
    overallAverage,
    completion,
    areaScores,
  };
}
