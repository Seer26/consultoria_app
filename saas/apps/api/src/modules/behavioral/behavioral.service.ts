import { randomUUID } from 'node:crypto';
import type { AuthTokenPayload } from '../auth/auth.types';
import { BehavioralRepository } from './behavioral.repository';
import type { BehavioralAssessment, BehavioralAssessmentSummary, BehavioralListFilters, BehavioralUser } from './behavioral.types';
import type { BehavioralAnswer, BehavioralDimension, BehavioralQuestion, BehavioralResult } from './behavioral.types';

const DIMENSIONS: BehavioralDimension[] = ['EXECUTOR', 'COMUNICADOR', 'PLANEJADOR', 'ANALITICO'];

export function calculateBehavioralResult(
  questions: readonly BehavioralQuestion[],
  answers: readonly Pick<BehavioralAnswer, 'questionId' | 'value'>[],
): BehavioralResult {
  const version = questions[0]?.questionnaireVersion;
  if (questions.length !== 20 || !Number.isInteger(version) || version! < 1
    || new Set(questions.map((q) => q.id)).size !== 20
    || questions.some((q) => q.questionnaireVersion !== version || !q.active
      || !DIMENSIONS.includes(q.dimension) || typeof q.isReverse !== 'boolean')
    || DIMENSIONS.some((dimension) => questions.filter((q) => q.dimension === dimension).length !== 5)) {
    throw new Error('BEHAVIORAL_INVALID_CATALOG');
  }
  if (answers.length !== 20) throw new Error('BEHAVIORAL_INCOMPLETE_ANSWERS');
  const values = new Map<string, number>();
  for (const answer of answers) {
    if (!Number.isInteger(answer.value) || answer.value < 1 || answer.value > 5) {
      throw new Error('BEHAVIORAL_INVALID_ANSWER');
    }
    if (values.has(answer.questionId) || !questions.some((q) => q.id === answer.questionId)) {
      throw new Error('BEHAVIORAL_INVALID_ANSWERS');
    }
    values.set(answer.questionId, answer.value);
  }
  const scores = DIMENSIONS.map((dimension) => {
    const sum = questions.filter((q) => q.dimension === dimension).reduce((total, q) => {
      const value = values.get(q.id)!;
      return total + (q.isReverse ? 6 - value : value);
    }, 0);
    return Math.round(((sum - 5) / 20) * 100);
  });
  const max = Math.max(...scores);
  return {
    executorScore: scores[0], comunicadorScore: scores[1], planejadorScore: scores[2], analiticoScore: scores[3],
    predominantDimension: scores.filter((score) => score === max).length === 1 ? DIMENSIONS[scores.indexOf(max)] : null,
  };
}

export class BehavioralService {
  constructor(private readonly repository: BehavioralRepository) {}

  async startOrResume(auth: AuthTokenPayload): Promise<BehavioralAssessmentSummary> {
    return this.repository.transaction(async () => {
      const actor = await this.respondent(auth, true);
      let assessment = await this.repository.findCurrent(actor.id);
      if (assessment && assessment.companyId !== actor.companyId) throw new Error('FORBIDDEN');
      if (!assessment) {
        const version = await this.repository.activeVersion();
        if (version === null) throw new Error('BEHAVIORAL_CATALOG_NOT_FOUND');
        const now = new Date().toISOString();
        assessment = { id: randomUUID(), companyId: actor.companyId!, userId: actor.id,
          status: 'IN_PROGRESS', questionnaireVersion: version, startedAt: now, createdAt: now, completedAt: null };
        await this.repository.createAssessment(assessment);
      }
      return this.summary(assessment);
    });
  }

  async getQuestions(auth: AuthTokenPayload, assessmentId: string) {
    const actor = await this.respondent(auth);
    const assessment = await this.ownAssessment(actor, assessmentId);
    return {
      assessment: await this.summary(assessment),
      questions: (await this.repository.questions(assessment.questionnaireVersion)).map(({ id, text, position }) => ({ id, text, position })),
      answers: (await this.repository.answers(assessment.id)).map(({ questionId, value }) => ({ questionId, value })),
    };
  }

