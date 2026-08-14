import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/presentation/providers/auth_providers.dart';
import '../../services/auth_service.dart';
import '../auth/role_guard.dart';
import '../theme/app_colors.dart';
import 'sidebar.dart';

class AppShell extends ConsumerWidget {
  const AppShell({super.key, required this.navigationShell});

  final StatefulNavigationShell navigationShell;

  static const Map<SidebarItem, int> _branchIndexByItem = {
    SidebarItem.dashboard: 0,
    SidebarItem.diagnostico: 1,
    SidebarItem.empresas: 2,
    SidebarItem.relatorios: 3,
    SidebarItem.usuarios: 4,
    SidebarItem.tarefas: 5,
    SidebarItem.plano: 6,
    SidebarItem.configuracoesEmpresa: 7,
    SidebarItem.equipe: 8,
  };

  static const Map<int, SidebarItem> _itemByBranchIndex = {
    0: SidebarItem.dashboard,
    1: SidebarItem.diagnostico,
    2: SidebarItem.empresas,
    3: SidebarItem.relatorios,
    4: SidebarItem.usuarios,
    5: SidebarItem.tarefas,
    6: SidebarItem.plano,
    7: SidebarItem.configuracoesEmpresa,
    8: SidebarItem.equipe,
  };

  void _goBranch(int index) {
    navigationShell.goBranch(
      index,
      initialLocation: index == navigationShell.currentIndex,
    );
  }

  void _goToItem(SidebarItem item) {
    final index = _branchIndexByItem[item];

    if (index != null) {
      _goBranch(index);
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final role = ref.watch(authControllerProvider).user?.role;
    final allowedItems = RoleGuard.sidebarItemsForRole(role);
    final safeItems = allowedItems.isEmpty
        ? const [SidebarItem.dashboard]
        : allowedItems;
    final selectedItem =
        _itemByBranchIndex[navigationShell.currentIndex] ?? safeItems.first;

    return LayoutBuilder(
      builder: (context, constraints) {
        final isLarge = constraints.maxWidth >= 1100;
        final isMedium = constraints.maxWidth >= 760;

        if (isMedium) {
          return Scaffold(
            body: Row(
              children: [
                Container(
                  width: isLarge ? 300 : 92,
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [
                        Colors.white,
                        AppColors.primarySoft.withValues(alpha: 0.72),
                        AppColors.surfaceMuted,
                      ],
                    ),
                    border: Border(right: BorderSide(color: AppColors.border)),
                  ),
                  child: Column(
                    children: [
                      Padding(
                        padding: EdgeInsets.fromLTRB(
                          isLarge ? 24 : 12,
                          24,
                          isLarge ? 24 : 12,
                          16,
                        ),
                        child: Row(
                          children: [
                            Container(
                              height: 48,
                              width: 48,
                              decoration: BoxDecoration(
                                color: AppColors.primary,
                                borderRadius: BorderRadius.circular(18),
                                boxShadow: [
                                  BoxShadow(
                                    color: AppColors.primary.withValues(
                                      alpha: 0.2,
                                    ),
                                    blurRadius: 24,
                                    offset: const Offset(0, 12),
                                  ),
                                ],
                              ),
                              child: const Icon(
                                Icons.insights_outlined,
                                color: Colors.white,
                              ),
                            ),
                            if (isLarge) ...[
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      'Consultoria Pro',
                                      style: Theme.of(context)
                                          .textTheme
                                          .titleMedium
                                          ?.copyWith(
                                            fontWeight: FontWeight.w800,
                                          ),
                                    ),
                                    Text(
                                      'Acesso ${RoleGuard.normalizeRole(role)}',
                                    ),
                                  ],
                                ),
                              ),
                            ],
                            IconButton(
                              key: const Key('change-password-navigation'),
                              tooltip: 'Seguranca da conta',
                              icon: const Icon(Icons.password_outlined),
                              onPressed: () => context.push('/change-password'),
                            ),
                            IconButton(
                              tooltip: 'Sair',
                              icon: const Icon(Icons.logout_outlined),
                              onPressed: () => AuthService.logout(ref, context),
                            ),
                          ],
                        ),
                      ),
                      Expanded(
                        child: SingleChildScrollView(
                          padding: EdgeInsets.symmetric(
                            horizontal: isLarge ? 16 : 10,
                            vertical: 8,
                          ),
                          child: _SidebarWorkspace(
                            items: safeItems,
                            selectedItem: selectedItem,
                            extended: isLarge,
                            onSelect: _goToItem,
                          ),
                        ),
                      ),
                      Padding(
                        padding: EdgeInsets.fromLTRB(
                          isLarge ? 20 : 12,
                          12,
                          isLarge ? 20 : 12,
                          24,
                        ),
                        child: Card(
                          child: Padding(
                            padding: const EdgeInsets.all(16),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    const CircleAvatar(
                                      backgroundColor: AppColors.primarySoft,
                                      foregroundColor: AppColors.primary,
                                      child: Icon(Icons.verified_user_outlined),
                                    ),
                                    if (isLarge) ...[
                                      const SizedBox(width: 12),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment:
                                              CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              'Controle de acesso',
                                              style: Theme.of(context)
                                                  .textTheme
                                                  .titleSmall
                                                  ?.copyWith(
                                                    fontWeight: FontWeight.w700,
                                                  ),
                                            ),
                                            Text(
                                              'Permissoes aplicadas por perfil',
                                            ),
                                          ],
                                        ),
                                      ),
                                    ],
                                  ],
                                ),
                                const SizedBox(height: 16),
                                Container(
                                  width: double.infinity,
                                  padding: const EdgeInsets.all(14),
                                  decoration: BoxDecoration(
                                    color: AppColors.primaryDark,
                                    borderRadius: BorderRadius.circular(18),
                                  ),
                                  child: Text(
                                    isLarge
                                        ? 'A interface respeita as permissoes do usuario conectado.'
                                        : 'Permissoes',
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                Expanded(child: navigationShell),
              ],
            ),
          );
        }

