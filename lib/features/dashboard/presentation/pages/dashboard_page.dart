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

    try {
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
    } catch (_) {
      return _fallbackDashboard(role);
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
      title: 'Dashboard',
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

          final data = snapshot.data ?? _fallbackDashboard(role);

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

Map<String, dynamic> _fallbackDashboard(String? role) {
  switch (role) {
    case 'ADMIN':
      return {
        'totals': {
          'companies': 0,
          'diagnoses': 0,
          'alerts': 0,
        },
        'companies': const [],
        'alerts': const ['Sem conexao com a API. Exibindo fallback simples.'],
      };
    case 'EMPLOYEE':
      return {
        'tasks': const [],
        'progress': {
          'personalProgress': 0,
          'pendingDiagnosis': 0,
        },
        'diagnosis': {
          'pendingItems': const ['Sem conexao com a API. Exibindo fallback simples.'],
        },
      };
    case 'OWNER':
    default:
      return {
        'company': {
          'score': 0,
          'progress': 0,
        },
        'problems': const ['Sem conexao com a API. Exibindo fallback simples.'],
        'actions': const ['Conectar backend para carregar dados reais do dashboard.'],
        'metrics': {
          'answeredQuestions': 0,
          'totalQuestions': 0,
        },
      };
  }
}
