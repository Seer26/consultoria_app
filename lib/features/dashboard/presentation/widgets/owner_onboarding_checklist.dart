import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/app_colors.dart';

class OwnerOnboardingChecklist extends StatelessWidget {
  const OwnerOnboardingChecklist({super.key, required this.data});

  final Map<String, dynamic> data;

  @override
  Widget build(BuildContext context) {
    if (data.isEmpty) return const SizedBox.shrink();

    final itemsState = _readMap(data['items']);
    final completedCount = (data['completedCount'] as num?)?.toInt() ?? 0;
    final totalCount = (data['totalCount'] as num?)?.toInt() ?? 7;
    final progress = ((data['progress'] as num?)?.toDouble() ?? 0) / 100;
    final isComplete = data['isComplete'] == true;
    final items = <_OnboardingItem>[
      _OnboardingItem(
        keyName: 'companyProfile',
        title: 'Complete os dados da empresa',
        description:
            'Informe setor, porte, telefone e responsável pela empresa.',
        actionLabel: 'Completar dados',
        route: '/company-settings',
        icon: Icons.business_outlined,
      ),
      _OnboardingItem(
        keyName: 'team',
        title: 'Cadastre sua equipe',
        description:
            'Adicione os colaboradores que participarão dos diagnósticos.',
        actionLabel: 'Gerenciar equipe',
        route: '/team',
        icon: Icons.group_add_outlined,
      ),
      _OnboardingItem(
        keyName: 'professionalProfiles',
        title: 'Complete os perfis profissionais',
        description: 'Confira a área e a função de cada colaborador ativo.',
        actionLabel: 'Revisar perfis',
        route: '/team',
        icon: Icons.badge_outlined,
      ),
      _OnboardingItem(
        keyName: 'firstResearch',
        title: 'Realize o primeiro diagnóstico',
        description:
            'Comece a coleta de informações para conhecer o cenário da empresa.',
        actionLabel: 'Iniciar pesquisa',
        route: '/research',
        icon: Icons.analytics_outlined,
      ),
      _OnboardingItem(
        keyName: 'firstResult',
        title: 'Conclua o primeiro diagnóstico',
        description:
            'Finalize as respostas para disponibilizar o primeiro resultado.',
        actionLabel: 'Ver pesquisas',
        route: '/research',
        icon: Icons.insights_outlined,
      ),
      _OnboardingItem(
        keyName: 'firstActionPlan',
        title: 'Crie o primeiro plano de ação',
        description:
            'Transforme um resultado concluído em tarefas práticas para a equipe.',
        actionLabel: 'Ver plano de ação',
        route: '/tasks',
        icon: Icons.task_alt_outlined,
      ),
      _OnboardingItem(
        keyName: 'strategyDefined',
        title: 'Defina a estratégia empresarial',
        description:
            'Registre missão, visão e o primeiro objetivo estratégico.',
        actionLabel: 'Abrir estratégia',
        route: '/strategy',
        icon: Icons.account_tree_outlined,
      ),
    ];

    return Card(
      key: const ValueKey('owner-onboarding-checklist'),
      clipBehavior: Clip.antiAlias,
      child: ExpansionTile(
        initiallyExpanded: !isComplete,
        leading: CircleAvatar(
          backgroundColor: isComplete
              ? AppColors.success.withValues(alpha: 0.12)
              : AppColors.primary.withValues(alpha: 0.12),
          child: Icon(
            isComplete ? Icons.verified_outlined : Icons.rocket_launch_outlined,
            color: isComplete ? AppColors.success : AppColors.primary,
          ),
        ),
        title: Text(
          isComplete
              ? 'Configuração inicial concluída'
              : 'Configuração inicial',
          style: const TextStyle(fontWeight: FontWeight.w800),
        ),
        subtitle: Padding(
          padding: const EdgeInsets.only(top: 6),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('$completedCount de $totalCount etapas concluídas'),
              const SizedBox(height: 8),
              LinearProgressIndicator(
                key: const ValueKey('owner-onboarding-progress'),
                value: progress.clamp(0, 1),
                minHeight: 7,
                borderRadius: BorderRadius.circular(99),
              ),
            ],
          ),
        ),
        children: [
          const Divider(height: 1),
          for (final item in items)
            _OnboardingRow(
              item: item,
              completed: itemsState[item.keyName] == true,
              onPressed: () => context.go(item.route),
            ),
        ],
      ),
    );
  }
}

class _OnboardingRow extends StatelessWidget {
  const _OnboardingRow({
    required this.item,
    required this.completed,
    required this.onPressed,
  });

  final _OnboardingItem item;
  final bool completed;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 14, 20, 14),
      child: LayoutBuilder(
        builder: (context, constraints) {
          final content = Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(
                completed ? Icons.check_circle : item.icon,
                color: completed ? AppColors.success : AppColors.textMuted,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      item.title,
                      style: TextStyle(
                        fontWeight: FontWeight.w800,
                        color: completed ? AppColors.textSecondary : null,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      completed ? 'Etapa concluída.' : item.description,
                      style: const TextStyle(color: AppColors.textSecondary),
                    ),
                  ],
                ),
              ),
            ],
          );

          if (constraints.maxWidth < 560) {
            return Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                content,
                if (!completed) ...[
                  const SizedBox(height: 10),
                  OutlinedButton(
                    onPressed: onPressed,
                    child: Text(item.actionLabel),
                  ),
                ],
              ],
            );
          }

          return Row(
            children: [
              Expanded(child: content),
              if (!completed) ...[
                const SizedBox(width: 16),
                OutlinedButton(
                  onPressed: onPressed,
                  child: Text(item.actionLabel),
                ),
              ],
            ],
          );
        },
      ),
    );
  }
}

class _OnboardingItem {
  const _OnboardingItem({
    required this.keyName,
    required this.title,
    required this.description,
    required this.actionLabel,
    required this.route,
    required this.icon,
  });

  final String keyName;
  final String title;
  final String description;
  final String actionLabel;
  final String route;
  final IconData icon;
}

Map<String, dynamic> _readMap(dynamic value) {
  if (value is Map<String, dynamic>) return value;
  if (value is Map) return Map<String, dynamic>.from(value);
  return const {};
}
