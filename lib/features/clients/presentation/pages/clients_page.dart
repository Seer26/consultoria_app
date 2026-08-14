import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/errors/api_error_presenter.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/utils/date_formatter.dart';
import '../../../../core/widgets/app_feedback.dart';
import '../../../../core/widgets/app_page_scaffold.dart';
import '../../../../core/widgets/app_state_widgets.dart';
import '../../../../core/widgets/section_header.dart';
import '../../../action_plan/domain/enums/action_status.dart';
import '../../../action_plan/domain/entities/action_item.dart';
import '../../../action_plan/presentation/providers/action_plan_providers.dart';
import '../../../forms/domain/entities/create_form_input.dart';
import '../../../forms/domain/entities/form_template.dart';
import '../../../forms/presentation/providers/forms_providers.dart';
import '../../../reports/domain/entities/report.dart';
import '../../../reports/presentation/providers/reports_providers.dart';
import '../../domain/entities/client.dart';
import '../providers/client_providers.dart';
import '../widgets/client_card.dart';

final _statusFilterProvider = StateProvider<ClientStatus?>((ref) => null);
final _searchFilterProvider = StateProvider<String>((ref) => '');

class ClientsPage extends ConsumerWidget {
  const ClientsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final companiesState = ref.watch(clientsControllerProvider);
    final statusFilter = ref.watch(_statusFilterProvider);
    final search = ref.watch(_searchFilterProvider);

