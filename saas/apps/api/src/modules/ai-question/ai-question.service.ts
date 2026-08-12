import { env } from '../../config/env';
import { audit } from '../../shared/audit';
import type { AuthTokenPayload } from '../auth/auth.types';
import { EntitlementsRepository } from '../entitlements/entitlements.repository';
import { EntitlementsService } from '../entitlements/entitlements.service';
import { ResearchRepository } from '../research/research.repository';
import type {
  AiConsultingAnalysis,
  AiConsultingRecommendation,
  CompanyRecord,
  ResearchAnswerRecord,
  ResearchSubmissionRecord,
} from '../research/research.types';
import { createAiProvider } from './ai-question.client';
import {
  adaptiveQuestionInstructions,
  buildAdaptiveQuestionInput,
  buildConsultingAnalysisInput,
  consultingAnalysisInstructions,
} from './ai-question.prompt';
import type { AdaptiveQuestionResult, AiProvider } from './ai-question.types';

type ResearchReader = Pick<ResearchRepository,
  'findUserById' | 'findCompanyById' | 'findSubmissionById' |
  'listAnswersBySubmissionId' | 'saveAiAnalysis'>;

const inFlight = new Map<string, Promise<unknown>>();

function normalizeQuestion(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function safeText(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  return text.length > 0 && text.length <= max ? text : null;
}

function validateAdaptive(value: unknown, previous: ResearchAnswerRecord[]): Omit<AdaptiveQuestionResult, 'source'> | null {
  if (!value || typeof value !== 'object') return null;
  const item = value as Record<string, unknown>;
  const question = safeText(item.question, 240);
  const pillar = safeText(item.pillar, 80);
  const reason = safeText(item.reason, 300);
  if (!question || question.length < 8 || !pillar || !reason || typeof item.shouldContinue !== 'boolean') return null;
  const normalized = normalizeQuestion(question);
  if (previous.some((answer) => {
    const prior = normalizeQuestion(answer.question);
    return prior === normalized || (prior.length > 20 && (prior.includes(normalized) || normalized.includes(prior)));
  })) return null;
  if (/senha|password|cart[aã]o|cpf|cnpj|documento|token|segredo|credencial/i.test(question)) return null;
  return { question, pillar, reason, shouldContinue: item.shouldContinue };
}

function validateAnalysis(value: unknown): Omit<AiConsultingAnalysis, 'generatedAt'> | null {
  if (!value || typeof value !== 'object') return null;
  const item = value as Record<string, unknown>;
  const executiveSummary = safeText(item.executiveSummary, 600);
  const strings = (candidate: unknown) => Array.isArray(candidate)
    ? candidate.map((entry) => safeText(entry, 600)).filter((entry): entry is string => Boolean(entry)).slice(0, 5)
    : [];
  const strengths = strings(item.strengths);
  const attentionPoints = strings(item.attentionPoints);
  const recommendations = Array.isArray(item.recommendations)
    ? item.recommendations.map((entry): AiConsultingRecommendation | null => {
        if (!entry || typeof entry !== 'object') return null;
        const rec = entry as Record<string, unknown>;
        const title = safeText(rec.title, 160);
        const description = safeText(rec.description, 600);
        const pillar = safeText(rec.pillar, 80);
        const priority = rec.priority;
        if (!title || !description || !pillar || !['HIGH', 'MEDIUM', 'LOW'].includes(String(priority))) return null;
        return { title, description, pillar, priority: priority as AiConsultingRecommendation['priority'] };
      }).filter((entry): entry is AiConsultingRecommendation => entry !== null).slice(0, 6)
    : [];
  if (!executiveSummary || strengths.length === 0 || attentionPoints.length === 0 || recommendations.length === 0) return null;
  return { executiveSummary, strengths, attentionPoints, recommendations };
}

export class AiQuestionService {
  constructor(
    private readonly provider: AiProvider | null = null,
    private readonly repository: ResearchReader = new ResearchRepository(),
    private readonly entitlementsService = new EntitlementsService(new EntitlementsRepository()),
  ) {}

  async generateNextQuestion(auth: AuthTokenPayload, submissionId: string): Promise<AdaptiveQuestionResult> {
    const context = await this.authorizedContext(auth, submissionId, 'IN_PROGRESS');
    if (context.answers.length >= env.aiMaxQuestions) {
      return this.terminalResult('Limite seguro de perguntas atingido.');
    }
    const fallback = this.fallbackQuestion(context.answers);
    if (!env.aiEnabled || !env.aiProviderKey) return fallback;

    return this.singleFlight(`question:${submissionId}`, async () => {
      await this.entitlementsService.assertCanUseFeature(context.submission.companyId, 'AI_QUESTIONS_MONTHLY');
      const started = Date.now();
      audit('ai_request_started', { operation: 'adaptive_question', companyId: context.submission.companyId, userId: auth.userId });
      try {
        const provider = this.provider ?? createAiProvider();
        const raw = await provider.generateNextQuestion({
          instructions: adaptiveQuestionInstructions,
          input: buildAdaptiveQuestionInput(context),
        });
        const parsed = validateAdaptive(raw, context.answers);
        if (!parsed) throw new Error('AI_INVALID_RESPONSE');
        await this.entitlementsService.recordUsage(context.submission.companyId, 'AI_QUESTIONS_MONTHLY');
        audit('ai_request_succeeded', { operation: 'adaptive_question', companyId: context.submission.companyId, durationMs: Date.now() - started });
        return {
          ...parsed,
          shouldContinue: this.shouldContinue(context.answers, parsed.shouldContinue),
          source: provider.name,
        };
      } catch (error) {
        audit('ai_error', { operation: 'adaptive_question', companyId: context.submission.companyId, durationMs: Date.now() - started, category: this.errorCategory(error) });
        return fallback;
      }
    });
  }

  async generateAnalysis(auth: AuthTokenPayload, submissionId: string, retry = false): Promise<AiConsultingAnalysis> {
    const context = await this.authorizedContext(auth, submissionId, 'COMPLETED');
    if (context.submission.aiAnalysis && !retry) return context.submission.aiAnalysis;
    if (!env.aiEnabled) throw new Error('AI_DISABLED');
    if (!env.aiProviderKey) throw new Error('AI_API_KEY_NOT_CONFIGURED');

    return this.singleFlight(`analysis:${submissionId}`, async () => {
      await this.entitlementsService.assertCanUseFeature(context.submission.companyId, 'AI_QUESTIONS_MONTHLY');
      const officialScore = context.submission.overallScore;
      const started = Date.now();
      audit('ai_request_started', { operation: 'consulting_analysis', companyId: context.submission.companyId, userId: auth.userId });
      try {
        const provider = this.provider ?? createAiProvider();
        const raw = await provider.generateConsultingAnalysis({
          instructions: consultingAnalysisInstructions,
          input: buildConsultingAnalysisInput(context),
        });
        const parsed = validateAnalysis(raw);
        if (!parsed) throw new Error('AI_INVALID_RESPONSE');
        const analysis = { ...parsed, generatedAt: new Date().toISOString() };
        if (context.submission.overallScore !== officialScore) throw new Error('AI_SCORE_MUTATION_DETECTED');
        await this.repository.saveAiAnalysis(submissionId, analysis);
        await this.entitlementsService.recordUsage(context.submission.companyId, 'AI_QUESTIONS_MONTHLY');
        audit('ai_request_succeeded', { operation: 'consulting_analysis', companyId: context.submission.companyId, durationMs: Date.now() - started });
        return analysis;
      } catch (error) {
        audit('ai_error', { operation: 'consulting_analysis', companyId: context.submission.companyId, durationMs: Date.now() - started, category: this.errorCategory(error) });
        throw new Error(this.publicError(error));
      }
    });
  }

  private async authorizedContext(auth: AuthTokenPayload, submissionId: string, status: ResearchSubmissionRecord['status']) {
    if (!submissionId?.trim()) throw new Error('INVALID_SUBMISSION_ID');
    const actor = await this.repository.findUserById(auth.userId);
    if (!actor) throw new Error('USER_NOT_FOUND');
    if (actor.status !== 'ACTIVE') throw new Error('INACTIVE_USER');
    if (actor.role === 'ADMIN') throw new Error('ADMIN_RESEARCH_READ_ONLY');
    const submission = await this.repository.findSubmissionById(submissionId);
    if (!submission) throw new Error('RESEARCH_SUBMISSION_NOT_FOUND');
    if (!actor.companyId || submission.companyId !== actor.companyId) throw new Error('FORBIDDEN');
    if (actor.role === 'EMPLOYEE' && submission.userId !== actor.id) throw new Error('FORBIDDEN');
    if (submission.status !== status) throw new Error(status === 'COMPLETED' ? 'AI_ANALYSIS_REQUIRES_COMPLETED_RESEARCH' : 'RESEARCH_ALREADY_COMPLETED');
    const company = await this.repository.findCompanyById(submission.companyId);
    if (!company) throw new Error('COMPANY_NOT_FOUND');
    const answers = await this.repository.listAnswersBySubmissionId(submission.id);
    return { company, submission, answers };
  }

  private fallbackQuestion(answers: ResearchAnswerRecord[]): AdaptiveQuestionResult {
    const candidates = [
      ['Financeiro', 'Como a empresa acompanha o fluxo de caixa e os principais indicadores financeiros?'],
      ['Processos', 'Quais processos hoje mais dependem de controles manuais ou conhecimento informal?'],
      ['Comercial', 'Como as oportunidades comerciais são acompanhadas até o fechamento?'],
      ['Pessoas/RH', 'Como responsabilidades e metas são comunicadas e acompanhadas pela equipe?'],
      ['Estrategia', 'Quais metas prioritárias orientam as decisões da empresa neste período?'],
    ];
    const previous = new Set(answers.map((item) => normalizeQuestion(item.question)));
    const selected = candidates.find(([, question]) => !previous.has(normalizeQuestion(question))) ?? candidates[candidates.length - 1];
    return {
      question: selected[1], pillar: selected[0],
      reason: 'Pergunta segura do roteiro consultivo.',
      shouldContinue: answers.length < env.aiMaxQuestions,
      source: 'fallback',
    };
  }

  private shouldContinue(answers: ResearchAnswerRecord[], providerDecision: boolean): boolean {
    const count = answers.length;
    if (count >= env.aiMaxQuestions) return false;
    if (count < env.aiMinQuestions) return true;
    const coveredPillars = new Set(
      answers.map((answer) => answer.pillar?.trim().toLowerCase()).filter(Boolean),
    ).size;
    if (coveredPillars < env.aiMinPillars) return true;
    return providerDecision;
  }

  private terminalResult(reason: string): AdaptiveQuestionResult {
    return {
      question: 'A pesquisa possui contexto suficiente para ser finalizada.',
      pillar: 'Encerramento', reason, shouldContinue: false, source: 'fallback',
    };
  }

  private errorCategory(error: unknown): string {
    const code = error instanceof Error ? error.message : '';
    return ['AI_TIMEOUT', 'AI_RATE_LIMITED', 'AI_QUOTA_UNAVAILABLE', 'AI_AUTHENTICATION_FAILED', 'AI_INVALID_RESPONSE'].includes(code)
      ? code : 'AI_PROVIDER_UNAVAILABLE';
  }

  private publicError(error: unknown): string {
    const category = this.errorCategory(error);
    if (category === 'AI_RATE_LIMITED' || category === 'AI_QUOTA_UNAVAILABLE') return category;
    return category === 'AI_TIMEOUT' ? 'AI_TIMEOUT' : 'AI_ANALYSIS_UNAVAILABLE';
  }

  private async singleFlight<T>(key: string, operation: () => Promise<T>): Promise<T> {
    const existing = inFlight.get(key) as Promise<T> | undefined;
    if (existing) return existing;
    const promise = operation().finally(() => inFlight.delete(key));
    inFlight.set(key, promise);
    return promise;
  }
}
