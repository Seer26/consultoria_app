import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/utils/date_formatter.dart';
import '../../../../core/widgets/app_feedback.dart';
import '../../../../core/widgets/app_page_scaffold.dart';
import '../../../../core/widgets/app_state_widgets.dart';
import '../../../../core/widgets/section_header.dart';
import '../../../clients/domain/entities/client.dart';
import '../../../clients/presentation/providers/client_providers.dart';
import '../../domain/entities/report.dart';
import '../providers/reports_providers.dart';

final _reportTypeProvider = StateProvider<String?>((ref) => null);
final _reportClientProvider = StateProvider<String?>((ref) => null);
final _reportPeriodProvider = StateProvider<String?>((ref) => null);

class ReportsPage extends ConsumerWidget {
  const ReportsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final reports = ref.watch(reportsProvider);
    final companies = ref.watch(clientsControllerProvider).valueOrNull ?? const <Client>[];
    final typeFilter = ref.watch(_reportTypeProvider);
    final clientFilter = ref.watch(_reportClientProvider);
    final periodFilter = ref.watch(_reportPeriodProvider);

    final filtered = reports.where((report) {
      final matchesType = typeFilter == null || report.type == typeFilter;
      final matchesClient = clientFilter == null || report.client == clientFilter;
      final matchesPeriod = periodFilter == null || report.period == periodFilter;
      return matchesType && matchesClient && matchesPeriod;
    }).toList();

    return AppPageScaffold(
      title: 'Relatorios',
      subtitle:
          'Central executiva para visualizar, gerar, exportar e compartilhar relatorios de consultoria.',
      actions: [
        FilledButton.icon(
          onPressed: () => _openCreateReportDialog(context, ref, companies),
          icon: const Icon(Icons.add_chart),
          label: const Text('Criar relatorio'),
        ),
      ],
      child: Column(
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: LayoutBuilder(
                builder: (context, constraints) {
                  const spacing = 12.0;
                  final width = constraints.maxWidth;
                  final columns = width >= 980
                      ? 3
                      : width >= 640
                          ? 2
                          : 1;
                  final fieldWidth = columns == 1
                      ? width
                      : (width - (spacing * (columns - 1))) / columns;

                  return Wrap(
                    spacing: spacing,
                    runSpacing: spacing,
                    children: [
                      SizedBox(
                        width: fieldWidth,
                        child: _FilterDropdown<String?>(
                          label: 'Empresa',
                          value: clientFilter,
                          items: [
                            const DropdownMenuItem<String?>(
                              value: null,
                              child: Text('Todas as empresas'),
                            ),
                            ...companies.map(
                              (company) => DropdownMenuItem<String?>(
                                value: company.name,
                                child: Text(company.name),
                              ),
                            ),
                          ],
                          onChanged: (value) => ref
                              .read(_reportClientProvider.notifier)
                              .state = value,
                        ),
                      ),
                      SizedBox(
                        width: fieldWidth,
                        child: _FilterDropdown<String?>(
                          label: 'Tipo',
                          value: typeFilter,
                          items: [
                            const DropdownMenuItem<String?>(
                              value: null,
                              child: Text('Todos os tipos'),
                            ),
                            ...reports.map((report) => report.type).toSet().map(
                                  (type) => DropdownMenuItem<String?>(
                                    value: type,
                                    child: Text(type),
                                  ),
                                ),
                          ],
                          onChanged: (value) =>
                              ref.read(_reportTypeProvider.notifier).state = value,
                        ),
                      ),
                      SizedBox(
                        width: fieldWidth,
                        child: _FilterDropdown<String?>(
                          label: 'Data',
                          value: periodFilter,
                          items: [
                            const DropdownMenuItem<String?>(
                              value: null,
                              child: Text('Todos os periodos'),
                            ),
                            ...reports.map((report) => report.period).toSet().map(
                                  (period) => DropdownMenuItem<String?>(
                                    value: period,
                                    child: Text(period),
                                  ),
                                ),
                          ],
                          onChanged: (value) => ref
                              .read(_reportPeriodProvider.notifier)
                              .state = value,
                        ),
                      ),
                    ],
                  );
                },
              ),
            ),
          ),
          const SizedBox(height: 16),
          const SectionHeader(
            title: 'Relatorios recentes',
            subtitle:
                'Materiais executivos por empresa, com status, exportacao e compartilhamento simulados.',
          ),
          const SizedBox(height: 8),
          Expanded(
            child: filtered.isEmpty
                ? const AppEmptyState(
                    title: 'Nenhum relatorio encontrado',
                    message:
                        'Ajuste os filtros aplicados ou gere um novo relatorio para demonstracao.',
                    icon: Icons.description_outlined,
                  )
                : ListView.separated(
                    itemCount: filtered.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 12),
                    itemBuilder: (context, index) {
                      final report = filtered[index];
                      return _ReportListCard(report: report);
                    },
                  ),
          ),
        ],
      ),
    );
  }

  Future<void> _openCreateReportDialog(
    BuildContext context,
    WidgetRef ref,
    List<Client> companies,
  ) async {
    if (companies.isEmpty) {
      AppFeedback.showSnackBar(
        context,
        message: 'Cadastre uma empresa antes de gerar relatorios.',
        type: AppFeedbackType.error,
      );
      return;
    }

    final result = await showDialog<_CreateReportInput>(
      context: context,
      builder: (_) => _CreateReportDialog(companies: companies),
    );

    if (result == null || !context.mounted) {
      return;
    }

    ref.read(reportsControllerProvider.notifier).create(
          client: result.company,
          type: result.type,
        );

    AppFeedback.showSnackBar(
      context,
      message: 'Relatorio mockado gerado com sucesso.',
      type: AppFeedbackType.success,
    );
  }
}