    return AppPageScaffold(
      title: 'Empresas',
      subtitle:
          'Empresas atendidas pelo consultor com status, progresso e proximos movimentos.',
      actions: [
        FilledButton.icon(
          onPressed: () => _openCompanyEditor(context, ref),
          icon: const Icon(Icons.add),
          label: const Text('Nova empresa'),
        ),
      ],
      child: Column(
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          decoration: const InputDecoration(
                            prefixIcon: Icon(Icons.search),
                            hintText:
                                'Buscar por nome, segmento ou responsavel',
                          ),
                          onChanged: (value) =>
                              ref.read(_searchFilterProvider.notifier).state =
                                  value,
                        ),
                      ),
                      const SizedBox(width: 12),
                      IconButton(
                        onPressed: () =>
                            ref.read(clientsControllerProvider.notifier).load(),
                        icon: const Icon(Icons.refresh),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Align(
                    alignment: Alignment.centerLeft,
                    child: SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: SegmentedButton<ClientStatus?>(
                        segments: const [
                          ButtonSegment(value: null, label: Text('Todas')),
                          ButtonSegment(
                            value: ClientStatus.active,
                            label: Text('Ativas'),
                          ),
                          ButtonSegment(
                            value: ClientStatus.paused,
                            label: Text('Pausadas'),
                          ),
                          ButtonSegment(
                            value: ClientStatus.closed,
                            label: Text('Arquivadas'),
                          ),
                        ],
                        selected: {statusFilter},
                        onSelectionChanged: (value) =>
                            ref.read(_statusFilterProvider.notifier).state =
                                value.first,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          const SectionHeader(
            title: 'Carteira acompanhada',
            subtitle:
                'Leitura rapida das empresas com acoes diretas e indicadores por conta.',
          ),
          const SizedBox(height: 8),
          Expanded(
            child: companiesState.when(
              data: (companies) {
                final filtered = companies.where((company) {
                  final matchesStatus =
                      statusFilter == null || company.status == statusFilter;
                  final query = search.trim().toLowerCase();
                  final matchesSearch =
                      query.isEmpty ||
                      company.name.toLowerCase().contains(query) ||
                      company.segment.toLowerCase().contains(query) ||
                      company.owner.toLowerCase().contains(query);
                  return matchesStatus && matchesSearch;
                }).toList();

                if (filtered.isEmpty) {
                  return AppEmptyState(
                    title: 'Nenhuma empresa encontrada',
                    message:
                        'Ajuste os filtros ou cadastre uma nova empresa para continuar.',
                    icon: Icons.apartment_outlined,
                    action: FilledButton.icon(
                      onPressed: () => _openCompanyEditor(context, ref),
                      icon: const Icon(Icons.add),
                      label: const Text('Cadastrar empresa'),
                    ),
                  );
                }

                return LayoutBuilder(
                  builder: (context, constraints) {
                    final columns = constraints.maxWidth >= 760 ? 2 : 1;
                    final spacing = 16.0;
                    final itemWidth = columns == 1
                        ? constraints.maxWidth
                        : (constraints.maxWidth - spacing) / columns;

                    return SingleChildScrollView(
                      child: Wrap(
                        spacing: spacing,
                        runSpacing: spacing,
                        children: [
                          for (final company in filtered)
                            SizedBox(
                              width: itemWidth,
                              child: ClientCard(
                                client: company,
                                onOpen: () =>
                                    context.go('/clients/${company.id}'),
                                onEdit: () => _openCompanyEditor(
                                  context,
                                  ref,
                                  client: company,
                                ),
                                onArchive: () {
                                  ref
                                      .read(clientsControllerProvider.notifier)
                                      .archive(company.id);
                                  AppFeedback.showSnackBar(
                                    context,
                                    message: '${company.name} arquivada.',
                                    type: AppFeedbackType.info,
                                  );
                                },
                                onRemove: () {
                                  ref
                                      .read(clientsControllerProvider.notifier)
                                      .remove(company.id);
                                  AppFeedback.showSnackBar(
                                    context,
                                    message:
                                        '${company.name} removida da carteira.',
                                    type: AppFeedbackType.success,
                                  );
                                },
                              ),
                            ),
                        ],
                      ),
                    );
                  },
                );
              },
              loading: () =>
                  const AppLoadingState(message: 'Carregando empresas'),
              error: (error, _) => AppErrorState(
                title: 'Falha ao carregar empresas',
                message: userFriendlyError(error),
                onRetry: () =>
                    ref.read(clientsControllerProvider.notifier).load(),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _openCompanyEditor(
    BuildContext context,
    WidgetRef ref, {
    Client? client,
  }) async {
    final result = await showDialog<Client>(
      context: context,
      builder: (context) => _ClientEditorDialog(client: client),
    );

    if (result == null || !context.mounted) {
      return;
    }

    if (client == null) {
      ref.read(clientsControllerProvider.notifier).create(result);
      AppFeedback.showSnackBar(
        context,
        message: 'Empresa criada com sucesso.',
        type: AppFeedbackType.success,
      );
      return;
    }

    ref.read(clientsControllerProvider.notifier).update(result);
    AppFeedback.showSnackBar(
      context,
      message: 'Empresa atualizada com sucesso.',
      type: AppFeedbackType.success,
    );
  }
}

class ClientDetailsPage extends ConsumerWidget {
  const ClientDetailsPage({super.key, required this.clientId});

  final String clientId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final company = ref.watch(selectedClientProvider(clientId));
    final forms =
        ref.watch(formsControllerProvider).valueOrNull ??
        const <FormTemplate>[];
    final reports =
        ref.watch(reportsProvider).valueOrNull ?? const <ReportSummary>[];
    final plans = ref.watch(actionPlanControllerProvider);

    if (company == null) {
      return const Scaffold(
        body: AppErrorState(
          title: 'Empresa nao encontrada',
          message: 'A empresa solicitada nao existe ou foi removida.',
        ),
      );
    }

    final companyForms =
        forms
            .where(
              (form) =>
                  form.clientId == company.id ||
                  form.clientName == company.name,
            )
            .toList()
          ..sort((a, b) => b.createdAt.compareTo(a.createdAt));
    final sentForms = companyForms
        .where((form) => form.status == FormStatus.sent)
        .length;
    final draftForms = companyForms
        .where((form) => form.status == FormStatus.draft)
        .length;
    final answeredForms = companyForms
        .where((form) => form.responsesCount > 0)
        .length;

    final companyReports =
        reports.where((report) => report.companyName == company.name).toList()
          ..sort((a, b) {
            final left =
                a.completedAt ?? DateTime.fromMillisecondsSinceEpoch(0);
            final right =
                b.completedAt ?? DateTime.fromMillisecondsSinceEpoch(0);
            return right.compareTo(left);
          });
    final latestReport = companyReports.isNotEmpty
        ? companyReports.first
        : null;

    final companyPlans =
        plans.where((plan) => plan.client == company.name).toList()
          ..sort((a, b) => a.dueDate.compareTo(b.dueDate));
    ActionItem? activePlan;
    for (final plan in companyPlans) {
      if (plan.status != ActionStatus.done) {
        activePlan = plan;
        break;
      }
    }
    activePlan ??= companyPlans.isNotEmpty ? companyPlans.first : null;

    final diagnosisScore = (latestReport?.overallScore ?? company.score)
        .round();
    final diagnosisAreas = [
      _CompanyAreaMetric(name: 'Gestao', progress: company.progress),
      _CompanyAreaMetric(
        name: 'Operacoes',
        progress: (company.progress * 0.9).clamp(0.0, 1.0),
      ),
      _CompanyAreaMetric(
        name: 'Comercial',
        progress: (company.progress * 1.1).clamp(0.0, 1.0),
      ),
    ];
    final diagnosisAlerts = const [
      'Ritmo de execucao irregular nas frentes prioritarias do trimestre.',
      'Dependencia elevada da lideranca central nas decisoes do dia a dia.',
    ];
    final diagnosisRecommendation =
        'Conectar pesquisa, dashboard e plano ativo em um unico rito semanal.';
    final executiveSummary = company.notes.isEmpty
        ? '${company.name} segue em acompanhamento consultivo com score '
              '${company.score}, progresso de ${(company.progress * 100).round()}% '
              'e foco imediato em ${company.nextStep.toLowerCase()}.'
        : company.notes;

    return AppPageScaffold(
      title: company.name,
      subtitle: '${company.segment} | Responsavel ${company.owner}',
      actions: [
        OutlinedButton.icon(
          onPressed: () => context.go('/clients'),
          icon: const Icon(Icons.arrow_back),
          label: const Text('Voltar'),
        ),
      ],
      child: ListView(
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SectionHeader(
                    title: 'Central da empresa',
                    subtitle:
                        'Visao consolidada da conta para acompanhamento executivo do consultor.',
                    action: FilledButton.icon(
                      onPressed: latestReport == null
                          ? null
                          : () => context.go(
                              '/reports/${latestReport.submissionId}',
                            ),
                      icon: const Icon(Icons.description_outlined),
                      label: const Text('Ultimo relatorio'),
                    ),
                  ),
                  Wrap(
                    spacing: 16,
                    runSpacing: 16,
                    children: [
                      _DetailMetric(
                        label: 'Segmento',
                        value: company.segment,
                        icon: Icons.domain_outlined,
                      ),
                      _DetailMetric(
                        label: 'Responsavel',
                        value: company.owner,
                        icon: Icons.person_outline,
                      ),
                      _DetailMetric(
                        label: 'Status',
                        value: _clientStatusLabel(company.status),
                        icon: Icons.flag_outlined,
                        emphasisColor: _companyStatusColor(company.status),
                      ),
                      _DetailMetric(
                        label: 'Score',
                        value: company.score.toString(),
                        icon: Icons.insights_outlined,
                      ),
                      _DetailMetric(
                        label: 'Progresso',
                        value: '${(company.progress * 100).round()}%',
                        icon: Icons.trending_up_outlined,
                      ),
                      _DetailMetric(
                        label: 'Ultimo contato',
                        value: DateFormatter.formatRelative(
                          company.lastUpdatedAt,
                        ),
                        icon: Icons.schedule_outlined,
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: AppColors.surfaceMuted,
                      borderRadius: BorderRadius.circular(18),
                    ),
                    child: Wrap(
                      spacing: 12,
                      runSpacing: 12,
                      children: [
                        _TagChip(
                          icon: Icons.email_outlined,
                          label: company.contactEmail,
                        ),
                        _TagChip(
                          icon: Icons.task_alt_outlined,
                          label: 'Proximo passo: ${company.nextStep}',
                        ),
                        _TagChip(
                          icon: Icons.assignment_outlined,
                          label:
                              '${companyForms.length} formularios vinculados',
                        ),
                        _TagChip(
                          icon: Icons.description_outlined,
                          label: '${companyReports.length} relatorios gerados',
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          _SectionCard(
            title: 'Resumo executivo',
            subtitle:
                'Leitura rapida da situacao atual e da frente mais relevante.',
            child: Text(
              executiveSummary,
              style: Theme.of(context).textTheme.bodyLarge,
            ),
          ),
          const SizedBox(height: 16),
          _ResponsiveSectionGrid(
            children: [
              _SectionCard(
                title: 'Formularios',
                subtitle: 'Envios, pendencias e retornos recentes da empresa.',
                child: _FormsOverview(
                  forms: companyForms,
                  sentForms: sentForms,
                  draftForms: draftForms,
                  answeredForms: answeredForms,
                ),
              ),
              _SectionCard(
                title: 'Diagnostico',
                subtitle:
                    'Leitura atual das areas avaliadas e pontos de atencao.',
                child: _DiagnosisOverview(
                  score: diagnosisScore,
                  areas: diagnosisAreas,
                  alerts: diagnosisAlerts,
                  recommendation: diagnosisRecommendation,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          _ResponsiveSectionGrid(
            children: [
              _SectionCard(
                title: 'Plano de acao',
                subtitle:
                    'Plano ativo, prioridade e proximas tarefas do ciclo.',
                child: _PlanOverview(
                  activePlan: activePlan,
                  plans: companyPlans,
                ),
              ),
              _SectionCard(
                title: 'Relatorios',
                subtitle:
                    'Historico recente de entregas executivas para a conta.',
                child: _ReportsOverview(reports: companyReports),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _SectionCard extends StatelessWidget {
  const _SectionCard({
    required this.title,
    required this.subtitle,
    required this.child,
  });

  final String title;
  final String subtitle;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SectionHeader(title: title, subtitle: subtitle),
            child,
          ],
        ),
      ),
    );
  }
}

class _ResponsiveSectionGrid extends StatelessWidget {
  const _ResponsiveSectionGrid({required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final columns = constraints.maxWidth >= 1100 ? 2 : 1;
        const spacing = 16.0;
        final itemWidth = columns == 1
            ? constraints.maxWidth
            : (constraints.maxWidth - spacing) / columns;

        return Wrap(
          spacing: spacing,
          runSpacing: spacing,
          children: [
            for (final child in children)
              SizedBox(width: itemWidth, child: child),
          ],
        );
      },
    );
  }
}

class _FormsOverview extends StatelessWidget {
  const _FormsOverview({
    required this.forms,
    required this.sentForms,
    required this.draftForms,
    required this.answeredForms,
  });

  final List<FormTemplate> forms;
  final int sentForms;
  final int draftForms;
  final int answeredForms;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Wrap(
          spacing: 12,
          runSpacing: 12,
          children: [
            _MiniMetric(label: 'Enviados', value: '$sentForms'),
            _MiniMetric(label: 'Pendentes', value: '$draftForms'),
            _MiniMetric(label: 'Respondidos', value: '$answeredForms'),
          ],
        ),
        const SizedBox(height: 16),
        if (forms.isEmpty)
          const Text('Nenhum formulario vinculado a esta empresa.')
        else
          ...forms
              .take(3)
              .map(
                (form) => Container(
                  margin: const EdgeInsets.only(bottom: 12),
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: AppColors.surfaceMuted,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Icon(Icons.assignment_outlined),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              form.title,
                              style: Theme.of(context).textTheme.titleSmall
                                  ?.copyWith(fontWeight: FontWeight.w700),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              form.description,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                color: AppColors.textSecondary,
                              ),
                            ),
                            const SizedBox(height: 10),
                            Wrap(
                              spacing: 8,
                              runSpacing: 8,
                              children: [
                                _TagChip(
                                  icon: Icons.group_outlined,
                                  label: _audienceLabel(form.audience),
                                ),
                                _TagChip(
                                  icon: Icons.flag_outlined,
                                  label: _formStatusLabel(form.status),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 12),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(
                            '${form.responsesCount}',
                            style: Theme.of(context).textTheme.titleLarge
                                ?.copyWith(fontWeight: FontWeight.w800),
                          ),
                          const Text(
                            'respostas',
                            style: TextStyle(color: AppColors.textSecondary),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
      ],
    );
  }
}

class _DiagnosisOverview extends StatelessWidget {
  const _DiagnosisOverview({
    required this.score,
    required this.areas,
    required this.alerts,
    required this.recommendation,
  });

  final int score;
  final List<_CompanyAreaMetric> areas;
  final List<String> alerts;
  final String recommendation;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Wrap(
          spacing: 12,
          runSpacing: 12,
          children: [
            _MiniMetric(label: 'Nota geral', value: '$score'),
            _MiniMetric(label: 'Areas avaliadas', value: '${areas.length}'),
            _MiniMetric(label: 'Pontos de atencao', value: '${alerts.length}'),
          ],
        ),
        const SizedBox(height: 16),
        ...areas.map(
          (area) => Padding(
            padding: const EdgeInsets.only(bottom: 12),
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
                LinearProgressIndicator(value: area.progress, minHeight: 8),
              ],
            ),
          ),
        ),
        const SizedBox(height: 8),
        ...alerts
            .take(2)
            .map(
              (alert) => Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(Icons.warning_amber_outlined, size: 18),
                    const SizedBox(width: 8),
                    Expanded(child: Text(alert)),
                  ],
                ),
              ),
            ),
        const SizedBox(height: 8),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: AppColors.surfaceMuted,
            borderRadius: BorderRadius.circular(16),
          ),
          child: Text('Recomendacao principal: $recommendation'),
        ),
      ],
    );
  }
}

class _PlanOverview extends StatelessWidget {
  const _PlanOverview({required this.activePlan, required this.plans});

  final ActionItem? activePlan;
  final List<ActionItem> plans;

  @override
  Widget build(BuildContext context) {
    if (activePlan == null) {
      return const Text('Nenhum plano ativo vinculado a esta empresa.');
    }

    final progress = switch (activePlan!.status) {
      ActionStatus.pending => 0.25,
      ActionStatus.inProgress => 0.65,
      ActionStatus.done => 1.0,
    };

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Wrap(
          spacing: 12,
          runSpacing: 12,
          children: [
            _MiniMetric(label: 'Planos ativos', value: '${plans.length}'),
            _MiniMetric(label: 'Prioridade', value: activePlan!.priority),
            _MiniMetric(
              label: 'Prazo',
              value: DateFormatter.formatDate(activePlan!.dueDate),
            ),
          ],
        ),
        const SizedBox(height: 16),
        Text(
          activePlan!.title,
          style: Theme.of(
            context,
          ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
        ),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            Chip(label: Text(_planStatusLabel(activePlan!.status))),
            Chip(label: Text('Prioridade ${activePlan!.priority}')),
            Chip(
              label: Text(
                'Prazo ${activePlan!.dueDate.day}/${activePlan!.dueDate.month}',
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        LinearProgressIndicator(value: progress, minHeight: 10),
        const SizedBox(height: 8),
        Text('Progresso ${(progress * 100).round()}%'),
        const SizedBox(height: 12),
        Text('Proxima tarefa: ${activePlan!.description}'),
        const SizedBox(height: 16),
        Text(
          'Etapas recentes',
          style: Theme.of(
            context,
          ).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: 8),
        ...plans
            .take(3)
            .map(
              (plan) => Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(
                      _actionStatusIcon(plan.status),
                      size: 18,
                      color: _actionStatusColor(plan.status),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        '${plan.title} | ${plan.description}',
                        style: const TextStyle(color: AppColors.textSecondary),
                      ),
                    ),
                  ],
                ),
              ),
            ),
      ],
    );
  }
}

class _ReportsOverview extends StatelessWidget {
  const _ReportsOverview({required this.reports});

  final List<ReportSummary> reports;

  @override
  Widget build(BuildContext context) {
    if (reports.isEmpty) {
      return const Text('Nenhum relatorio gerado para esta empresa.');
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: reports.take(3).map((report) {
        return Container(
          margin: const EdgeInsets.only(bottom: 12),
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: AppColors.surfaceMuted,
            borderRadius: BorderRadius.circular(16),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(Icons.description_outlined),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          report.companyName,
                          style: Theme.of(context).textTheme.titleSmall
                              ?.copyWith(fontWeight: FontWeight.w700),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '${report.maturityLabel ?? '-'} | ${report.completedAt == null ? '-' : DateFormatter.formatDate(report.completedAt!)}',
                          style: const TextStyle(
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                  _StatusPill(
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
              Text(
                'Score ${report.overallScore?.toStringAsFixed(1) ?? '-'} | ${report.respondentRole ?? '-'} | ${report.department ?? '-'}',
                style: const TextStyle(color: AppColors.textSecondary),
              ),
              const SizedBox(height: 12),
              Align(
                alignment: Alignment.centerRight,
                child: TextButton.icon(
                  onPressed: () =>
                      context.go('/reports/${report.submissionId}'),
                  icon: const Icon(Icons.visibility_outlined),
                  label: const Text('Visualizar'),
                ),
              ),
            ],
          ),
        );
      }).toList(),
    );
  }
}

class _MiniMetric extends StatelessWidget {
  const _MiniMetric({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: const BoxConstraints(minWidth: 140),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: AppColors.surfaceMuted,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            value,
            style: Theme.of(
              context,
            ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 4),
          Text(label, style: const TextStyle(color: AppColors.textSecondary)),
        ],
      ),
    );
  }
}

