import type {
  Company,
  DiagnosisInsight,
  DiagnosisMaturityLevel,
  DiagnosisQuestionAnalysis,
  DiagnosisResult,
  DiagnosisSubmissionInput,
  PillarScore,
} from '@consultoria/domain';
import { pillars } from '@consultoria/domain';

import { buildActionPlan } from './diagnosis.rules';
import { defaultQuestionnaire } from './diagnosis.questionnaire';
import { DiagnosisRepository } from './diagnosis.repository';

const round = (value: number): number => Math.round(value * 10) / 10;

function getMaturityLevel(percentage: number): DiagnosisMaturityLevel {
  if (percentage < 40) {
    return 'critical';
  }
  if (percentage < 60) {
    return 'attention';
  }
  if (percentage < 80) {
    return 'structured';
  }
  return 'optimized';
}

function getInsightSummary(label: string, maturityLevel: DiagnosisMaturityLevel, percentage: number): string {
  const map: Record<DiagnosisMaturityLevel, string> = {
    critical: `${label} esta em nivel critico e exige intervencao imediata.`,
    attention: `${label} precisa de ajustes de gestao para ganhar consistencia.`,
    structured: `${label} tem base estruturada, mas ainda possui espaco para evolucao.`,
    optimized: `${label} esta bem desenvolvido e pode servir de referencia interna.`,
  };

  return `${map[maturityLevel]} Score atual: ${percentage}%.`;
}

function getExecutiveSummary(
  overallPercentage: number,
  weaknesses: DiagnosisInsight[],
  strengths: DiagnosisInsight[],
): DiagnosisResult['executiveSummary'] {
  const maturityLevel = getMaturityLevel(overallPercentage);
  const primaryBottleneck = weaknesses[0];
  const mainStrength = strengths[0];

  let summary = `A empresa apresenta maturidade ${maturityLevel} com score geral de ${overallPercentage}%.`;

  if (primaryBottleneck) {
    summary += ` O principal gargalo esta em ${primaryBottleneck.label}.`;
  }

  if (mainStrength) {
    summary += ` O maior ponto forte atual esta em ${mainStrength.label}.`;
  }

  return {
    overallPercentage,
    maturityLevel,
    primaryBottleneck,
    mainStrength,
    summary,
  };
}

export class DiagnosisService {
  constructor(private readonly repository: DiagnosisRepository) {}

  getQuestionnaire() {
    return defaultQuestionnaire;
  }

  async submit(input: DiagnosisSubmissionInput): Promise<DiagnosisResult> {
    const company: Company = {
      id: `company-${Date.now()}`,
      ...input.company,
    };
    const submissionId = `submission-${Date.now()}`;
    const questionMap = Object.fromEntries(defaultQuestionnaire.questions.map((question) => [question.id, question]));
    const questionAnalysis: DiagnosisQuestionAnalysis[] = input.answers
      .map((answer) => {
        const question = questionMap[answer.questionId];

        if (!question) {
          return null;
        }

        return {
          questionId: question.id,
          pillar: question.pillar,
          title: question.title,
          answerValue: answer.value,
          weight: question.weight,
          weightedScore: answer.value * question.weight,
          maxWeightedScore: 5 * question.weight,
          gap: (5 - answer.value) * question.weight,
        };
      })
      .filter((item): item is DiagnosisQuestionAnalysis => item !== null);

    const scores: PillarScore[] = pillars.map((pillar) => {
      const pillarQuestions = defaultQuestionnaire.questions.filter((question) => question.pillar === pillar.key);
      const pillarAnalysis = questionAnalysis.filter((answer) => answer.pillar === pillar.key);
      const score = pillarAnalysis.reduce((sum, answer) => sum + answer.weightedScore, 0);
      const maxScore = pillarQuestions.reduce((sum, question) => sum + 5 * question.weight, 0);
      const percentage = maxScore === 0 ? 0 : round((score / maxScore) * 100);
      const averageAnswer =
        pillarAnalysis.length === 0
          ? 0
          : round(pillarAnalysis.reduce((sum, answer) => sum + answer.answerValue, 0) / pillarAnalysis.length);

      return {
        pillar: pillar.key,
        label: pillar.label,
        score,
        maxScore,
        percentage,
        maturityLevel: getMaturityLevel(percentage),
        averageAnswer,
      };
    });

    const strengths: DiagnosisInsight[] = [...scores]
      .filter((item) => item.percentage >= 70)
      .sort((left, right) => right.percentage - left.percentage)
      .slice(0, 2)
      .map(({ pillar, label, percentage, maturityLevel }) => ({
        pillar,
        label,
        percentage,
        maturityLevel,
        summary: getInsightSummary(label, maturityLevel, percentage),
      }));

    const weaknesses: DiagnosisInsight[] = [...scores]
      .filter((item) => item.percentage <= 60)
      .sort((left, right) => left.percentage - right.percentage)
      .slice(0, 3)
      .map(({ pillar, label, percentage, maturityLevel }) => ({
        pillar,
        label,
        percentage,
        maturityLevel,
        summary: getInsightSummary(label, maturityLevel, percentage),
      }));

    const overallPercentage =
      scores.length === 0 ? 0 : round(scores.reduce((sum, item) => sum + item.percentage, 0) / scores.length);
    const executiveSummary = getExecutiveSummary(overallPercentage, weaknesses, strengths);
    const actionPlan = buildActionPlan(
      defaultQuestionnaire,
      input.answers,
      weaknesses,
      questionAnalysis,
      submissionId,
    );

    await this.repository.saveCompany(company);
    await this.repository.saveSubmission({
      submissionId,
      companyId: company.id,
      questionnaireId: defaultQuestionnaire.id,
    });
    await this.repository.saveAnswers(
      submissionId,
      input.answers,
      Object.fromEntries(
        defaultQuestionnaire.questions.map((question) => [
          question.id,
          question.pillar,
        ]),
      ),
    );
    await this.repository.saveActionPlan(submissionId, actionPlan);

    return {
      submissionId,
      company,
      executiveSummary,
      scores,
      strengths,
      weaknesses,
      questionAnalysis,
      actionPlan,
    };
  }
}
