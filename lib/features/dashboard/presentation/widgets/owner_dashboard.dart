import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';
import 'dashboard_banner.dart';
import 'dashboard_info_panel.dart';
import 'kpi_card.dart';

class OwnerDashboard extends StatelessWidget {
  const OwnerDashboard({
    super.key,
    required this.data,
  });

  final Map<String, dynamic> data;

  @override
  Widget build(BuildContext context) {
    final company = (data['company'] as Map<String, dynamic>?) ?? const {};
    final metrics = (data['metrics'] as Map<String, dynamic>?) ?? const {};
    final problems = ((data['problems'] as List?) ?? const []).map((item) => item.toString()).toList();
    final actions = ((data['actions'] as List?) ?? const []).map((item) => item.toString()).toList();

    return ListView(
      children: [
        DashboardBanner(
          title: 'Visao executiva da empresa.',
          subtitle:
              'Acompanhe score geral, gargalos principais e acoes recomendadas para acelerar a evolucao do negocio.',
          stats: [
            DashboardBannerStat(
              label: 'Score',
              value: '${company['score'] ?? 0}%',
            ),
            DashboardBannerStat(
              label: 'Progresso',
              value: '${company['progress'] ?? 0}%',
            ),
          ],
        ),
        const SizedBox(height: 20),
        LayoutBuilder(
          builder: (context, constraints) {
            final columns = constraints.maxWidth >= 1200
                ? 3
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
              children: [
                KpiCard(
                  label: 'Score da empresa',
                  value: '${company['score'] ?? 0}%',
                  icon: Icons.insights_outlined,
                  trend: '${company['progress'] ?? 0}% concluido',
                  color: AppColors.primary,
                ),
                KpiCard(
                  label: 'Problemas priorizados',
                  value: '${problems.length}',
                  icon: Icons.priority_high_outlined,
                  trend: 'Foco imediato',
                  color: AppColors.amber,
                ),
                KpiCard(
                  label: 'Perguntas respondidas',
                  value: '${metrics['answeredQuestions'] ?? 0}/${metrics['totalQuestions'] ?? 0}',
                  icon: Icons.task_alt_outlined,
                  trend: 'Progresso geral',
                  color: AppColors.teal,
                ),
              ],
            );
          },
        ),
        const SizedBox(height: 20),
        LayoutBuilder(
          builder: (context, constraints) {
            final isWide = constraints.maxWidth >= 1080;

            final problemsPanel = DashboardInfoPanel(
              title: 'Principais problemas',
              subtitle: 'Gargalos mais relevantes da empresa.',
              items: problems,
              color: AppColors.amber,
            );

            final actionsPanel = DashboardInfoPanel(
              title: 'Acoes recomendadas',
              subtitle: 'Proximas acoes sugeridas para a empresa.',
              items: actions,
              color: AppColors.primary,
            );

            if (isWide) {
              return Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(child: problemsPanel),
                  const SizedBox(width: 16),
                  Expanded(child: actionsPanel),
                ],
              );
            }

            return Column(
              children: [
                problemsPanel,
                const SizedBox(height: 16),
                actionsPanel,
              ],
            );
          },
        ),
      ],
    );
  }
}