class _CompanyAreaMetric {
  const _CompanyAreaMetric({required this.name, required this.progress});

  final String name;
  final double progress;
}

String _audienceLabel(FormAudience audience) {
  switch (audience) {
    case FormAudience.manager:
      return 'Dono/Gestor';
    case FormAudience.employee:
      return 'Funcionario/Colaborador';
  }
}

String _formStatusLabel(FormStatus status) {
  switch (status) {
    case FormStatus.draft:
      return 'Pendente';
    case FormStatus.sent:
      return 'Enviado';
    case FormStatus.archived:
      return 'Arquivado';
  }
}

String _planStatusLabel(ActionStatus status) {
  switch (status) {
    case ActionStatus.pending:
      return 'Pendente';
    case ActionStatus.inProgress:
      return 'Em andamento';
    case ActionStatus.done:
      return 'Concluido';
  }
}

String _clientStatusLabel(ClientStatus status) {
  switch (status) {
    case ClientStatus.active:
      return 'Ativa';
    case ClientStatus.paused:
      return 'Pausada';
    case ClientStatus.closed:
      return 'Arquivada';
  }
}

class _DetailMetric extends StatelessWidget {
  const _DetailMetric({
    required this.label,
    required this.value,
    required this.icon,
    this.emphasisColor,
  });

