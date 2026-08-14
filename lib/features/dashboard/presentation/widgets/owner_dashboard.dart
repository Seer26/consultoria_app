import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/utils/date_formatter.dart';
import '../../../../core/widgets/section_header.dart';
import '../../../action_plan/presentation/action_plan_labels.dart';
import 'dashboard_banner.dart';
import 'dashboard_info_panel.dart';
import 'kpi_card.dart';
import 'owner_onboarding_checklist.dart';

class OwnerDashboard extends StatelessWidget {
  const OwnerDashboard({super.key, required this.data});

  final Map<String, dynamic> data;

  @override
  Widget build(BuildContext context) {
    final company = _readMap(data['company']);
    final onboarding = _readMap(data['onboarding']);
    final strategySummary = _readMap(data['strategySummary']);
    final metrics = _readMap(data['metrics']);
    final pillarScores = _readList(data['pillarScores']);
    final criticalPoints = _readStrings(data['criticalPoints']);
    final opportunities = _readStrings(data['opportunities']);
    final recentResearch = _readList(data['recentResearch']);
    final upcomingTasks = _readList(data['upcomingTasks']);
    final overdueTasks = _readList(data['overdueTasks']);
    final dueSoonTasks = _readList(data['dueSoonTasks']);
    final recentTasks = _readList(data['recentTasks']);
    final latestCompletedResearch = _readMap(data['latestCompletedResearch']);

    return ListView(
      children: [
        DashboardBanner(
          title: 'Visao executiva da empresa.',
          subtitle:
              'Score medio, saude por pilar, pontos criticos e execucao do plano de acao da empresa.',
          stats: [
            DashboardBannerStat(
              label: 'Empresa',
              value: company['name']?.toString() ?? '-',
            ),
            DashboardBannerStat(
              label: 'Score medio',
              value: _score(metrics['averageScore']),
            ),
            DashboardBannerStat(
              label: 'Pesquisas concluidas',
              value: '${metrics['completedResearchTotal'] ?? 0}',
            ),
          ],
        ),
        const SizedBox(height: 20),
        OwnerOnboardingChecklist(data: onboarding),
        const SizedBox(height: 20),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(18),
            child: LayoutBuilder(
              builder: (context, constraints) {
                final summary = Row(
                  children: [
                    const CircleAvatar(
                      child: Icon(Icons.account_tree_outlined),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Resumo estratégico',
                            style: TextStyle(fontWeight: FontWeight.w800),
                          ),
                          Text(
                            '${strategySummary['activeObjectives'] ?? 0} objetivo(s) ativo(s) · ${strategySummary['goalsDueSoon'] ?? 0} meta(s) próxima(s) do prazo · ${strategySummary['progress'] ?? 0}% concluído',
                          ),
                        ],
                      ),
                    ),
                  ],
                );
                final button = TextButton(
                  onPressed: () => context.go('/strategy'),
                  child: const Text('Ver estratégia'),
                );
                return constraints.maxWidth < 600
                    ? Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [summary, const SizedBox(height: 8), button],
                      )
                    : Row(
                        children: [
                          Expanded(child: summary),
                          button,
                        ],
                      );
              },
            ),
          ),
        ),
        const SizedBox(height: 20),
        _MetricsGrid(
          cards: [
            _KpiData(
              label: 'Usuarios',
              value: '${metrics['usersCompanyTotal'] ?? 0}',
              icon: Icons.groups_2_outlined,
              color: AppColors.primary,
            ),
            _KpiData(
              label: 'Pesquisas',
              value: '${metrics['researchTotal'] ?? 0}',
              icon: Icons.search_outlined,
              color: AppColors.indigo,
            ),
            _KpiData(
              label: 'Score medio',
              value: _score(metrics['averageScore']),
              icon: Icons.insights_outlined,
              color: AppColors.teal,
            ),
            _KpiData(
              label: 'Tarefas abertas',
              value: '${metrics['openTasks'] ?? 0}',
              icon: Icons.playlist_add_check_circle_outlined,
              color: AppColors.amber,
            ),
            _KpiData(
              label: 'Em andamento',
              value: '${metrics['inProgressTasks'] ?? 0}',
              icon: Icons.timelapse_outlined,
              color: AppColors.indigo,
            ),
            _KpiData(
              label: 'Concluidas',
              value: '${metrics['doneTasks'] ?? 0}',
              icon: Icons.task_alt_outlined,
              color: AppColors.success,
            ),
            _KpiData(
              label: 'Atrasadas',
              value: '${metrics['overdueTasks'] ?? 0}',
              icon: Icons.warning_amber_outlined,
              color: AppColors.danger,
            ),
            _KpiData(
              label: 'Críticas atrasadas',
              value: '${metrics['criticalOverdueTasks'] ?? 0}',
              icon: Icons.gpp_bad_outlined,
              color: const Color(0xFF7A1828),
            ),
            _KpiData(
              label: 'Vencem em 7 dias',
              value: '${metrics['dueSoonTasks'] ?? 0}',
              icon: Icons.event_busy_outlined,
              color: AppColors.amber,
            ),
          ],
        ),
        const SizedBox(height: 20),
        if (latestCompletedResearch.isNotEmpty) ...[
          const SectionHeader(
            title: 'Saude da empresa',
            subtitle:
                'Resumo da ultima pesquisa concluida e maturidade por pilar.',
          ),
          const SizedBox(height: 8),
          Card(
            child: ListTile(
              contentPadding: const EdgeInsets.all(16),
              leading: const CircleAvatar(child: Icon(Icons.favorite_outline)),
              title: Text(
                '${latestCompletedResearch['respondentRole'] ?? 'Sem funcao'} | ${latestCompletedResearch['department'] ?? 'Sem setor'}',
              ),
              subtitle: Text(
                latestCompletedResearch['completedAt'] == null
                    ? 'Sem data de conclusao'
                    : 'Concluida em ${DateFormatter.formatDateTime(_date(latestCompletedResearch['completedAt'])!.toLocal())}',
              ),
              trailing: Text(
                _score(latestCompletedResearch['overallScore']),
                style: Theme.of(
                  context,
                ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800),
              ),
            ),
          ),
          const SizedBox(height: 12),
        ],
        _PillarScoreSection(pillarScores: pillarScores),
        const SizedBox(height: 20),
        LayoutBuilder(
          builder: (context, constraints) {
            final isWide = constraints.maxWidth >= 1080;
            final criticalPanel = DashboardInfoPanel(
              title: 'Pontos criticos',
              subtitle: 'Principais gargalos recentes da empresa.',
              items: criticalPoints,
              color: AppColors.danger,
            );
            final opportunityPanel = DashboardInfoPanel(
              title: 'Oportunidades',
              subtitle:
                  'Frentes favoraveis identificadas nas pesquisas recentes.',
              items: opportunities,
              color: AppColors.teal,
            );

            if (isWide) {
              return Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(child: criticalPanel),
                  const SizedBox(width: 16),
                  Expanded(child: opportunityPanel),
                ],
              );
            }

            return Column(
              children: [
                criticalPanel,
                const SizedBox(height: 16),
                opportunityPanel,
              ],
            );
          },
        ),
        const SizedBox(height: 20),
        _AttentionSection(
          title: 'Tarefas atrasadas',
          subtitle: 'Pendências que já ultrapassaram o prazo.',
          tasks: overdueTasks,
          color: AppColors.danger,
          emptyMessage: 'Nenhuma tarefa atrasada.',
          onOpenAll: () => context.go('/tasks?filter=overdue'),
        ),
        const SizedBox(height: 20),
        _AttentionSection(
          title: 'Vencem em breve',
          subtitle: 'Tarefas com prazo nos próximos sete dias.',
          tasks: dueSoonTasks,
          color: AppColors.amber,
          emptyMessage: 'Nenhuma tarefa próxima do vencimento.',
          onOpenAll: () => context.go('/tasks?filter=dueSoon'),
        ),
        const SizedBox(height: 20),
        const SectionHeader(
          title: 'Plano de acao',
          subtitle: 'Proximas tarefas da empresa e execucao recente.',
        ),
        const SizedBox(height: 8),
        if (upcomingTasks.isEmpty)
          const _EmptyCard(message: 'Nao ha tarefas abertas no momento.')
        else
          ...upcomingTasks.map((item) => _TaskCard(task: _readMap(item))),
        const SizedBox(height: 20),
        const SectionHeader(
          title: 'Ultimas pesquisas',
          subtitle: 'Historico recente da empresa.',
        ),
        const SizedBox(height: 8),
        if (recentResearch.isEmpty)
          const _EmptyCard(
            message: 'Nenhuma pesquisa registrada para a empresa.',
          )
        else
          ...recentResearch.map(
            (item) => _ResearchCard(
              research: _readMap(item),
              onTap: () {
                final id = _readMap(item)['id']?.toString();
                if (id != null && id.isNotEmpty) context.go('/research/$id');
              },
            ),
          ),
        const SizedBox(height: 20),
        const SectionHeader(
          title: 'Tarefas recentes',
          subtitle: 'Ultimas tarefas criadas para o plano de acao.',
        ),
        const SizedBox(height: 8),
        if (recentTasks.isEmpty)
          const _EmptyCard(message: 'Nenhuma tarefa recente encontrada.')
        else
          ...recentTasks.map((item) => _TaskCard(task: _readMap(item))),
      ],
    );
  }
}