class ReportDetailsPage extends ConsumerWidget {
  const ReportDetailsPage({super.key, required this.reportId});

  final String reportId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final report = ref.watch(reportByIdProvider(reportId));

    if (report == null) {
      return const Scaffold(
        body: AppErrorState(
          title: 'Relatorio nao encontrado',
          message: 'O documento solicitado nao esta disponivel.',
        ),
      );
    }

    return AppPageScaffold(
      title: report.title,
      subtitle: '${report.client} • ${report.type} • ${report.period}',
      actions: [
        OutlinedButton.icon(
          onPressed: () => context.go('/reports'),
          icon: const Icon(Icons.arrow_back),
          label: const Text('Voltar'),
        ),
        FilledButton.icon(
          onPressed: () {
            AppFeedback.showSnackBar(
              context,
              message: 'Exportacao PDF simulada para ${report.title}.',
            );
          },
          icon: const Icon(Icons.file_download_outlined),
          label: const Text('Exportar'),
        ),
      ],
      child: ListView(
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Wrap(
                spacing: 16,
                runSpacing: 16,
                children: [
                  _HeaderItem(label: 'Empresa', value: report.client),
                  _HeaderItem(label: 'Relatorio', value: report.title),
                  _HeaderItem(
                    label: 'Data',
                    value: DateFormatter.formatDate(report.sentAt),
                  ),
                  _HeaderItem(label: 'Consultor', value: report.consultant),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const SectionHeader(
                    title: 'Resumo executivo',
                    subtitle:
                        'Narrativa consolidada para leitura de diretoria e alinhamento do proximo ciclo.',
                  ),
                  Text(
                    report.executiveSummary,
                    style: Theme.of(context).textTheme.bodyLarge,
                  ),
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
                childAspectRatio: 1.5,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                crossAxisSpacing: 16,
                mainAxisSpacing: 16,
                children: [
                  _MetricCard(
                    label: 'Score geral',
                    value: '${report.overallScore}',
                    color: AppColors.primary,
                  ),
                  _MetricCard(
                    label: 'Nivel de risco',
                    value: report.riskLevel,
                    color: _riskColor(report.riskLevel),
                  ),
                  _MetricCard(
                    label: 'Progresso dos planos',
                    value: '${(report.planProgress * 100).round()}%',
                    color: AppColors.teal,
                  ),
                  _MetricCard(
                    label: 'Engajamento',
                    value: '${report.engagement}%',
                    color: AppColors.amber,
                  ),
                ],
              );
            },
          ),
          const SizedBox(height: 16),
          LayoutBuilder(
            builder: (context, constraints) {
              final isWide = constraints.maxWidth >= 1000;
              if (isWide) {
                return Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: _AreasCard(areas: report.areas),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: _BulletsCard(
                        title: 'Principais problemas',
                        subtitle: 'Pontos criticos observados no periodo',
                        items: report.criticalIssues,
                        color: AppColors.danger,
                      ),
                    ),
                  ],
                );
              }
              return Column(
                children: [
                  _AreasCard(areas: report.areas),
                  const SizedBox(height: 16),
                  _BulletsCard(
                    title: 'Principais problemas',
                    subtitle: 'Pontos criticos observados no periodo',
                    items: report.criticalIssues,
                    color: AppColors.danger,
                  ),
                ],
              );
            },
          ),
          const SizedBox(height: 16),
          _BulletsCard(
            title: 'Recomendacoes',
            subtitle: 'Sugestoes priorizadas para o proximo ciclo',
            items: report.recommendations,
            color: AppColors.success,
          ),
          const SizedBox(height: 16),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const SectionHeader(
                    title: 'Plano de acao',
                    subtitle: 'Tarefas vinculadas ao relatorio com status e prioridade.',
                  ),
                  ...report.actionItems.map(
                    (task) => Container(
                      margin: const EdgeInsets.only(bottom: 12),
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: AppColors.surfaceMuted,
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Row(
                        children: [
                          Expanded(child: Text(task.title)),
                          const SizedBox(width: 12),
                          Chip(label: Text(task.status)),
                          const SizedBox(width: 8),
                          Chip(label: Text(task.priority)),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  static Color _riskColor(String risk) {
    switch (risk) {
      case 'Alto':
        return AppColors.danger;
      case 'Medio':
        return AppColors.amber;
      case 'Baixo':
      default:
        return AppColors.success;
    }
  }
}

class _ReportListCard extends StatelessWidget {
  const _ReportListCard({required this.report});

  final Report report;

  @override
  Widget build(BuildContext context) {
    final statusColor = switch (report.status) {
      'Enviado' => AppColors.success,
      'Rascunho' => AppColors.amber,
      _ => AppColors.textSecondary,
    };

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                CircleAvatar(
                  backgroundColor: AppColors.primarySoft,
                  foregroundColor: AppColors.primary,
                  child: Text(report.type.substring(0, 1)),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        report.title,
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.w800,
                            ),
                      ),
                      const SizedBox(height: 4),
                      Text('${report.client} • ${report.type} • ${DateFormatter.formatDate(report.sentAt)}'),
                    ],
                  ),
                ),
                Chip(
                  label: Text(report.status),
                  backgroundColor: statusColor.withValues(alpha: 0.12),
                  labelStyle: TextStyle(color: statusColor),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Text(report.summary),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                Chip(label: Text(report.period)),
                Chip(label: Text('Score ${report.overallScore}')),
                Chip(label: Text('Risco ${report.riskLevel}')),
              ],
            ),
            const SizedBox(height: 14),
            Wrap(
              spacing: 10,
              runSpacing: 10,
              children: [
                FilledButton.icon(
                  onPressed: () => context.go('/reports/${report.id}'),
                  icon: const Icon(Icons.visibility_outlined),
                  label: const Text('Visualizar'),
                ),
                OutlinedButton.icon(
                  onPressed: () {
                    AppFeedback.showSnackBar(
                      context,
                      message: 'Exportacao simulada para ${report.title}.',
                    );
                  },
                  icon: const Icon(Icons.file_download_outlined),
                  label: const Text('Exportar'),
                ),
                TextButton.icon(
                  onPressed: () {
                    AppFeedback.showSnackBar(
                      context,
                      message: 'Compartilhamento simulado com a empresa.',
                    );
                  },
                  icon: const Icon(Icons.share_outlined),
                  label: const Text('Compartilhar'),
                ),
              ],
            ),
          ],
        ),
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
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              height: 12,
              width: 12,
              decoration: BoxDecoration(
                color: color,
                borderRadius: BorderRadius.circular(999),
              ),
            ),
            const Spacer(),
            Text(
              value,
              style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                    fontWeight: FontWeight.w900,
                  ),
            ),
            const SizedBox(height: 4),
            Text(label),
          ],
        ),
      ),
    );
  }
}

