import { randomUUID } from 'node:crypto';
const POSITIVE_HINTS = [
    'temos controle',
    'organizado',
    'organizada',
    'bom',
    'boa',
    'boas',
    'acompanho',
    'processo definido',
    'processos definidos',
    'satisfatorio',
    'saudavel',
    'padronizado',
    'padronizada',
    'consistente',
    'previsivel',
    'claro',
    'clareza',
    'eficiente',
    'eficaz',
];
const NEGATIVE_HINTS = [
    'nao temos',
    'ruim',
    'desorganizado',
    'desorganizada',
    'sem controle',
    'problema',
    'problemas',
    'dificuldade',
    'dificuldades',
    'baixo',
    'baixa',
    'atraso',
    'atrasos',
    'caotico',
    'falho',
    'falhas',
    'inexistente',
    'pouco previsivel',
    'sem processo',
    'sem rotina',
    'nao acompanho',
];
const PILLAR_ALIASES = {
    financeiro: 'Financeiro',
    financas: 'Financeiro',
    processos: 'Processos',
    processo: 'Processos',
    pessoas: 'Pessoas/RH',
    rh: 'Pessoas/RH',
    'recursos humanos': 'Pessoas/RH',
    marketing: 'Marketing',
    comercial: 'Comercial',
    vendas: 'Comercial',
    estrategia: 'Estrategia',
    operacional: 'Operacional',
    operacoes: 'Operacional',
};
export class ResearchService {
    constructor(repository) {
        this.repository = repository;
    }
    async createSubmission(auth, input) {
        const context = this.getAccessContext(auth);
        this.ensureActiveUser(context);
        const respondentRole = input.respondentRole?.trim();
        const department = input.department?.trim();
        if (!respondentRole || !department) {
            throw new Error('INVALID_RESEARCH_SUBMISSION_PAYLOAD');
        }
        const companyId = this.resolveCompanyId(context, input.companyId);
        const userId = this.resolveTargetUserId(context, input.userId);
        const targetUser = this.repository.findUserById(userId);
        if (!targetUser) {
            throw new Error('USER_NOT_FOUND');
        }
        if (targetUser.status !== 'ACTIVE') {
            throw new Error('INACTIVE_USER');
        }
        if (context.actor.role === 'ADMIN' &&
            targetUser.role !== 'ADMIN' &&
            targetUser.companyId !== companyId) {
            throw new Error('USER_COMPANY_MISMATCH');
        }
        const company = this.repository.findCompanyById(companyId);
        if (!company) {
            throw new Error('COMPANY_NOT_FOUND');
        }
        const now = new Date().toISOString();
        return this.repository.createSubmission({
            id: randomUUID(),
            companyId,
            userId,
            questionnaireId: 'chat-research',
            submissionType: 'RESEARCH',
            respondentRole,
            department,
            status: 'IN_PROGRESS',
            overallScore: null,
            summary: null,
            criticalPoints: [],
            opportunities: [],
            recommendations: [],
            nextSteps: [],
            pillarScores: [],
            createdAt: now,
            updatedAt: now,
            completedAt: null,
        });
    }
    async addAnswer(auth, submissionId, input) {
        const context = this.getAccessContext(auth);
        this.ensureActiveUser(context);
        const submission = this.getAuthorizedSubmission(context, submissionId, true);
        const question = input.question?.trim();
        const answer = input.answer?.trim();
        if (!question || !answer) {
            throw new Error('INVALID_RESEARCH_ANSWER_PAYLOAD');
        }
        const now = new Date().toISOString();
        const sequence = this.repository.getNextAnswerSequence(submission.id);
        const normalizedScore = typeof input.score === 'number' && Number.isFinite(input.score) ? input.score : null;
        const created = this.repository.createAnswer({
            id: randomUUID(),
            submissionId: submission.id,
            questionId: `research-question-${sequence}`,
            question,
            answer,
            pillar: input.pillar?.trim() || submission.department,
            value: normalizedScore,
            score: normalizedScore,
            createdAt: now,
        });
        this.repository.updateSubmission({
            ...submission,
            updatedAt: now,
        });
        return created;
    }
    async completeSubmission(auth, submissionId, input) {
        const context = this.getAccessContext(auth);
        this.ensureActiveUser(context);
        const submission = this.getAuthorizedSubmission(context, submissionId, true);
        const answers = this.repository.listAnswersBySubmissionId(submission.id);
        if (answers.length === 0) {
            throw new Error('RESEARCH_ANSWERS_REQUIRED');
        }
        const analysis = this.buildInitialResult(submission, answers);
        const now = new Date().toISOString();
        const updated = this.repository.updateSubmission({
            ...submission,
            status: 'COMPLETED',
            overallScore: analysis.overallScore,
            summary: input.summary?.trim() || analysis.summary,
            criticalPoints: analysis.criticalPoints,
            opportunities: analysis.opportunities,
            recommendations: analysis.recommendations,
            nextSteps: analysis.nextSteps,
            pillarScores: analysis.pillarScores,
            updatedAt: now,
            completedAt: now,
        });
        return this.buildSubmissionDetails(updated, answers);
    }
    listSubmissions(auth, filters) {
        const context = this.getAccessContext(auth);
        this.ensureActiveUser(context);
        if (context.actor.role === 'ADMIN') {
            return this.repository.listResearchSubmissions({
                companyId: filters.companyId?.trim() || undefined,
            });
        }
        if (!context.actor.companyId) {
            throw new Error('COMPANY_ID_REQUIRED');
        }
        if (context.actor.role === 'OWNER') {
            return this.repository.listResearchSubmissions({
                companyId: context.actor.companyId,
            });
        }
        return this.repository.listResearchSubmissions({
            companyId: context.actor.companyId,
            userId: context.actor.id,
        });
    }
    getSubmissionById(auth, submissionId) {
        const context = this.getAccessContext(auth);
        this.ensureActiveUser(context);
        const submission = this.getAuthorizedSubmission(context, submissionId, false);
        const answers = this.repository.listAnswersBySubmissionId(submission.id);
        return this.buildSubmissionDetails(submission, answers);
    }
    buildSubmissionDetails(submission, answers) {
        const company = this.repository.findCompanyById(submission.companyId);
        const user = this.repository.findUserById(submission.userId);
        return {
            id: submission.id,
            status: submission.status,
            overallScore: submission.overallScore,
            summary: submission.summary,
            criticalPoints: submission.criticalPoints,
            opportunities: submission.opportunities,
            recommendations: submission.recommendations,
            nextSteps: submission.nextSteps,
            pillarScores: submission.pillarScores,
            respondentRole: submission.respondentRole,
            department: submission.department,
            createdAt: submission.createdAt,
            updatedAt: submission.updatedAt,
            completedAt: submission.completedAt,
            company,
            user: user
                ? {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    companyId: user.companyId,
                    status: user.status,
                }
                : null,
            answers,
        };
    }
    buildInitialResult(submission, answers) {
        const normalizedAnswers = answers.map((answer) => {
            const pillar = this.normalizePillar(answer.pillar ?? submission.department);
            const score = this.estimateAnswerScore(answer);
            return { ...answer, pillar, score };
        });
        const grouped = new Map();
        for (const answer of normalizedAnswers) {
            const current = grouped.get(answer.pillar) ?? [];
            current.push(answer);
            grouped.set(answer.pillar, current);
        }
        const pillarScores = [...grouped.entries()]
            .map(([pillar, items]) => {
            const average = items.reduce((sum, item) => sum + (item.score ?? 0), 0) / items.length;
            const score = Math.round(average * 10) / 10;
            return {
                pillar,
                score,
                answersCount: items.length,
                maturity: this.getMaturity(score),
            };
        })
            .sort((left, right) => left.score - right.score);
        const overallScore = pillarScores.length === 0
            ? null
            : Math.round((pillarScores.reduce((sum, item) => sum + item.score, 0) / pillarScores.length) * 10) / 10;
        const weakestPillars = pillarScores.slice(0, 3);
        const strongestPillars = [...pillarScores]
            .sort((left, right) => right.score - left.score)
            .slice(0, 3);
        const criticalPoints = weakestPillars.map((item) => `${item.pillar} apresenta baixa maturidade inicial, com score ${item.score.toFixed(1)}.`);
        const opportunities = strongestPillars.map((item) => `${item.pillar} mostra base aproveitavel para melhorias futuras, com score ${item.score.toFixed(1)}.`);
        const recommendations = weakestPillars.map((item) => this.buildRecommendation(item.pillar));
        const nextSteps = this.buildNextSteps(weakestPillars, strongestPillars);
        return {
            overallScore,
            summary: this.buildSummary(overallScore, weakestPillars, strongestPillars),
            criticalPoints,
            opportunities,
            recommendations,
            nextSteps,
            pillarScores,
        };
    }
    estimateAnswerScore(answer) {
        if (typeof answer.score === 'number' && Number.isFinite(answer.score)) {
            return this.normalizeNumericScore(answer.score);
        }
        const text = this.normalizeText(answer.answer);
        let score = 55;
        for (const hint of POSITIVE_HINTS) {
            if (text.includes(hint)) {
                score += 10;
            }
        }
        for (const hint of NEGATIVE_HINTS) {
            if (text.includes(hint)) {
                score -= 12;
            }
        }
        if (text.length > 180) {
            score += 4;
        }
        else if (text.length < 40) {
            score -= 4;
        }
        return Math.max(0, Math.min(100, score));
    }
    normalizeNumericScore(score) {
        if (score <= 5) {
            return Math.max(0, Math.min(100, score * 20));
        }
        return Math.max(0, Math.min(100, score));
    }
    normalizeText(value) {
        return value
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase();
    }
    normalizePillar(value) {
        const normalized = this.normalizeText(value).trim();
        return PILLAR_ALIASES[normalized] ?? value.trim();
    }
    getMaturity(score) {
        if (score < 40) {
            return 'critical';
        }
        if (score < 60) {
            return 'attention';
        }
        if (score < 80) {
            return 'intermediate';
        }
        return 'good';
    }
    buildRecommendation(pillar) {
        return `Estruturar um plano inicial para ${pillar.toLowerCase()}, com rotina de acompanhamento, responsavel definido e indicadores minimos.`;
    }
    buildNextSteps(weakestPillars, strongestPillars) {
        const steps = [
            ...weakestPillars.map((item) => `Priorizar um diagnostico detalhado de ${item.pillar}.`),
            ...strongestPillars
                .slice(0, 2)
                .map((item) => `Aproveitar as boas praticas de ${item.pillar} para apoiar outras areas.`),
        ];
        return steps.slice(0, 5);
    }
    buildSummary(overallScore, weakestPillars, strongestPillars) {
        const maturity = overallScore == null
            ? 'inicial'
            : overallScore < 45
                ? 'inicial'
                : overallScore < 70
                    ? 'intermediaria'
                    : 'boa';
        const critical = weakestPillars.length === 0
            ? 'sem pontos criticos relevantes nesta primeira leitura'
            : weakestPillars.map((item) => item.pillar).join(', ');
        const opportunities = strongestPillars.length === 0
            ? 'sem oportunidades claras nesta etapa'
            : strongestPillars.map((item) => item.pillar).join(', ');
        return `A empresa apresenta maturidade ${maturity} em seus processos. Os principais pontos de atencao estao em ${critical}. As oportunidades mais evidentes estao em ${opportunities}.`;
    }
    getAccessContext(auth) {
        const actor = this.repository.findUserById(auth.userId);
        if (!actor) {
            throw new Error('USER_NOT_FOUND');
        }
        return { auth, actor };
    }
    ensureActiveUser(context) {
        if (context.actor.status !== 'ACTIVE') {
            throw new Error('INACTIVE_USER');
        }
    }
    resolveCompanyId(context, requestedCompanyId) {
        if (context.actor.role === 'ADMIN') {
            const companyId = requestedCompanyId?.trim();
            if (!companyId) {
                throw new Error('COMPANY_ID_REQUIRED');
            }
            return companyId;
        }
        if (!context.actor.companyId) {
            throw new Error('COMPANY_ID_REQUIRED');
        }
        return context.actor.companyId;
    }
    resolveTargetUserId(context, requestedUserId) {
        if (context.actor.role === 'ADMIN') {
            return requestedUserId?.trim() || context.actor.id;
        }
        return context.actor.id;
    }
    getAuthorizedSubmission(context, submissionId, requireInProgress) {
        const submission = this.repository.findSubmissionById(submissionId);
        if (!submission) {
            throw new Error('RESEARCH_SUBMISSION_NOT_FOUND');
        }
        if (requireInProgress && submission.status !== 'IN_PROGRESS') {
            throw new Error('RESEARCH_ALREADY_COMPLETED');
        }
        if (context.actor.role === 'ADMIN') {
            return submission;
        }
        if (!context.actor.companyId || submission.companyId !== context.actor.companyId) {
            throw new Error('FORBIDDEN');
        }
        if (context.actor.role === 'EMPLOYEE' && submission.userId !== context.actor.id) {
            throw new Error('FORBIDDEN');
        }
        return submission;
    }
}
