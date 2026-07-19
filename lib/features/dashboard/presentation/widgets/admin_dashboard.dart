import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/utils/date_formatter.dart';
import '../../../../core/widgets/section_header.dart';
import 'dashboard_banner.dart';
import 'kpi_card.dart';

class AdminDashboard extends StatelessWidget {
  const AdminDashboard({super.key, required this.data});

  final Map<String, dynamic> data;

  @override
  Widget build(BuildContext context) {
    final metrics = _readMap(data['metrics']);
    final companies = _readList(data['lowestScoreCompanies']);
    final recentResearch = _readList(data['recentResearch']);
    final recentTasks = _readList(data['recentTasks']);

    return ListView(
      children: [
        DashboardBanner(
          title: 'Visao geral da consultoria.',
          subtitle:
              'Resumo real do SaaS com empresas, usuarios, pesquisas e execucao do plano de acao.',
          stats: [
            DashboardBannerStat(
              label: 'Empresas',
              value: '${metrics['companiesTotal'] ?? 0}',
            ),
            DashboardBannerStat(
              label: 'Pesquisas',
              value: '${metrics['researchTotal'] ?? 0}',
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
              label: 'Empresas',
              value: '${metrics['companiesTotal'] ?? 0}',
              icon: Icons.apartment_outlined,
              color: AppColors.primary,
            ),
            _KpiData(
              label: 'Usuarios',
              value: '${metrics['usersTotal'] ?? 0}',
              icon: Icons.manage_accounts_outlined,
              color: AppColors.indigo,
            ),
            _KpiData(
              label: 'Pesquisas',
              value: '${metrics['researchTotal'] ?? 0}',
              icon: Icons.search_outlined,
              color: AppColors.teal,
            ),
            _KpiData(
              label: 'Concluidas',
              value: '${metrics['completedResearchTotal'] ?? 0}',
              icon: Icons.verified_outlined,
              color: AppColors.success,
            ),
            _KpiData(
              label: 'Score medio',
              value: _score(metrics['averageScore']),
              icon: Icons.insights_outlined,
              color: AppColors.primaryDark,
            ),
            _KpiData(
              label: 'Tarefas abertas',
              value: '${metrics['openTasks'] ?? 0}',
              icon: Icons.playlist_add_check_circle_outlined,
              color: AppColors.amber,
            ),
            _KpiData(
              label: 'Tarefas atrasadas',
              value: '${metrics['overdueTasks'] ?? 0}',
              icon: Icons.warning_amber_outlined,
              color: AppColors.danger,
            ),
            _KpiData(
              label: 'Tarefas concluidas',
              value: '${metrics['doneTasks'] ?? 0}',
              icon: Icons.task_alt_outlined,
              color: AppColors.success,
            ),
          ],
        ),
        const SizedBox(height: 20),
        const SectionHeader(
          title: 'Empresas com menor score',
          subtitle: 'Contas com menor media entre pesquisas concluidas.',
        ),
        const SizedBox(height: 8),
        if (companies.isEmpty)
          const _EmptyCard(
            message: 'Nenhuma empresa com score calculado ate o momento.',
          )
        else
          ...companies.map(
            (item) => _CompanyScoreCard(company: _readMap(item)),
          ),
        const SizedBox(height: 20),
        const SectionHeader(
          title: 'Ultimas pesquisas',
          subtitle: 'Pesquisas mais recentes registradas no SaaS.',
        ),
        const SizedBox(height: 8),
        if (recentResearch.isEmpty)
          const _EmptyCard(message: 'Nenhuma pesquisa registrada.')
        else
          ...recentResearch.map(
            (item) =>
                _ResearchCard(research: _readMap(item), showCompany: true),
          ),
        const SizedBox(height: 20),
        const SectionHeader(
          title: 'Tarefas recentes',
          subtitle: 'Ultimas tarefas criadas no plano de acao.',
        ),
        const SizedBox(height: 8),
        if (recentTasks.isEmpty)
          const _EmptyCard(message: 'Nenhuma tarefa registrada.')
        else
          ...recentTasks.map(
            (item) => _TaskCard(task: _readMap(item), showCompany: true),
          ),
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

class _CompanyScoreCard extends StatelessWidget {
  const _CompanyScoreCard({required this.company});

  final Map<String, dynamic> company;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: ListTile(
        contentPadding: const EdgeInsets.all(16),
        leading: const CircleAvatar(child: Icon(Icons.business_outlined)),
        title: Text(company['companyName']?.toString() ?? 'Empresa'),
        subtitle: Text(
          '${company['completedResearchTotal'] ?? 0} pesquisas concluidas | ${company['usersTotal'] ?? 0} usuarios',
        ),
        trailing: Text(
          _score(company['averageScore']),
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.w800,
            color: AppColors.danger,
          ),
        ),
      ),
    );
  }
}

class _ResearchCard extends StatelessWidget {
  const _ResearchCard({required this.research, required this.showCompany});

  final Map<String, dynamic> research;
  final bool showCompany;

  @override
  Widget build(BuildContext context) {
    final createdAt = _date(research['createdAt']);
    final status = research['status']?.toString() ?? '-';

    return Card(
      child: ListTile(
        contentPadding: const EdgeInsets.all(16),
        leading: const CircleAvatar(child: Icon(Icons.analytics_outlined)),
        title: Text(
          '${research['respondentRole'] ?? 'Sem funcao'} | ${research['department'] ?? 'Sem setor'}',
        ),
        subtitle: Text(
          [
            if (showCompany) research['companyName']?.toString() ?? '',
            research['userName']?.toString() ?? '',
            if (createdAt != null)
              DateFormatter.formatDateTime(createdAt.toLocal()),
          ].where((item) => item.trim().isNotEmpty).join(' | '),
        ),
        trailing: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text(
              _score(research['overallScore']),
              style: Theme.of(
                context,
              ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 4),
            Text(
              status,
              style: TextStyle(
                color: status == 'COMPLETED'
                    ? AppColors.success
                    : AppColors.amber,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _TaskCard extends StatelessWidget {
  const _TaskCard({required this.task, required this.showCompany});

  final Map<String, dynamic> task;
  final bool showCompany;

  @override
  Widget build(BuildContext context) {
    final dueDate = _date(task['dueDate']);
    return Card(
      child: ListTile(
        contentPadding: const EdgeInsets.all(16),
        leading: const CircleAvatar(child: Icon(Icons.task_alt_outlined)),
        title: Text(task['title']?.toString() ?? 'Tarefa'),
        subtitle: Text(
          [
            if (showCompany) task['companyName']?.toString() ?? '',
            task['priority']?.toString() ?? '',
            task['status']?.toString() ?? '',
            if (dueDate != null)
              'Prazo ${DateFormatter.formatDate(dueDate.toLocal())}',
          ].where((item) => item.trim().isNotEmpty).join(' | '),
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