  final String label;
  final String value;
  final IconData icon;
  final Color? emphasisColor;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 220,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surfaceMuted,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            height: 40,
            width: 40,
            decoration: BoxDecoration(
              color: (emphasisColor ?? AppColors.primary).withValues(
                alpha: 0.12,
              ),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: emphasisColor ?? AppColors.primary),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: const TextStyle(color: AppColors.textSecondary),
                ),
                const SizedBox(height: 4),
                Text(
                  value,
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w800,
                    color: emphasisColor,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _TagChip extends StatelessWidget {
  const _TagChip({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 16, color: AppColors.textSecondary),
          const SizedBox(width: 8),
          ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 260),
            child: Text(
              label,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(color: AppColors.textSecondary),
            ),
          ),
        ],
      ),
    );
  }
}

class _StatusPill extends StatelessWidget {
  const _StatusPill({required this.label, required this.color});

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
        style: TextStyle(color: color, fontWeight: FontWeight.w700),
      ),
    );
  }
}

Color _companyStatusColor(ClientStatus status) {
  switch (status) {
    case ClientStatus.active:
      return AppColors.success;
    case ClientStatus.paused:
      return AppColors.amber;
    case ClientStatus.closed:
      return AppColors.danger;
  }
}

Color _actionStatusColor(ActionStatus status) {
  switch (status) {
    case ActionStatus.pending:
      return AppColors.amber;
    case ActionStatus.inProgress:
      return AppColors.primary;
    case ActionStatus.done:
      return AppColors.success;
  }
}