  async saveAnswer(auth: AuthTokenPayload, assessmentId: string, questionId: string, value: unknown) {
    return this.repository.transaction(async () => {
      const actor = await this.respondent(auth, true);
      const assessment = await this.ownAssessment(actor, assessmentId, true);
      if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 5) {
        throw new Error('BEHAVIORAL_INVALID_ANSWER');
      }
      const questions = await this.repository.questions(assessment.questionnaireVersion);
      if (!questions.some((q) => q.id === questionId)) throw new Error('BEHAVIORAL_QUESTION_NOT_FOUND');
      const now = new Date().toISOString();
      await this.repository.saveAnswer({ id: randomUUID(), assessmentId, questionId, value, createdAt: now, updatedAt: now });
      return { assessmentId, questionId, value };
    });
  }

  async complete(auth: AuthTokenPayload, assessmentId: string) {
    return this.repository.transaction(async () => {
      const actor = await this.respondent(auth, true);
      const assessment = await this.ownAssessment(actor, assessmentId, true);
      const questions = await this.repository.questions(assessment.questionnaireVersion);
      const answers = await this.repository.answers(assessmentId);
      const result = calculateBehavioralResult(questions, answers);
      const completedAt = new Date().toISOString();
      await this.repository.storeCompletion({ ...result, assessmentId, calculatedAt: completedAt });
      return { id: assessmentId, status: 'COMPLETED' as const, completedAt };
    });
  }

  async listCompanyAssessments(auth: AuthTokenPayload, companyId: string, filters: BehavioralListFilters = {}) {
    await this.adminCompany(auth, companyId);
    if (filters.status !== undefined && filters.status !== 'IN_PROGRESS' && filters.status !== 'COMPLETED') {
      throw new Error('BEHAVIORAL_INVALID_STATUS');
    }
    if (filters.userId !== undefined) await this.companyUser(companyId, filters.userId);
    return this.repository.list(companyId, filters);
  }

  async getHistory(auth: AuthTokenPayload, companyId: string, userId: string) {
    await this.adminCompany(auth, companyId);
    await this.companyUser(companyId, userId);
    return this.repository.list(companyId, { userId });
  }

  async getAdminResult(auth: AuthTokenPayload, companyId: string, assessmentId: string) {
    await this.adminCompany(auth, companyId);
    const assessment = await this.repository.findAssessment(assessmentId);
    if (!assessment) throw new Error('BEHAVIORAL_ASSESSMENT_NOT_FOUND');
    if (assessment.companyId !== companyId) throw new Error('FORBIDDEN');
    const user = await this.companyUser(companyId, assessment.userId);
    if (assessment.status !== 'COMPLETED') throw new Error('BEHAVIORAL_RESULT_NOT_FOUND');
    const result = await this.repository.result(assessmentId);
    if (!result) throw new Error('BEHAVIORAL_RESULT_NOT_FOUND');
    return { assessment, user: { id: user.id, name: user.name, role: user.role }, result,
      questions: await this.repository.questions(assessment.questionnaireVersion, false),
      answers: await this.repository.answers(assessmentId) };
  }

  private async actor(auth: AuthTokenPayload, lock = false): Promise<BehavioralUser> {
    const actor = await this.repository.findUser(auth.userId, lock);
    if (!actor) throw new Error('USER_NOT_FOUND');
    if (actor.status !== 'ACTIVE') throw new Error('INACTIVE_USER');
    if (actor.role !== auth.role || actor.companyId !== auth.companyId) throw new Error('FORBIDDEN');
    return actor;
  }

  private async respondent(auth: AuthTokenPayload, lock = false): Promise<BehavioralUser> {
    const actor = await this.actor(auth, lock);
    if (actor.role !== 'OWNER' && actor.role !== 'EMPLOYEE') throw new Error('BEHAVIORAL_RESPONDENT_REQUIRED');
    if (!actor.companyId) throw new Error('COMPANY_ID_REQUIRED');
    if (!(await this.repository.companyExists(actor.companyId))) throw new Error('COMPANY_NOT_FOUND');
    return actor;
  }

  private async ownAssessment(actor: BehavioralUser, id: string, lock = false): Promise<BehavioralAssessment> {
    const assessment = await this.repository.findAssessment(id, lock);
    if (!assessment) throw new Error('BEHAVIORAL_ASSESSMENT_NOT_FOUND');
    if (assessment.userId !== actor.id || assessment.companyId !== actor.companyId) throw new Error('FORBIDDEN');
    if (assessment.status !== 'IN_PROGRESS') throw new Error('BEHAVIORAL_ASSESSMENT_COMPLETED');
    return assessment;
  }

  private async adminCompany(auth: AuthTokenPayload, companyId: string) {
    const actor = await this.actor(auth);
    if (actor.role !== 'ADMIN') throw new Error('BEHAVIORAL_ADMIN_REQUIRED');
    if (!(await this.repository.companyExists(companyId))) throw new Error('COMPANY_NOT_FOUND');
  }

  private async companyUser(companyId: string, userId: string): Promise<BehavioralUser> {
    const user = await this.repository.findUser(userId);
    if (!user) throw new Error('USER_NOT_FOUND');
    if (user.companyId !== companyId) throw new Error('FORBIDDEN');
    return user;
  }

  private async summary(assessment: BehavioralAssessment): Promise<BehavioralAssessmentSummary> {
    return { ...assessment, answeredCount: (await this.repository.answers(assessment.id)).length,
      totalQuestions: (await this.repository.questions(assessment.questionnaireVersion)).length };
  }
}
