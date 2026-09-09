import PDFDocument from 'pdfkit';

import { audit } from '../../shared/audit';
import type { AuthTokenPayload } from '../auth/auth.types';
import { EntitlementsRepository } from '../entitlements/entitlements.repository';
import { EntitlementsService } from '../entitlements/entitlements.service';
import { getDiagnosisScoreInterpretation } from '../research/score-interpretation';
import { ReportsRepository } from './reports.repository';
import type {
  ExecutiveReport,
  ExecutiveReportPdfFile,
  ReportActor,
  ReportMaturityLevel,
  ReportPillarScore,
  ReportSummary,
  ReportTask,
} from './reports.types';

function parseStringArray(value: string | null): string[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.map((item) => String(item)) : [];
  } catch {
    return [];
  }
}

function parsePillarScores(value: string | null): ReportPillarScore[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
      .map((item) => ({
        pillar: String(item.pillar ?? ''),
        score: typeof item.score === 'number' ? item.score : Number(item.score ?? 0),
        answersCount:
          typeof item.answersCount === 'number'
            ? item.answersCount
            : Number(item.answersCount ?? 0),
        maturity: item.maturity == null ? undefined : String(item.maturity),
        scoreInterpretation: getDiagnosisScoreInterpretation(
          typeof item.score === 'number' ? item.score : Number(item.score ?? 0),
        ),
      }))
      .filter((item) => item.pillar.trim().length > 0);
  } catch {
    return [];
  }
}

function roundScore(value: number | null): number | null {
  if (value == null || !Number.isFinite(value)) {
    return null;
  }

  return Math.round(value * 10) / 10;
}

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .trim();
}

export class ReportsService {
  constructor(
    private readonly repository: ReportsRepository,
    private readonly entitlementsService = new EntitlementsService(
      new EntitlementsRepository(),
    ),
  ) {}

  async listResearchReports(auth: AuthTokenPayload): Promise<ReportSummary[]> {
    const actor = await this.getActor(auth);
    this.ensureActive(actor);
    this.ensureStrategicReportAccess(actor);

    const filters =
      actor.role === 'ADMIN'
        ? {}
        : actor.role === 'EMPLOYEE'
          ? { userId: actor.id }
          : actor.companyId
            ? { companyId: actor.companyId }
            : {};

    const reports = (await this.repository.listCompletedResearchReports(filters))
      .filter((item) => actor.role === 'ADMIN' || item.diagnosis_status === 'PUBLICADO');

    return reports.map((item) => {
      const maturityLevel = this.getMaturityLevel(item.overall_score);
      return {
        submissionId: item.submission_id,
        companyId: item.company_id,
        companyName: item.company_name,
        respondentName: item.respondent_name,
        respondentRole: item.respondent_role,
        department: item.department,
        completedAt: item.completed_at,
        overallScore: roundScore(item.overall_score),
        maturityLevel,
        maturityLabel: this.getMaturityLabel(maturityLevel),
        scoreInterpretation: getDiagnosisScoreInterpretation(item.overall_score),
        actionPlanGenerated: item.action_plan_generated === 1,
      };
    });
  }

  async getExecutiveResearchReport(
    auth: AuthTokenPayload,
    submissionId: string,
  ): Promise<ExecutiveReport> {
    const actor = await this.getActor(auth);
    this.ensureActive(actor);
    this.ensureStrategicReportAccess(actor);

    const report = await this.repository.findExecutiveReportBySubmissionId(submissionId);
    if (!report) {
      throw new Error('REPORT_NOT_FOUND');
    }

    this.ensureAccess(actor, report.company_id, report.user_id);
    if (actor.role !== 'ADMIN' && report.diagnosis_status !== 'PUBLICADO') {
      throw new Error('FORBIDDEN');
    }

    if (report.status !== 'COMPLETED') {
      throw new Error('REPORT_NOT_AVAILABLE');
    }

    const maturityLevel = this.getMaturityLevel(report.overall_score);
    const tasks = (await this.repository.listTasksBySubmissionId(submissionId)).map<ReportTask>((item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      pillar: item.pillar,
      priority: item.priority,
      status: item.status,
      dueDate: item.due_date,
      responsibleUserName: item.responsible_user_name,
      responsibleUserEmail: item.responsible_user_email,
      source: item.source,
    }));

