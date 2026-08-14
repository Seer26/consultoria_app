import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/utils/date_formatter.dart';
import '../../../../core/widgets/section_header.dart';
import '../../../action_plan/presentation/action_plan_labels.dart';
import 'dashboard_banner.dart';
import 'kpi_card.dart';

class EmployeeDashboard extends StatelessWidget {
  const EmployeeDashboard({super.key, required this.data});

  final Map<String, dynamic> data;

  @override
  Widget build(BuildContext context) {
    final metrics = _readMap(data['metrics']);
    final lastResearch = _readMap(data['lastResearch']);
    final recentResearch = _readList(data['recentResearch']);
    final recentTasks = _readList(data['recentTasks']);
    final upcomingTasks = _readList(data['upcomingTasks']);
    final overdueTasks = _readList(data['overdueTasks']);
    final dueSoonTasks = _readList(data['dueSoonTasks']);
    final companySummary = _readMap(data['companySummary']);

    return ListView(
      children: [
        DashboardBanner(
          title: 'Painel operacional do colaborador.',
          subtitle:
              'Acompanhe suas pesquisas, suas tarefas atribuídas e o que vence primeiro no plano de acao.',
          stats: [
            DashboardBannerStat(
              label: 'Minhas pesquisas',
              value: '${metrics['myResearchTotal'] ?? 0}',
            ),
            DashboardBannerStat(
              label: 'Minhas tarefas',
              value: '${metrics['assignedTasksTotal'] ?? 0}',
            ),
            DashboardBannerStat(
              label: 'Score medio',
              value: _score(metrics['averageScore']),
            ),
          ],
        ),
        const SizedBox(height: 20),
        _MetricsGrid(
          cards: [
            _KpiData(
              label: 'Pesquisas respondidas',
              value: '${metrics['myResearchTotal'] ?? 0}',
              icon: Icons.rate_review_outlined,
              color: AppColors.primary,
            ),
            _KpiData(
              label: 'Tarefas abertas',
              value: '${metrics['openTasks'] ?? 0}',
              icon: Icons.playlist_add_check_outlined,
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
        _AttentionSection(
          title: 'Minhas tarefas atrasadas',
          subtitle: 'Itens atribuídos a você que já ultrapassaram o prazo.',
          tasks: overdueTasks,
          color: AppColors.danger,
          emptyMessage: 'Você não tem tarefas atrasadas.',
          onOpenAll: () => context.go('/tasks?filter=overdue'),
        ),
        const SizedBox(height: 20),
        _AttentionSection(
          title: 'Próximas do vencimento',
          subtitle: 'Itens atribuídos a você com prazo nos próximos sete dias.',
          tasks: dueSoonTasks,
          color: AppColors.amber,
          emptyMessage: 'Nenhuma tarefa vence em breve.',
          onOpenAll: () => context.go('/tasks?filter=dueSoon'),
        ),
        const SizedBox(height: 20),
        const SectionHeader(
          title: 'Ultima pesquisa',
          subtitle: 'Ultima submissao respondida por voce.',
        ),
        const SizedBox(height: 8),
        if (lastResearch.isEmpty)
          const _EmptyCard(
            message: 'Voce ainda nao respondeu nenhuma pesquisa.',
          )
        else
          _ResearchCard(
            research: lastResearch,
            onTap: () => context.go('/research/${lastResearch['id']}'),
          ),
        const SizedBox(height: 20),
        if (companySummary.isNotEmpty) ...[
          const SectionHeader(
            title: 'Resumo da empresa',
            subtitle: 'Indicadores simples permitidos para o colaborador.',
          ),
          const SizedBox(height: 8),
          Card(
            child: ListTile(
              contentPadding: const EdgeInsets.all(16),
              leading: const CircleAvatar(child: Icon(Icons.business_outlined)),
              title: Text(companySummary['name']?.toString() ?? 'Empresa'),
              subtitle: Text(
                'Tarefas abertas ${companySummary['openTasks'] ?? 0} | atrasadas ${companySummary['overdueTasks'] ?? 0}',
              ),
              trailing: Text(
                _score(companySummary['averageScore']),
                style: Theme.of(
                  context,
                ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
              ),
            ),
          ),
          const SizedBox(height: 20),
        ],
        const SectionHeader(
          title: 'Proximas tarefas',
          subtitle: 'Tarefas atribuidas a voce que exigem acao primeiro.',
        ),
        const SizedBox(height: 8),
        if (upcomingTasks.isEmpty)
          const _EmptyCard(message: 'Nao ha tarefas atribuidas em aberto.')
        else
          ...upcomingTasks.map((item) => _TaskCard(task: _readMap(item))),
        const SizedBox(height: 20),
        const SectionHeader(
          title: 'Minhas pesquisas',
          subtitle: 'Historico recente das suas respostas.',
        ),
        const SizedBox(height: 8),
        if (recentResearch.isEmpty)
          const _EmptyCard(
            message: 'Nenhuma pesquisa encontrada para seu usuario.',
          )
        else
          ...recentResearch.map(
            (item) => _ResearchCard(
              research: _readMap(item),
              onTap: () => context.go('/research/${_readMap(item)['id']}'),
            ),
          ),
        const SizedBox(height: 20),
        const SectionHeader(
          title: 'Tarefas recentes',
          subtitle: 'Ultimas tarefas atribuidas a voce.',
        ),
        const SizedBox(height: 8),
        if (recentTasks.isEmpty)
          const _EmptyCard(message: 'Nenhuma tarefa atribuida recentemente.')
        else
          ...recentTasks.map((item) => _TaskCard(task: _readMap(item))),
      ],
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
