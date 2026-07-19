import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/utils/date_formatter.dart';
import '../../../../core/widgets/app_page_scaffold.dart';
import '../../../../core/widgets/app_state_widgets.dart';
import '../../../../core/widgets/section_header.dart';
import '../../../diagnosis/presentation/providers/research_service_provider.dart';
import '../../data/services/report_pdf_exporter.dart';
import '../../domain/entities/report.dart';
import '../providers/reports_providers.dart';

class ReportsPage extends ConsumerWidget {
  const ReportsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final reportsAsync = ref.watch(reportsProvider);

    return AppPageScaffold(
      title: 'Relatórios Executivos',
      subtitle:
          'Lista executiva das pesquisas concluidas com acesso ao relatorio detalhado e situacao do plano de acao.',
      child: reportsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => AppErrorState(
          title: 'Falha ao carregar relatorios',
          message: error.toString(),
          onRetry: () => ref.invalidate(reportsProvider),
        ),
        data: (reports) {
          if (reports.isEmpty) {
            return const AppEmptyState(
              title: 'Nenhum relatorio disponivel',
              message:
                  'As pesquisas concluidas com relatorio executivo aparecerao aqui.',
              icon: Icons.description_outlined,
            );
          }

          return ListView.separated(
            itemCount: reports.length,
            separatorBuilder: (_, index) => const SizedBox(height: 12),
            itemBuilder: (context, index) {
              final report = reports[index];
              return _ReportSummaryCard(report: report);
            },
          );
        },
      ),
    );
  }
}

class ReportDetailsPage extends ConsumerWidget {
  const ReportDetailsPage({super.key, required this.submissionId});

  final String submissionId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final reportAsync = ref.watch(executiveReportProvider(submissionId));

    return AppPageScaffold(
      title: 'Relatório Executivo',
      subtitle:
          'Diagnóstico Empresarial consolidado com resumo, maturidade e Plano de Ação vinculado.',
      actions: [
        OutlinedButton.icon(
          onPressed: () => context.go('/reports'),
          icon: const Icon(Icons.arrow_back),
          label: const Text('Voltar'),
        ),
      ],
      child: reportAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => AppErrorState(
          title: 'Falha ao carregar relatorio',
          message: error.toString(),
          onRetry: () => ref.invalidate(executiveReportProvider(submissionId)),
        ),
        data: (report) => ExecutiveReportView(report: report),
      ),
    );
  }
}

class ExecutiveReportView extends ConsumerStatefulWidget {
  const ExecutiveReportView({super.key, required this.report});

  final ExecutiveReport report;

  @override
  ConsumerState<ExecutiveReportView> createState() =>
      _ExecutiveReportViewState();
}

class _ExecutiveReportViewState extends ConsumerState<ExecutiveReportView> {
  bool _isExportingPdf = false;

