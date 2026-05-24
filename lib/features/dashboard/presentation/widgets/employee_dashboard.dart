import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';
import 'dashboard_banner.dart';
import 'dashboard_info_panel.dart';
import 'kpi_card.dart';

class EmployeeDashboard extends StatelessWidget {
  const EmployeeDashboard({
    super.key,
    required this.data,
  });

  final Map<String, dynamic> data;

  @override
  Widget build(BuildContext context) {
    final tasks = (data['tasks'] as List?) ?? const [];
    final progress = (data['progress'] as Map<String, dynamic>?) ?? const {};
    final diagnosis = (data['diagnosis'] as Map<String, dynamic>?) ?? const {};
    final pendingItems = ((diagnosis['pendingItems'] as List?) ?? const [])
        .map((item) => item.toString())
        .toList();

    return ListView(
      children: [
        DashboardBanner(
          title: 'Painel operacional do colaborador.',
          subtitle:
              'Visualize suas tarefas, avance no diagnostico e acompanhe sua propria evolucao no plano de execucao.',
          stats: [
            DashboardBannerStat(label: 'Tarefas', value: '${tasks.length}'),
            DashboardBannerStat(
              label: 'Progresso',
              value: '${progress['personalProgress'] ?? 0}%',
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
                  label: 'Tarefas atribuidas',
                  value: '${tasks.length}',
                  icon: Icons.assignment_outlined,
                  trend: 'Painel individual',
                  color: AppColors.primary,
                ),
                KpiCard(
                  label: 'Progresso pessoal',
                  value: '${progress['personalProgress'] ?? 0}%',
                  icon: Icons.show_chart_outlined,
                  trend: 'Semana atual',
                  color: AppColors.teal,
                ),
                KpiCard(
                  label: 'Diagnostico pendente',
                  value: '${progress['pendingDiagnosis'] ?? 0}',
                  icon: Icons.fact_check_outlined,
                  trend: 'Aguardando resposta',
                  color: AppColors.amber,
                ),
              ],
            );
          },
        ),
        const SizedBox(height: 20),
        LayoutBuilder(
          builder: (context, constraints) {
            final isWide = constraints.maxWidth >= 1080;

            final taskItems = tasks.map((item) {
              final task = item as Map<String, dynamic>;
              return '${task['title']} | ${task['status']} | ${task['priority']}';
            }).toList();

            final tasksPanel = DashboardInfoPanel(
              title: 'Tarefas atribuidas',
              subtitle: 'Entregas reais que exigem acao do colaborador.',
              items: taskItems,
              color: AppColors.primary,
            );

            final diagnosisPanel = DashboardInfoPanel(
              title: 'Diagnostico pendente',
              subtitle: 'Itens que ainda precisam ser respondidos ou revisados.',
              items: pendingItems,
              color: AppColors.amber,
            );

            if (isWide) {
              return Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(child: tasksPanel),
                  const SizedBox(width: 16),
                  Expanded(child: diagnosisPanel),
                ],
              );
            }

            return Column(
              children: [
                tasksPanel,
                const SizedBox(height: 16),
                diagnosisPanel,
              ],
            );
          },
        ),
      ],
    );
  }
}
