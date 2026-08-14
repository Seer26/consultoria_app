import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/widgets/app_page_scaffold.dart';
import '../../../auth/presentation/providers/auth_providers.dart';
import '../providers/dashboard_providers.dart';
import '../widgets/admin_dashboard.dart';
import '../widgets/employee_dashboard.dart';
import '../widgets/owner_dashboard.dart';

class DashboardPage extends ConsumerStatefulWidget {
  const DashboardPage({super.key});

  @override
  ConsumerState<DashboardPage> createState() => _DashboardPageState();
}

class _DashboardPageState extends ConsumerState<DashboardPage> {
  Future<Map<String, dynamic>>? _dashboardFuture;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _dashboardFuture ??= _loadDashboard();
  }

  Future<Map<String, dynamic>> _loadDashboard() async {
    final role = ref.read(authControllerProvider).user?.role.toUpperCase();
    final service = ref.read(dashboardServiceProvider);

    switch (role) {
      case 'ADMIN':
        return await service.getAdminDashboard();
      case 'OWNER':
        return await service.getOwnerDashboard();
      case 'EMPLOYEE':
        return await service.getEmployeeDashboard();
      default:
        throw Exception('Role nao suportado para dashboard.');
    }
  }

  Future<void> _reload() async {
    setState(() {
      _dashboardFuture = _loadDashboard();
    });
    await _dashboardFuture;
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(authControllerProvider).user;
    final role = user?.role.toUpperCase();

    return AppPageScaffold(
      title: 'Visao geral',
      subtitle: _subtitleForRole(role),
      actions: role == 'OWNER' || role == 'EMPLOYEE'
          ? [
              FilledButton.icon(
                onPressed: () => context.go('/research'),
                icon: const Icon(Icons.analytics_outlined),
                label: const Text('Abrir pesquisa'),
              ),
            ]
          : const [],
      child: FutureBuilder<Map<String, dynamic>>(
        future: _dashboardFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }

          if (snapshot.hasError) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(
                    Icons.cloud_off_outlined,
                    size: 48,
                    color: AppColors.textMuted,
                  ),
                  const SizedBox(height: 12),
                  const Text('Nao foi possivel carregar o dashboard.'),
                  const SizedBox(height: 16),
                  OutlinedButton.icon(
                    onPressed: _reload,
                    icon: const Icon(Icons.refresh),
                    label: const Text('Tentar novamente'),
                  ),
                ],
              ),
            );
          }

          final data = snapshot.data;
          if (data == null) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(
                    Icons.info_outline,
                    size: 48,
                    color: AppColors.textMuted,
                  ),
                  const SizedBox(height: 12),
                  const Text('O dashboard não retornou dados.'),
                  const SizedBox(height: 16),
                  OutlinedButton.icon(
                    onPressed: _reload,
                    icon: const Icon(Icons.refresh),
                    label: const Text('Tentar novamente'),
                  ),
                ],
              ),
            );
          }

          switch (role) {
            case 'ADMIN':
              return AdminDashboard(data: data);
            case 'OWNER':
              return OwnerDashboard(data: data);
            case 'EMPLOYEE':
              return EmployeeDashboard(data: data);
            default:
              return OwnerDashboard(data: data);
          }
        },
      ),
    );
  }
}

String _subtitleForRole(String? role) {
  switch (role) {
    case 'ADMIN':
      return 'Visao consolidada da operacao da consultoria, empresas e resultados globais.';
    case 'OWNER':
      return 'Painel executivo da empresa com score, gargalos e acoes prioritarias.';
    case 'EMPLOYEE':
      return 'Painel operacional com tarefas, progresso pessoal e pendencias do diagnostico.';
    default:
      return 'Visao principal do workspace.';
  }
}