class _PillarScoreSection extends StatelessWidget {
  const _PillarScoreSection({required this.pillarScores});

  final List<Map<String, dynamic>> pillarScores;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SectionHeader(
              title: 'Score por pilar',
              subtitle: 'Maturidade da ultima pesquisa concluida.',
            ),
            if (pillarScores.isEmpty)
              const Padding(
                padding: EdgeInsets.only(top: 8),
                child: Text('Nenhum score por pilar disponivel.'),
              )
            else
              ...pillarScores.map(
                (item) => Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Row(
                    children: [
                      Expanded(
                        child: Text(
                          item['pillar']?.toString() ?? '-',
                          style: const TextStyle(fontWeight: FontWeight.w700),
                        ),
                      ),
                      Text(
                        _score(item['score']),
                        style: const TextStyle(fontWeight: FontWeight.w800),
                      ),
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

class _MetricsGrid extends StatelessWidget {
  const _MetricsGrid({required this.cards});

  final List<_KpiData> cards;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final columns = constraints.maxWidth >= 1200
            ? 4
            : constraints.maxWidth >= 780
            ? 2
            : 1;

        return GridView.count(
          crossAxisCount: columns,
          childAspectRatio: 1.65,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          crossAxisSpacing: 16,
          mainAxisSpacing: 16,
          children: cards
              .map(
                (card) => KpiCard(
                  label: card.label,
                  value: card.value,
                  icon: card.icon,
                  color: card.color,
                ),
              )
              .toList(),
        );
      },
    );
  }
}

class _KpiData {
  const _KpiData({
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
  });