class _AreasCard extends StatelessWidget {
  const _AreasCard({required this.areas});

  final List<ReportAreaScore> areas;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SectionHeader(
              title: 'Areas avaliadas',
              subtitle: 'Evolucao percentual por frente de trabalho.',
            ),
            ...areas.map(
              (area) => Padding(
                padding: const EdgeInsets.only(bottom: 14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(child: Text(area.name)),
                        Text('${(area.progress * 100).round()}%'),
                      ],
                    ),
                    const SizedBox(height: 6),
                    LinearProgressIndicator(value: area.progress, minHeight: 10),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _BulletsCard extends StatelessWidget {
  const _BulletsCard({
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
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SectionHeader(title: title, subtitle: subtitle),
            ...items.map(
              (item) => Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(Icons.fiber_manual_record, color: color, size: 14),
                    const SizedBox(width: 10),
                    Expanded(child: Text(item)),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _HeaderItem extends StatelessWidget {
  const _HeaderItem({
    required this.label,
    required this.value,
  });

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 220,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: const TextStyle(color: AppColors.textSecondary)),
          const SizedBox(height: 4),
          Text(
            value,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w800,
                ),
          ),
        ],
      ),
    );
  }
}

class _FilterDropdown<T> extends StatelessWidget {
  const _FilterDropdown({
    required this.label,
    required this.value,
    required this.items,
    required this.onChanged,
  });

