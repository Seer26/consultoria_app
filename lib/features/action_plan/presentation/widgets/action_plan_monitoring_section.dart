import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';
import '../../domain/entities/action_plan_monitoring.dart';

class ActionPlanMonitoringSection extends StatelessWidget {
  const ActionPlanMonitoringSection({
    super.key,
    required this.monitoring,
    this.showResponsibles = true,
  });

  final ActionPlanMonitoring monitoring;
  final bool showResponsibles;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Monitoramento da execução',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Resumo das tarefas exibidas nos filtros atuais.',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: AppColors.textSecondary,
                  ),
                ),
                const SizedBox(height: 16),
                Wrap(
                  spacing: 12,
                  runSpacing: 12,
                  children: [
                    _MonitoringMetric(
                      label: 'Total',
                      value: monitoring.totalTasks,
                      color: AppColors.primary,
                    ),
                    _MonitoringMetric(
                      label: 'Pendentes',
                      value: monitoring.pendingTasks,
                      color: AppColors.textSecondary,
                    ),
                    _MonitoringMetric(
                      label: 'Em andamento',
                      value: monitoring.inProgressTasks,
                      color: AppColors.indigo,
                    ),
                    _MonitoringMetric(
                      label: 'Concluídas',
                      value: monitoring.completedTasks,
                      color: AppColors.success,
                    ),
                    _MonitoringMetric(
                      label: 'Atrasadas',
                      value: monitoring.overdueTasks,
                      color: AppColors.danger,
                    ),
                    _MonitoringMetric(
                      label: 'Próximas do prazo',
                      value: monitoring.dueSoonTasks,
                      color: AppColors.amber,
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
        if (showResponsibles && monitoring.responsibles.isNotEmpty) ...[
          const SizedBox(height: 16),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Acompanhamento por responsável',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 12),
                  ...monitoring.responsibles.map(
                    (responsible) => Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: _ResponsibleMonitoringRow(
                        responsible: responsible,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ],
    );
  }
}

class _MonitoringMetric extends StatelessWidget {
  const _MonitoringMetric({
    required this.label,
    required this.value,
    required this.color,
  });

  final String label;
  final int value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 140,
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: AppColors.surfaceMuted,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.border),
        ),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                value.toString(),
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  color: color,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                label,
                style: Theme.of(
                  context,
                ).textTheme.bodySmall?.copyWith(color: AppColors.textSecondary),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ResponsibleMonitoringRow extends StatelessWidget {
  const _ResponsibleMonitoringRow({required this.responsible});

  final ActionPlanResponsibleMonitoring responsible;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        border: Border.all(color: AppColors.border),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Wrap(
          spacing: 12,
          runSpacing: 8,
          crossAxisAlignment: WrapCrossAlignment.center,
          children: [
            SizedBox(
              width: 180,
              child: Text(
                responsible.name,
                style: const TextStyle(fontWeight: FontWeight.w800),
              ),
            ),
            _ResponsibleMetric(label: 'Total', value: responsible.totalTasks),
            _ResponsibleMetric(
              label: 'Concluídas',
              value: responsible.completedTasks,
            ),
            _ResponsibleMetric(
              label: 'Em andamento',
              value: responsible.inProgressTasks,
            ),
            _ResponsibleMetric(
              label: 'Pendentes',
              value: responsible.pendingTasks,
            ),
            _ResponsibleMetric(
              label: 'Atrasadas',
              value: responsible.overdueTasks,
            ),
            Text(
              '${responsible.completionPercentage}% concluído',
              style: const TextStyle(
                color: AppColors.primary,
                fontWeight: FontWeight.w800,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ResponsibleMetric extends StatelessWidget {
  const _ResponsibleMetric({required this.label, required this.value});

  final String label;
  final int value;

  @override
  Widget build(BuildContext context) {
    return Text(
      '$label: $value',
      style: Theme.of(
        context,
      ).textTheme.bodySmall?.copyWith(color: AppColors.textSecondary),
    );
  }
}