        return Scaffold(
          drawer: Drawer(
            child: SafeArea(
              child: Column(
                children: [
                  Padding(
                    padding: const EdgeInsets.fromLTRB(20, 16, 12, 12),
                    child: Row(
                      children: [
                        const CircleAvatar(
                          backgroundColor: AppColors.primary,
                          foregroundColor: Colors.white,
                          child: Icon(Icons.insights_outlined),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Consultoria Pro',
                                style: Theme.of(context).textTheme.titleMedium
                                    ?.copyWith(fontWeight: FontWeight.w800),
                              ),
                              Text(_roleLabel(role)),
                            ],
                          ),
                        ),
                        IconButton(
                          tooltip: 'Fechar menu',
                          onPressed: () => Navigator.of(context).pop(),
                          icon: const Icon(Icons.close),
                        ),
                      ],
                    ),
                  ),
                  const Divider(height: 1),
                  Expanded(
                    child: ListView(
                      padding: const EdgeInsets.all(12),
                      children: [
                        Sidebar(
                          items: safeItems,
                          selectedItem: selectedItem,
                          onSelect: (item) {
                            Navigator.of(context).pop();
                            _goToItem(item);
                          },
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          appBar: AppBar(
            title: const Text('Consultoria Pro'),
            actions: [
              IconButton(
                key: const Key('change-password-navigation'),
                tooltip: 'Seguranca da conta',
                icon: const Icon(Icons.password_outlined),
                onPressed: () => context.push('/change-password'),
              ),
              IconButton(
                tooltip: 'Sair',
                icon: const Icon(Icons.logout_outlined),
                onPressed: () => AuthService.logout(ref, context),
              ),
            ],
          ),
          body: navigationShell,
        );
      },
    );
  }
}

String _roleLabel(String? role) => switch (RoleGuard.normalizeRole(role)) {
  RoleGuard.admin => 'Administrador',
  RoleGuard.owner => 'Proprietario',
  RoleGuard.employee => 'Colaborador',
  _ => 'Usuario',
};

class _SidebarWorkspace extends ConsumerWidget {
  const _SidebarWorkspace({
    required this.items,
    required this.selectedItem,
    required this.extended,
    required this.onSelect,
  });

  final List<SidebarItem> items;
  final SidebarItem selectedItem;
  final bool extended;
  final ValueChanged<SidebarItem> onSelect;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Sidebar(
      items: items,
      selectedItem: selectedItem,
      extended: extended,
      onSelect: onSelect,
    );
  }
}