  @override
  Widget build(BuildContext context) {
    final report = widget.report;

    Future<void> generateActionPlan() async {
      final messenger = ScaffoldMessenger.of(context);
      try {
        await ref
            .read(researchServiceProvider)
            .generateActionPlan(report.submissionId);
        ref.invalidate(executiveReportProvider(report.submissionId));
        ref.invalidate(reportsProvider);
        if (!mounted) return;
        messenger.showSnackBar(
          const SnackBar(
            backgroundColor: AppColors.success,
            content: Text('Plano de acao gerado com sucesso.'),
          ),
        );
      } catch (error) {
        if (!mounted) return;
        messenger.showSnackBar(
          SnackBar(
            backgroundColor: AppColors.danger,
            content: Text(error.toString().replaceFirst('Exception: ', '')),
          ),
        );
      }
    }

    Future<void> exportPdf() async {
      final messenger = ScaffoldMessenger.of(context);
      setState(() => _isExportingPdf = true);
      try {
        final file = await ref
            .read(reportsServiceProvider)
            .downloadExecutiveReportPdf(report.submissionId);
        await exportReportPdf(bytes: file.bytes, filename: file.filename);

        if (!mounted) return;
        messenger.showSnackBar(
          SnackBar(
            backgroundColor: AppColors.success,
            content: Text('PDF pronto: ${file.filename}'),
          ),
        );
      } catch (error) {
        if (!mounted) return;
        messenger.showSnackBar(
          SnackBar(
            backgroundColor: AppColors.danger,
            content: Text(error.toString().replaceFirst('Exception: ', '')),
          ),
        );
      } finally {
        if (mounted) {
          setState(() => _isExportingPdf = false);
        }
      }
    }

    return ListView(
      children: [
        Align(
          alignment: Alignment.centerRight,
          child: FilledButton.icon(
            onPressed: _isExportingPdf ? null : exportPdf,
            icon: _isExportingPdf
                ? const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.picture_as_pdf_outlined),
            label: Text(_isExportingPdf ? 'Exportando PDF...' : 'Exportar PDF'),
          ),
        ),
        const SizedBox(height: 16),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Wrap(
              spacing: 16,
              runSpacing: 16,
              children: [
                _HeaderItem(label: 'Empresa', value: report.companyName),
                _HeaderItem(
                  label: 'Respondente',
                  value: report.respondentName ?? '-',
                ),
                _HeaderItem(
                  label: 'Funcao',
                  value: report.respondentRole ?? '-',
                ),
                _HeaderItem(label: 'Setor', value: report.department ?? '-'),
                _HeaderItem(
                  label: 'Concluida em',
                  value: report.completedAt == null
                      ? '-'
                      : DateFormatter.formatDateTime(
                          report.completedAt!.toLocal(),
                        ),
                ),
                _HeaderItem(label: 'Status', value: report.status),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),
        LayoutBuilder(
          builder: (context, constraints) {
            final columns = constraints.maxWidth >= 1100
                ? 4
                : constraints.maxWidth >= 700
                ? 2
                : 1;

            return GridView.count(
              crossAxisCount: columns,
              childAspectRatio: 1.55,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              crossAxisSpacing: 16,
              mainAxisSpacing: 16,
              children: [
                _MetricCard(
                  label: 'Score geral',
                  value: _score(report.overallScore),
                  color: AppColors.primary,
                ),
                _MetricCard(
                  label: 'Maturidade',
                  value: report.maturityLabel ?? '-',
                  color: _maturityColor(report.maturityLevel),
                ),
                _MetricCard(
                  label: 'Tarefas do plano',
                  value: '${report.tasksTotal}',
                  color: AppColors.teal,
                ),
                _MetricCard(
                  label: 'Tarefas atrasadas',
                  value: '${report.tasksOverdue}',
                  color: AppColors.danger,
                ),
              ],
            );
          },
        ),
        const SizedBox(height: 16),
        _TextSection(
          title: 'Resumo Executivo',
          subtitle: 'Leitura executiva consolidada da pesquisa.',
          items: [
            report.summary?.trim().isNotEmpty == true
                ? report.summary!
                : 'Resumo nao disponivel.',
          ],
          color: AppColors.primary,
        ),
        const SizedBox(height: 16),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SectionHeader(
                  title: 'Score por Pilar',
                  subtitle: 'Pontuacao e maturidade identificadas na pesquisa.',
                ),
                if (report.pillarScores.isEmpty)
                  const Padding(
                    padding: EdgeInsets.only(top: 8),
                    child: Text('Nenhum score por pilar disponivel.'),
                  )
                else
                  ...report.pillarScores.map(
                    (pillar) => Padding(
                      padding: const EdgeInsets.only(top: 14),
                      child: Column(
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: Text(
                                  pillar.pillar,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ),
                              Text(
                                '${pillar.score.toStringAsFixed(1)}${pillar.maturity == null ? '' : ' · ${pillar.maturity}'}',
                                style: const TextStyle(
                                  color: AppColors.textSecondary,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 7),
                          LinearProgressIndicator(
                            value: (pillar.score / 100).clamp(0, 1),
                            minHeight: 9,
                            borderRadius: BorderRadius.circular(99),
                          ),
                        ],
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),
        _TextSection(
          title: 'Pontos Criticos',
          subtitle: 'Riscos e gargalos com maior atencao.',
          items: report.criticalPoints,
          color: AppColors.danger,
        ),
        const SizedBox(height: 16),
        _TextSection(
          title: 'Oportunidades',
          subtitle: 'Frentes favoraveis identificadas na analise.',
          items: report.opportunities,
          color: AppColors.teal,
        ),
        const SizedBox(height: 16),
        _TextSection(
          title: 'Recomendacoes',
          subtitle: 'Diretrizes sugeridas para a empresa.',
          items: report.recommendations,
          color: AppColors.primary,
        ),
        const SizedBox(height: 16),
        _TextSection(
          title: 'Proximos Passos',
          subtitle: 'Acoes objetivas sugeridas a partir da pesquisa.',
          items: report.nextSteps,
          color: AppColors.amber,
        ),
        const SizedBox(height: 16),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SectionHeader(
                  title: 'Plano de Acao',
                  subtitle:
                      'Resumo e tarefas vinculadas diretamente a esta pesquisa.',
                ),
                const SizedBox(height: 8),
                if (!report.actionPlanGenerated) ...[
                  const Text(
                    'Plano de acao ainda nao gerado para esta pesquisa.',
                  ),
                  const SizedBox(height: 12),
                  FilledButton.icon(
                    onPressed: generateActionPlan,
                    icon: const Icon(Icons.playlist_add_check_circle_outlined),
                    label: const Text('Gerar plano de acao'),
                  ),
                ] else ...[
                  Wrap(
                    spacing: 10,
                    runSpacing: 10,
                    children: [
                      _StatusChip(
                        label: 'Total ${report.tasksTotal}',
                        color: AppColors.primary,
                      ),
                      _StatusChip(
                        label: 'TODO ${report.tasksTodo}',
                        color: AppColors.textMuted,
                      ),
                      _StatusChip(
                        label: 'IN_PROGRESS ${report.tasksInProgress}',
                        color: AppColors.indigo,
                      ),
                      _StatusChip(
                        label: 'DONE ${report.tasksDone}',
                        color: AppColors.success,
                      ),
                      _StatusChip(
                        label: 'CANCELED ${report.tasksCanceled}',
                        color: AppColors.danger,
                      ),
                      _StatusChip(
                        label: 'Atrasadas ${report.tasksOverdue}',
                        color: AppColors.amber,
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  if (report.tasks.isEmpty)
                    const Text('Nenhuma tarefa vinculada encontrada.')
                  else
                    ...report.tasks.map((task) => _TaskTile(task: task)),
                  const SizedBox(height: 8),
                  Align(
                    alignment: Alignment.centerRight,
                    child: OutlinedButton.icon(
                      onPressed: () => context.go('/tasks'),
                      icon: const Icon(Icons.arrow_forward),
                      label: const Text('Abrir plano de ação'),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _ReportSummaryCard extends StatelessWidget {
  const _ReportSummaryCard({required this.report});

  final ReportSummary report;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        report.companyName,
                        style: Theme.of(context).textTheme.titleMedium
                            ?.copyWith(fontWeight: FontWeight.w800),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '${report.respondentName ?? '-'} | ${report.respondentRole ?? '-'} | ${report.department ?? '-'}',
                        style: const TextStyle(color: AppColors.textSecondary),
                      ),
                    ],
                  ),
                ),
                _StatusChip(
                  label: report.maturityLabel ?? '-',
                  color: _maturityColor(report.maturityLevel),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 10,
              runSpacing: 10,
              children: [
                _StatusChip(
                  label: 'Score ${_score(report.overallScore)}',
                  color: AppColors.primary,
                ),
                _StatusChip(
                  label: report.completedAt == null
                      ? 'Sem data'
                      : DateFormatter.formatDate(report.completedAt!.toLocal()),
                  color: AppColors.teal,
                ),
                _StatusChip(
                  label: report.actionPlanGenerated
                      ? 'Plano gerado'
                      : 'Sem plano',
                  color: report.actionPlanGenerated
                      ? AppColors.success
                      : AppColors.amber,
                ),
              ],
            ),
            const SizedBox(height: 12),
            Align(
              alignment: Alignment.centerRight,
              child: FilledButton.icon(
                onPressed: () => context.go('/reports/${report.submissionId}'),
                icon: const Icon(Icons.visibility_outlined),
                label: const Text('Visualizar'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _TaskTile extends StatelessWidget {
  const _TaskTile({required this.task});

  final ReportTask task;

  @override
  Widget build(BuildContext context) {
    final isOverdue =
        task.dueDate != null &&
        task.dueDate!.toLocal().isBefore(DateTime.now()) &&
        task.status != 'DONE' &&
        task.status != 'CANCELED';

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surfaceMuted,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(task.title, style: const TextStyle(fontWeight: FontWeight.w800)),
          if (task.description.trim().isNotEmpty) ...[
            const SizedBox(height: 6),
            Text(task.description),
          ],
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _StatusChip(label: task.priority, color: AppColors.amber),
              _StatusChip(
                label: task.status,
                color: _taskStatusColor(task.status),
              ),
              _StatusChip(label: task.source, color: AppColors.primary),
              if (task.pillar?.trim().isNotEmpty == true)
                _StatusChip(label: task.pillar!, color: AppColors.teal),
              if (task.dueDate != null)
                _StatusChip(
                  label: DateFormatter.formatDate(task.dueDate!.toLocal()),
                  color: isOverdue ? AppColors.danger : AppColors.indigo,
                ),
              if (isOverdue)
                const _StatusChip(label: 'ATRASADA', color: AppColors.danger),
              if (task.responsibleUserName?.trim().isNotEmpty == true)
                _StatusChip(
                  label: task.responsibleUserName!,
                  color: AppColors.success,
                ),
            ],
          ),
        ],
      ),
    );
  }
}

class _TextSection extends StatelessWidget {
  const _TextSection({
    required this.title,
    required this.subtitle,
    required this.items,
    required this.color,
  });

  final String title;
  final String subtitle;
  final List<String> items;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final visibleItems = items.isEmpty
        ? const ['Nenhum item disponivel.']
        : items;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SectionHeader(title: title, subtitle: subtitle),
            ...visibleItems.map(
              (item) => Container(
                width: double.infinity,
                margin: const EdgeInsets.only(top: 12),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Text(item),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _StatusChip extends StatelessWidget {
  const _StatusChip({required this.label, required this.color});

  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.14),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: color,
          fontWeight: FontWeight.w700,
          fontSize: 12,
        ),
      ),
    );
  }
}

class _HeaderItem extends StatelessWidget {
  const _HeaderItem({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 220,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(
              color: AppColors.textSecondary,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 4),
          Text(value, style: const TextStyle(fontWeight: FontWeight.w800)),
        ],
      ),
    );
  }
}

class _MetricCard extends StatelessWidget {
  const _MetricCard({
    required this.label,
    required this.value,
    required this.color,
  });

  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label,
              style: const TextStyle(
                color: AppColors.textSecondary,
                fontWeight: FontWeight.w700,
              ),
            ),
            const Spacer(),
            Text(
              value,
              style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                fontWeight: FontWeight.w800,
                color: color,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

Color _maturityColor(String? maturityLevel) {
  switch (maturityLevel) {
    case 'CRITICAL':
      return AppColors.danger;
    case 'INITIAL':
      return AppColors.amber;
    case 'INTERMEDIATE':
      return AppColors.teal;
    case 'ADVANCED':
      return AppColors.success;
    default:
      return AppColors.textMuted;
  }
}

Color _taskStatusColor(String status) {
  switch (status) {
    case 'DONE':
      return AppColors.success;
    case 'IN_PROGRESS':
      return AppColors.indigo;
    case 'CANCELED':
      return AppColors.danger;
    case 'TODO':
    default:
      return AppColors.textMuted;
  }
}

String _score(double? value) {
  if (value == null) {
    return '-';
  }

  return value.toStringAsFixed(1);
}
