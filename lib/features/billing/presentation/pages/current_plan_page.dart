import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/di/providers.dart';
import '../../../../core/theme/app_colors.dart';
import '../../data/services/current_plan_service.dart';

final currentPlanServiceProvider = Provider<CurrentPlanService>((ref) {
  return CurrentPlanService(ref.watch(dioProvider));
});

final currentPlanProvider = FutureProvider<CurrentPlanSnapshot>((ref) {
  return ref.watch(currentPlanServiceProvider).getCurrentPlan();
});

class CurrentPlanPage extends ConsumerWidget {
  const CurrentPlanPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final plan = ref.watch(currentPlanProvider);

    return Scaffold(
      backgroundColor: AppColors.surfaceMuted,
      body: SafeArea(
        child: plan.when(
          data: (snapshot) => _CurrentPlanContent(snapshot: snapshot),
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (error, _) => Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Card(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(
                        Icons.warning_amber_rounded,
                        color: AppColors.amber,
                        size: 40,
                      ),
                      const SizedBox(height: 12),
                      Text(
                        'Nao foi possivel carregar o plano atual',
                        style: Theme.of(context).textTheme.titleMedium
                            ?.copyWith(fontWeight: FontWeight.w800),
                      ),
                      const SizedBox(height: 8),
                      Text(error.toString(), textAlign: TextAlign.center),
                      const SizedBox(height: 16),
                      FilledButton.icon(
                        onPressed: () => ref.invalidate(currentPlanProvider),
                        icon: const Icon(Icons.refresh_outlined),
                        label: const Text('Tentar novamente'),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _CurrentPlanContent extends ConsumerWidget {
  const _CurrentPlanContent({required this.snapshot});

  final CurrentPlanSnapshot snapshot;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return RefreshIndicator(
      onRefresh: () async => ref.invalidate(currentPlanProvider),
      child: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          Wrap(
            alignment: WrapAlignment.spaceBetween,
            crossAxisAlignment: WrapCrossAlignment.center,
            spacing: 16,
            runSpacing: 16,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Plano atual',
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Uso e limites ativos para esta empresa.',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: AppColors.textMuted,
                    ),
                  ),
                ],
              ),
              Chip(
                avatar: const Icon(Icons.verified_outlined, size: 18),
                label: Text(snapshot.subscriptionStatus),
              ),
            ],
          ),
          const SizedBox(height: 24),
          _PlanHeaderCard(snapshot: snapshot),
          const SizedBox(height: 20),
          LayoutBuilder(
            builder: (context, constraints) {
              final width = constraints.maxWidth;
              final columns = width >= 980 ? 2 : 1;
              final itemWidth = (width - ((columns - 1) * 16)) / columns;

              return Wrap(
                spacing: 16,
                runSpacing: 16,
                children: snapshot.usageItems
                    .map(
                      (item) => SizedBox(
                        width: itemWidth,
                        child: _UsageCard(item: item),
                      ),
                    )
                    .toList(),
              );
            },
          ),
          const SizedBox(height: 20),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(Icons.info_outline, color: AppColors.primary),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      'Pagamento e troca de plano ainda nao foram implementados. '
                      'Nesta fase, os limites ja sao aplicados no backend para validar o SaaS multiempresa.',
                      style: Theme.of(context).textTheme.bodyMedium,
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
}

class _PlanHeaderCard extends StatelessWidget {
  const _PlanHeaderCard({required this.snapshot});

  final CurrentPlanSnapshot snapshot;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  height: 52,
                  width: 52,
                  decoration: BoxDecoration(
                    color: AppColors.primarySoft,
                    borderRadius: BorderRadius.circular(18),
                  ),
                  child: const Icon(
                    Icons.workspace_premium_outlined,
                    color: AppColors.primary,
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        snapshot.planName,
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                      if (snapshot.planSlug.isNotEmpty)
                        Text(
                          snapshot.planSlug,
                          style: const TextStyle(color: AppColors.textMuted),
                        ),
                    ],
                  ),
                ),
              ],
            ),
            if (snapshot.planDescription?.isNotEmpty == true) ...[
              const SizedBox(height: 16),
              Text(snapshot.planDescription!),
            ],
          ],
        ),
      ),
    );
  }
}

class _UsageCard extends StatelessWidget {
  const _UsageCard({required this.item});

  final PlanUsageItem item;

  @override
  Widget build(BuildContext context) {
    final color = item.isBlocked
        ? AppColors.danger
        : item.isNearLimit
        ? AppColors.amber
        : AppColors.primary;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    item.label,
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
                Text(
                  '${item.used}/${item.limit}',
                  style: TextStyle(color: color, fontWeight: FontWeight.w900),
                ),
              ],
            ),
            const SizedBox(height: 12),
            ClipRRect(
              borderRadius: BorderRadius.circular(999),
              child: LinearProgressIndicator(
                value: item.progress,
                minHeight: 10,
                backgroundColor: AppColors.surfaceMuted,
                color: color,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              item.period == null
                  ? '${item.remaining} disponiveis'
                  : '${item.remaining} disponiveis no periodo ${item.period}',
              style: const TextStyle(color: AppColors.textMuted),
            ),
          ],
        ),
      ),
    );
  }
}