  final String label;
  final T value;
  final List<DropdownMenuItem<T>> items;
  final ValueChanged<T?> onChanged;

  @override
  Widget build(BuildContext context) {
    return DropdownButtonFormField<T>(
      value: value,
      decoration: InputDecoration(labelText: label),
      items: items,
      onChanged: onChanged,
    );
  }
}

class _CreateReportInput {
  const _CreateReportInput({
    required this.company,
    required this.type,
  });

  final String company;
  final String type;
}

class _CreateReportDialog extends StatefulWidget {
  const _CreateReportDialog({required this.companies});

  final List<Client> companies;

  @override
  State<_CreateReportDialog> createState() => _CreateReportDialogState();
}

class _CreateReportDialogState extends State<_CreateReportDialog> {
  late String _company;
  String _type = 'Executivo';

  @override
  void initState() {
    super.initState();
    _company = widget.companies.first.name;
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Criar relatorio'),
      content: SizedBox(
        width: 480,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            DropdownButtonFormField<String>(
              value: _company,
              decoration: const InputDecoration(labelText: 'Empresa'),
              items: widget.companies
                  .map(
                    (company) => DropdownMenuItem(
                      value: company.name,
                      child: Text(company.name),
                    ),
                  )
                  .toList(),
              onChanged: (value) => setState(() => _company = value ?? _company),
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              value: _type,
              decoration: const InputDecoration(labelText: 'Tipo'),
              items: const [
                DropdownMenuItem(value: 'Executivo', child: Text('Executivo')),
                DropdownMenuItem(value: 'Diagnostico', child: Text('Diagnostico')),
                DropdownMenuItem(value: 'Onboarding', child: Text('Onboarding')),
              ],
              onChanged: (value) => setState(() => _type = value ?? 'Executivo'),
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Cancelar'),
        ),
        FilledButton(
          onPressed: () => Navigator.pop(
            context,
            _CreateReportInput(company: _company, type: _type),
          ),
          child: const Text('Gerar'),
        ),
      ],
    );
  }
}
