import 'package:flutter/material.dart';

import '../theme/app_colors.dart';

enum SidebarItem {
  dashboard,
  diagnostico,
  empresas,
  relatorios,
  usuarios,
  tarefas,
  plano,
  configuracoesEmpresa,
  equipe,
  estrategia,
  comportamental,
  competencias,
}

enum SidebarGroup { workspace, management }

extension SidebarItemX on SidebarItem {
  String get label => switch (this) {
    SidebarItem.dashboard => 'Visao geral',
    SidebarItem.diagnostico => 'Pesquisa Empresarial',
    SidebarItem.empresas => 'Empresas',
    SidebarItem.relatorios => 'Relatório Executivo',
    SidebarItem.usuarios => 'Usuários',
    SidebarItem.tarefas => 'Plano de Ação',
    SidebarItem.plano => 'Plano atual',
    SidebarItem.configuracoesEmpresa => 'Configurações',
    SidebarItem.equipe => 'Equipe',
    SidebarItem.estrategia => 'Estratégia',
    SidebarItem.comportamental => 'Perfil comportamental',
    SidebarItem.competencias => 'Competências',
  };

  String get helper => switch (this) {
    SidebarItem.dashboard => 'Visao geral da operacao',
    SidebarItem.diagnostico => 'Perguntas guiadas pela IA',
    SidebarItem.empresas => 'Gestao das empresas',
    SidebarItem.relatorios => 'Resultados e analises',
    SidebarItem.usuarios => 'Acesso e perfis',
    SidebarItem.tarefas => 'Tarefas e acompanhamento',
    SidebarItem.plano => 'Limites e uso do SaaS',
    SidebarItem.configuracoesEmpresa => 'Dados da empresa',
    SidebarItem.equipe => 'Perfis dos colaboradores',
    SidebarItem.estrategia => 'Objetivos, metas e SWOT',
    SidebarItem.comportamental => 'Sua avaliação individual',
    SidebarItem.competencias => 'Avaliações técnicas da consultoria',
  };

  IconData get icon => switch (this) {
    SidebarItem.dashboard => Icons.space_dashboard_outlined,
    SidebarItem.diagnostico => Icons.analytics_outlined,
    SidebarItem.empresas => Icons.apartment_outlined,
    SidebarItem.relatorios => Icons.assessment_outlined,
    SidebarItem.usuarios => Icons.manage_accounts_outlined,
    SidebarItem.tarefas => Icons.task_alt_outlined,
    SidebarItem.plano => Icons.workspace_premium_outlined,
    SidebarItem.configuracoesEmpresa => Icons.settings_outlined,
    SidebarItem.equipe => Icons.groups_outlined,
    SidebarItem.estrategia => Icons.account_tree_outlined,
    SidebarItem.comportamental => Icons.psychology_outlined,
    SidebarItem.competencias => Icons.fact_check_outlined,
  };

  SidebarGroup get group => switch (this) {
    SidebarItem.dashboard ||
    SidebarItem.diagnostico ||
    SidebarItem.tarefas => SidebarGroup.workspace,
    SidebarItem.estrategia => SidebarGroup.workspace,
    SidebarItem.comportamental => SidebarGroup.workspace,
    SidebarItem.competencias => SidebarGroup.management,
    SidebarItem.empresas ||
    SidebarItem.relatorios ||
    SidebarItem.usuarios ||
    SidebarItem.plano ||
    SidebarItem.configuracoesEmpresa => SidebarGroup.management,
    SidebarItem.equipe => SidebarGroup.management,
  };
}

extension SidebarGroupX on SidebarGroup {
  String get label => switch (this) {
    SidebarGroup.workspace => 'Trabalho',
    SidebarGroup.management => 'Gestao',
  };
}

class Sidebar extends StatelessWidget {
  const Sidebar({
    super.key,
    required this.selectedItem,
    required this.onSelect,
    required this.items,
    this.extended = true,
    this.badges = const {},
  });

  final SidebarItem selectedItem;
  final ValueChanged<SidebarItem> onSelect;
  final List<SidebarItem> items;
  final bool extended;
  final Map<SidebarItem, String> badges;

  @override
  Widget build(BuildContext context) {
    final workspaceItems = items
        .where((item) => item.group == SidebarGroup.workspace)
        .toList();
    final managementItems = items
        .where((item) => item.group == SidebarGroup.management)
        .toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (workspaceItems.isNotEmpty) ...[
          if (extended)
            _SidebarSectionLabel(label: SidebarGroup.workspace.label),
          ...workspaceItems.map(_buildTile),
        ],
        if (managementItems.isNotEmpty) ...[
          const SizedBox(height: 12),
          if (extended)
            _SidebarSectionLabel(label: SidebarGroup.management.label),
          ...managementItems.map(_buildTile),
        ],
      ],
    );
  }

  Widget _buildTile(SidebarItem item) {
    final isSelected = item == selectedItem;
    final badge = badges[item];

    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        decoration: BoxDecoration(
          gradient: isSelected
              ? const LinearGradient(
                  colors: [Color(0xFFF3F7FF), Color(0xFFE8F0FF)],
                )
              : null,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(
            color: isSelected
                ? AppColors.primary.withValues(alpha: 0.22)
                : AppColors.border,
          ),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: AppColors.primary.withValues(alpha: 0.08),
                    blurRadius: 18,
                    offset: const Offset(0, 8),
                  ),
                ]
              : null,
        ),
        child: ListTile(
          dense: !extended,
          contentPadding: EdgeInsets.symmetric(
            horizontal: extended ? 14 : 10,
            vertical: extended ? 6 : 2,
          ),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(18),
          ),
          leading: Container(
            height: extended ? 40 : 36,
            width: extended ? 40 : 36,
            decoration: BoxDecoration(
              color: isSelected ? AppColors.primary : AppColors.surfaceMuted,
              borderRadius: BorderRadius.circular(14),
            ),
            child: Icon(
              item.icon,
              size: 20,
              color: isSelected ? Colors.white : AppColors.textMuted,
            ),
          ),
          title: extended
              ? Text(
                  item.label,
                  style: TextStyle(
                    color: isSelected
                        ? AppColors.primary
                        : AppColors.textPrimary,
                    fontWeight: isSelected ? FontWeight.w800 : FontWeight.w700,
                  ),
                )
              : null,
          subtitle: extended
              ? Text(
                  item.helper,
                  style: const TextStyle(
                    color: AppColors.textMuted,
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                  ),
                )
              : null,
          trailing: badge != null
              ? _SidebarBadge(label: badge, highlighted: isSelected)
              : null,
          onTap: () => onSelect(item),
        ),
      ),
    );
  }
}

class _SidebarSectionLabel extends StatelessWidget {
  const _SidebarSectionLabel({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(6, 4, 6, 10),
      child: Text(
        label.toUpperCase(),
        style: const TextStyle(
          color: AppColors.textMuted,
          fontSize: 11,
          fontWeight: FontWeight.w800,
          letterSpacing: 1.1,
        ),
      ),
    );
  }
}

class _SidebarBadge extends StatelessWidget {
  const _SidebarBadge({required this.label, required this.highlighted});

  final String label;
  final bool highlighted;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: highlighted ? AppColors.primary : AppColors.surfaceMuted,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: highlighted ? Colors.white : AppColors.textSecondary,
          fontSize: 11,
          fontWeight: FontWeight.w800,
        ),
      ),
    );
  }
}