IconData _actionStatusIcon(ActionStatus status) {
  switch (status) {
    case ActionStatus.pending:
      return Icons.radio_button_unchecked;
    case ActionStatus.inProgress:
      return Icons.timelapse_outlined;
    case ActionStatus.done:
      return Icons.check_circle_outline;
  }
}

class _ClientEditorDialog extends StatefulWidget {
  const _ClientEditorDialog({this.client});

  final Client? client;

  @override
  State<_ClientEditorDialog> createState() => _ClientEditorDialogState();
}

class _ClientEditorDialogState extends State<_ClientEditorDialog> {
  late final TextEditingController _nameController;
  late final TextEditingController _segmentController;
  late final TextEditingController _ownerController;
  late final TextEditingController _emailController;
  late final TextEditingController _nextStepController;
  late final TextEditingController _notesController;
  double _progress = 0.5;
  double _score = 70;
  ClientStatus _status = ClientStatus.active;

  @override
  void initState() {
    super.initState();
    final client = widget.client;
    _nameController = TextEditingController(text: client?.name ?? '');
    _segmentController = TextEditingController(text: client?.segment ?? '');
    _ownerController = TextEditingController(text: client?.owner ?? '');
    _emailController = TextEditingController(text: client?.contactEmail ?? '');
    _nextStepController = TextEditingController(text: client?.nextStep ?? '');
    _notesController = TextEditingController(text: client?.notes ?? '');
    _progress = client?.progress ?? 0.5;
    _score = (client?.score ?? 70).toDouble();
    _status = client?.status ?? ClientStatus.active;
  }