  final String label;
  final String value;
  final IconData icon;
  final Color color;
}

class _ResearchCard extends StatelessWidget {
  const _ResearchCard({required this.research, this.onTap});

  final Map<String, dynamic> research;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final createdAt = _date(research['createdAt']);

    return Card(
      child: ListTile(
        onTap: onTap,
        contentPadding: const EdgeInsets.all(16),
        leading: const CircleAvatar(child: Icon(Icons.analytics_outlined)),
        title: Text(
          '${research['respondentRole'] ?? 'Sem funcao'} | ${research['department'] ?? 'Sem setor'}',
        ),
        subtitle: Text(
          [
            research['userName']?.toString() ?? '',
            if (createdAt != null)
              DateFormatter.formatDateTime(createdAt.toLocal()),
            research['status']?.toString() ?? '',
          ].where((item) => item.trim().isNotEmpty).join(' | '),
        ),
        trailing: Text(
          _score(research['overallScore']),
          style: Theme.of(
            context,
          ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
        ),
      ),
    );
  }
}

class _TaskCard extends StatelessWidget {
  const _TaskCard({required this.task});

  final Map<String, dynamic> task;

  @override
  Widget build(BuildContext context) {
    final dueDate = _date(task['dueDate']);
    final isOverdue = task['isOverdue'] == true;
    final isDueSoon = task['isDueSoon'] == true;
    return Card(
      child: ListTile(
        onTap: () => context.go(
          isOverdue
              ? '/tasks?filter=overdue'
              : isDueSoon
              ? '/tasks?filter=dueSoon'
              : '/tasks',
        ),
        contentPadding: const EdgeInsets.all(16),
        leading: const CircleAvatar(child: Icon(Icons.task_alt_outlined)),
        title: Text(task['title']?.toString() ?? 'Tarefa'),
        subtitle: Text(
          [
            actionPlanPriorityLabel(task['priority']),
            actionPlanStatusLabel(task['status']),
            task['pillar']?.toString() ?? '',
            if (dueDate != null)
              'Prazo ${DateFormatter.formatDate(dueDate.toLocal())}',
          ].where((item) => item.trim().isNotEmpty).join(' | '),
        ),
        trailing: isOverdue
            ? Chip(
                backgroundColor: AppColors.danger,
                label: Text(
                  '${task['daysOverdue'] ?? 0} dia(s) atrasada',
                  style: const TextStyle(color: Colors.white),
                ),
              )
            : isDueSoon
            ? const Chip(label: Text('Vence em breve'))
            : null,
      ),
    );
  }
}

class _AttentionSection extends StatelessWidget {
  const _AttentionSection({
    required this.title,
    required this.subtitle,
    required this.tasks,
    required this.color,
    required this.emptyMessage,
    required this.onOpenAll,
  });