    const tasksTotal = tasks.length;
    const tasksTodo = tasks.filter((item) => item.status === 'TODO').length;
    const tasksInProgress = tasks.filter((item) => item.status === 'IN_PROGRESS').length;
    const tasksDone = tasks.filter((item) => item.status === 'DONE').length;
    const tasksCanceled = tasks.filter((item) => item.status === 'CANCELED').length;
    const now = Date.now();
    const tasksOverdue = tasks.filter((item) => {
      if (!item.dueDate || item.status === 'DONE' || item.status === 'CANCELED') {
        return false;
      }

      const dueTime = Date.parse(item.dueDate);
      return Number.isFinite(dueTime) && dueTime < now;
    }).length;

    return {
      company: {
        companyId: report.company_id,
        companyName: report.company_name,
        companyStatus: report.company_status,
      },
      research: {
        submissionId: report.submission_id,
        respondentName: report.respondent_name,
        respondentEmail: report.respondent_email,
        respondentRole: report.respondent_role,
        department: report.department,
        status: report.status,
        createdAt: report.created_at,
        completedAt: report.completed_at,
        overallScore: roundScore(report.overall_score),
        maturityLevel,
        maturityLabel: this.getMaturityLabel(maturityLevel),
        scoreInterpretation: getDiagnosisScoreInterpretation(report.overall_score),
      },
      result: {
        summary: report.summary,
        pillarScores: parsePillarScores(report.pillar_scores),
        criticalPoints: parseStringArray(report.critical_points),
        opportunities: parseStringArray(report.opportunities),
        recommendations: parseStringArray(report.recommendations),
        nextSteps: parseStringArray(report.next_steps),
      },
      actionPlan: {
        actionPlanGenerated: tasksTotal > 0,
        tasksTotal,
        tasksTodo,
        tasksInProgress,
        tasksDone,
        tasksCanceled,
        tasksOverdue,
        tasks,
      },
    };
  }

  async generateExecutiveResearchPdf(
    auth: AuthTokenPayload,
    submissionId: string,
  ): Promise<ExecutiveReportPdfFile> {
    const report = await this.getExecutiveResearchReport(auth, submissionId);
    await this.entitlementsService.assertCanUseFeature(
      report.company.companyId,
      'REPORT_PDFS_MONTHLY',
    );

    try {
      const filename = `relatorio-executivo-${slugify(report.company.companyName)}-${slugify(report.research.submissionId)}.pdf`;
      const buffer = await this.buildPdfBuffer(report);
      await this.entitlementsService.recordUsage(
        report.company.companyId,
        'REPORT_PDFS_MONTHLY',
      );
      audit('report_pdf_generated', {
        companyId: report.company.companyId,
        submissionId,
        actorUserId: auth.userId,
      });
      return { filename, buffer };
    } catch (error) {
      audit('report_pdf_failed', {
        companyId: report.company.companyId,
        submissionId,
        actorUserId: auth.userId,
        error: error instanceof Error ? error.message : 'UNKNOWN_ERROR',
      });
      throw new Error('REPORT_PDF_GENERATION_FAILED');
    }
  }

  private getMaturityLevel(score: number | null): ReportMaturityLevel | null {
    if (score == null || !Number.isFinite(score)) {
      return null;
    }

    if (score <= 39) {
      return 'CRITICAL';
    }

    if (score <= 59) {
      return 'INITIAL';
    }

    if (score <= 79) {
      return 'INTERMEDIATE';
    }

    return 'ADVANCED';
  }

  private getMaturityLabel(level: ReportMaturityLevel | null): string | null {
    switch (level) {
      case 'CRITICAL':
        return 'Crítico';
      case 'INITIAL':
        return 'Atenção';
      case 'INTERMEDIATE':
        return 'Bom';
      case 'ADVANCED':
        return 'Excelente';
      default:
        return null;
    }
  }

  private async getActor(auth: AuthTokenPayload): Promise<ReportActor> {
    const actor = await this.repository.findUserById(auth.userId);
    if (!actor) {
      throw new Error('USER_NOT_FOUND');
    }

    return {
      id: actor.id,
      role: actor.role,
      companyId: actor.company_id,
      status: actor.status,
    };
  }

  private ensureActive(actor: ReportActor): void {
    if (actor.status !== 'ACTIVE') {
      throw new Error('INACTIVE_USER');
    }
  }

  private ensureStrategicReportAccess(actor: ReportActor): void {
    if (actor.role === 'EMPLOYEE') {
      throw new Error('FORBIDDEN');
    }
  }

  private ensureAccess(
    actor: ReportActor,
    companyId: string,
    respondentUserId: string | null,
  ): void {
    if (actor.role === 'ADMIN') {
      return;
    }

    if (!actor.companyId || actor.companyId !== companyId) {
      throw new Error('FORBIDDEN');
    }

    void respondentUserId;
  }

  private async buildPdfBuffer(report: ExecutiveReport): Promise<Buffer> {
    return await new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 48,
        info: {
          Title: 'Relatório Executivo de Diagnóstico Empresarial',
          Author: 'Consultoria App',
          Subject: report.company.companyName,
        },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const generatedAt = new Date();
      const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

      const addSectionTitle = (title: string, subtitle?: string) => {
        doc.moveDown(0.8);
        doc.font('Helvetica-Bold').fontSize(15).fillColor('#152A61').text(title);
        if (subtitle) {
          doc.moveDown(0.2);
          doc.font('Helvetica').fontSize(9).fillColor('#4B5563').text(subtitle);
        }
        doc.moveDown(0.4);
      };

      const addBulletList = (items: string[], emptyMessage: string) => {
        if (items.length === 0) {
          doc.font('Helvetica').fontSize(10).fillColor('#4B5563').text(emptyMessage);
          return;
        }

        for (const item of items) {
          doc.font('Helvetica').fontSize(10).fillColor('#111827').text(`• ${item}`, {
            indent: 10,
            paragraphGap: 4,
          });
        }
      };

      const addKeyValue = (label: string, value: string) => {
        doc.font('Helvetica-Bold').fontSize(10).fillColor('#111827').text(`${label}: `, {
          continued: true,
        });
        doc.font('Helvetica').text(value);
      };

      doc.rect(0, 0, doc.page.width, 120).fill('#152A61');
      doc.fillColor('#FFFFFF');
      doc.font('Helvetica-Bold').fontSize(22).text(
        'Relatório Executivo de Diagnóstico Empresarial',
        doc.page.margins.left,
        42,
        { width: pageWidth },
      );
      doc.moveTo(doc.page.margins.left, 102).lineTo(doc.page.width - doc.page.margins.right, 102).strokeColor('#D8E0EC').stroke();

      doc.moveDown(2.6);
      doc.fillColor('#111827');
      addKeyValue('Empresa', report.company.companyName);
      addKeyValue('Data de geração', generatedAt.toLocaleString('pt-BR'));
      addKeyValue('Respondente', report.research.respondentName ?? '-');
      addKeyValue('Função', report.research.respondentRole ?? '-');
      addKeyValue('Setor', report.research.department ?? '-');

      addSectionTitle('Resumo Geral');
      addKeyValue('Score geral', report.research.overallScore?.toFixed(1) ?? '-');
      addKeyValue('Classificação', report.research.scoreInterpretation?.label ?? report.research.maturityLabel ?? '-');
      doc.moveDown(0.3);
      doc.font('Helvetica').fontSize(10).fillColor('#111827').text(
        report.result.summary != null && report.result.summary.trim().length > 0
          ? report.result.summary!
          : 'Resumo executivo não disponível.',
        { align: 'left' },
      );

      addSectionTitle('Score por Pilar');
      if (report.result.pillarScores.length == 0) {
        doc.font('Helvetica').fontSize(10).fillColor('#4B5563').text('Nenhum score por pilar disponível.');
      } else {
        for (const pillar of report.result.pillarScores) {
          doc.roundedRect(doc.x, doc.y, pageWidth, 46, 8).fillAndStroke('#F4F7FB', '#D8E0EC');
          const top = doc.y + 8;
          doc.fillColor('#111827').font('Helvetica-Bold').fontSize(10).text(
            pillar.pillar,
            doc.page.margins.left + 10,
            top,
          );
          doc.font('Helvetica').fontSize(9).fillColor('#4B5563').text(
            `Score: ${pillar.score.toFixed(1)} | Classificação: ${pillar.scoreInterpretation?.label ?? pillar.maturity ?? '-'} | Respostas: ${pillar.answersCount ?? '-'}`,
            doc.page.margins.left + 10,
            top + 16,
          );
          doc.moveDown(2.7);
        }
      }

      addSectionTitle('Pontos Críticos');
      addBulletList(report.result.criticalPoints, 'Nenhum ponto crítico destacado.');

      addSectionTitle('Oportunidades');
      addBulletList(report.result.opportunities, 'Nenhuma oportunidade destacada.');

      addSectionTitle('Recomendações');
      addBulletList(report.result.recommendations, 'Nenhuma recomendação registrada.');

      addSectionTitle('Próximos Passos');
      addBulletList(report.result.nextSteps, 'Nenhum próximo passo registrado.');

      addSectionTitle('Plano de Ação');
      addKeyValue('Total de tarefas', String(report.actionPlan.tasksTotal));
      addKeyValue('Tarefas abertas', String(report.actionPlan.tasksTodo));
      addKeyValue('Em andamento', String(report.actionPlan.tasksInProgress));
      addKeyValue('Concluídas', String(report.actionPlan.tasksDone));
      addKeyValue('Canceladas', String(report.actionPlan.tasksCanceled));
      addKeyValue('Atrasadas', String(report.actionPlan.tasksOverdue));
      doc.moveDown(0.4);

      if (!report.actionPlan.actionPlanGenerated || report.actionPlan.tasks.length === 0) {
        doc.font('Helvetica').fontSize(10).fillColor('#4B5563').text(
          'Plano de ação ainda não gerado para esta pesquisa.',
        );
      } else {
        for (const task of report.actionPlan.tasks) {
          if (doc.y > doc.page.height - 140) {
            doc.addPage();
          }

          doc.roundedRect(doc.page.margins.left, doc.y, pageWidth, 88, 8).fillAndStroke('#FFFFFF', '#D8E0EC');
          const top = doc.y + 10;
          doc.font('Helvetica-Bold').fontSize(11).fillColor('#111827').text(
            task.title,
            doc.page.margins.left + 10,
            top,
            { width: pageWidth - 20 },
          );
          doc.font('Helvetica').fontSize(9).fillColor('#4B5563').text(
            task.description || '-',
            doc.page.margins.left + 10,
            top + 16,
            { width: pageWidth - 20, height: 24 },
          );
          doc.font('Helvetica').fontSize(8.5).fillColor('#111827').text(
            `Pilar: ${task.pillar ?? '-'} | Prioridade: ${task.priority} | Status: ${task.status} | Prazo: ${task.dueDate ? new Date(task.dueDate).toLocaleDateString('pt-BR') : '-'} | Responsável: ${task.responsibleUserName ?? '-'}`,
            doc.page.margins.left + 10,
            top + 50,
            { width: pageWidth - 20 },
          );
          doc.moveDown(4.9);
        }
      }

      const footerText = `Gerado em ${generatedAt.toLocaleString('pt-BR')}`;
      const addFooter = () => {
        const savedX = doc.x;
        const savedY = doc.y;
        doc.font('Helvetica').fontSize(8).fillColor('#6B7280').text(
          footerText,
          doc.page.margins.left,
          doc.page.height - 30,
          { align: 'center', width: pageWidth },
        );
        doc.x = savedX;
        doc.y = savedY;
      };

      addFooter();
      doc.on('pageAdded', addFooter);
      doc.end();
    });
  }
}