  @override
  void dispose() {
    _nameController.dispose();
    _segmentController.dispose();
    _ownerController.dispose();
    _emailController.dispose();
    _nextStepController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text(widget.client == null ? 'Nova empresa' : 'Editar empresa'),
      content: SizedBox(
        width: 560,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: _nameController,
                decoration: const InputDecoration(labelText: 'Nome'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _segmentController,
                decoration: const InputDecoration(labelText: 'Segmento'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _ownerController,
                decoration: const InputDecoration(
                  labelText: 'Responsavel principal',
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _emailController,
                decoration: const InputDecoration(
                  labelText: 'Email de contato',
                ),
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<ClientStatus>(
                initialValue: _status,
                items: const [
                  DropdownMenuItem(
                    value: ClientStatus.active,
                    child: Text('Ativa'),
                  ),
                  DropdownMenuItem(
                    value: ClientStatus.paused,
                    child: Text('Pausada'),
                  ),
                  DropdownMenuItem(
                    value: ClientStatus.closed,
                    child: Text('Arquivada'),
                  ),
                ],
                onChanged: (value) =>
                    setState(() => _status = value ?? ClientStatus.active),
                decoration: const InputDecoration(labelText: 'Status'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _nextStepController,
                decoration: const InputDecoration(labelText: 'Proximo passo'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _notesController,
                maxLines: 3,
                decoration: const InputDecoration(labelText: 'Observacoes'),
              ),
              const SizedBox(height: 12),
              Align(
                alignment: Alignment.centerLeft,
                child: Text('Progresso ${(100 * _progress).round()}%'),
              ),
              Slider(
                value: _progress,
                onChanged: (value) => setState(() => _progress = value),
              ),
              Align(
                alignment: Alignment.centerLeft,
                child: Text('Score ${_score.round()}'),
              ),
              Slider(
                min: 0,
                max: 100,
                value: _score,
                onChanged: (value) => setState(() => _score = value),
              ),
            ],
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Cancelar'),
        ),
        FilledButton(onPressed: _save, child: const Text('Salvar')),
      ],
    );
  }

  void _save() {
    final name = _nameController.text.trim();
    final segment = _segmentController.text.trim();
    final owner = _ownerController.text.trim();
    final email = _emailController.text.trim();
    final nextStep = _nextStepController.text.trim();
    if (name.isEmpty ||
        segment.isEmpty ||
        owner.isEmpty ||
        email.isEmpty ||
        nextStep.isEmpty) {
      return;
    }

    Navigator.pop(
      context,
      Client(
        id: widget.client?.id ?? 'c-${DateTime.now().microsecondsSinceEpoch}',
        name: name,
        segment: segment,
        progress: _progress,
        status: _status,
        nextStep: nextStep,
        score: _score.round(),
        lastUpdatedAt: DateTime.now(),
        owner: owner,
        contactEmail: email,
        notes: _notesController.text.trim(),
      ),
    );
  }
}