  final String title;
  final String subtitle;
  final List<Map<String, dynamic>> tasks;
  final Color color;
  final String emptyMessage;
  final VoidCallback onOpenAll;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: SectionHeader(title: title, subtitle: subtitle),
                ),
                TextButton.icon(
                  onPressed: onOpenAll,
                  icon: const Icon(Icons.arrow_forward),
                  label: const Text('Ver lista filtrada'),
                ),
              ],
            ),
            const SizedBox(height: 8),
            if (tasks.isEmpty)
              Text(
                emptyMessage,
                style: const TextStyle(color: AppColors.textSecondary),
              )
            else
              for (final task in tasks)
                Container(
                  margin: const EdgeInsets.only(top: 8),
                  decoration: BoxDecoration(
                    border: Border(left: BorderSide(color: color, width: 4)),
                  ),
                  child: _TaskCard(task: task),
                ),
          ],
        ),
      ),
    );
  }
}

class _EmptyCard extends StatelessWidget {
  const _EmptyCard({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Text(
          message,
          style: const TextStyle(color: AppColors.textSecondary),
        ),
      ),
    );
  }
}

Map<String, dynamic> _readMap(dynamic value) {
  if (value is Map<String, dynamic>) {
    return value;
  }
  if (value is Map) {
    return Map<String, dynamic>.from(value);
  }
  return const {};
}

List<Map<String, dynamic>> _readList(dynamic value) {
  if (value is! List) {
    return const [];
  }

  return value
      .whereType<Map>()
      .map((item) => Map<String, dynamic>.from(item))
      .toList();
}

List<String> _readStrings(dynamic value) {
  if (value is! List) {
    return const [];
  }

  return value.map((item) => item.toString()).toList();
}

String _score(dynamic value) {
  if (value == null) {
    return '-';
  }

  if (value is num) {
    return value.toStringAsFixed(1);
  }

  final parsed = num.tryParse(value.toString());
  if (parsed == null) {
    return '-';
  }

  return parsed.toStringAsFixed(1);
}

DateTime? _date(dynamic value) {
  final raw = value?.toString();
  if (raw == null || raw.isEmpty) {
    return null;
  }

  return DateTime.tryParse(raw);
}
