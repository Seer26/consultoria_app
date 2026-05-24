import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/presentation/pages/login_page.dart';
import '../../features/auth/presentation/pages/auth_splash_page.dart';
import '../../features/auth/presentation/providers/auth_providers.dart';
import '../../features/auth/presentation/state/auth_state.dart';
import '../../features/dashboard/presentation/pages/admin_dashboard_page.dart';
import '../../features/dashboard/presentation/pages/owner_dashboard_page.dart';
import '../../features/dashboard/presentation/pages/employee_home_page.dart';
import '../../features/dashboard/presentation/pages/module_page.dart';
import '../../features/admin_management/presentation/pages/companies_management_page.dart';
import '../../features/diagnosis/presentation/pages/diagnosis_page.dart';
import '../../features/diagnosis/presentation/pages/chat_diagnosis_page.dart';
import '../auth/role_guard.dart';
import '../widgets/app_shell.dart';
import '../widgets/app_state_widgets.dart';
import '../../widgets/role_guard.dart';

final appRouterProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authControllerProvider);
  final currentRole = authState.user?.role;

  return GoRouter(
    initialLocation: '/',
    routes: [
      GoRoute(
        path: '/',
        name: 'splash',
        builder: (context, state) => const AuthSplashPage(),
        redirect: (context, state) {
          if (authState.status == AuthStatus.unknown) {
            return null;
          }
          if (authState.status != AuthStatus.authenticated) {
            return '/login';
          }
          return RoleGuard.defaultRouteForRole(currentRole);
        },
      ),
      GoRoute(
        path: '/login',
        name: 'login',
        builder: (context, state) => const LoginPage(),
      ),
      GoRoute(
        path: '/pesquisa',
        redirect: (context, state) => '/research',
      ),
      GoRoute(
        path: '/diagnosis',
        redirect: (context, state) => '/research',
      ),
      GoRoute(
        path: '/dashboard',
        redirect: (context, state) => RoleGuard.defaultRouteForRole(currentRole),
      ),
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) =>
            AppShell(navigationShell: navigationShell),
        branches: [
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/admin',
                name: 'admin',
                builder: (context, state) => RbacGuard(
                  allowedRoles: const [RoleGuard.admin],
                  child: const AdminDashboardPage(),
                ),
              ),
              GoRoute(
                path: '/owner',
                name: 'owner',
                builder: (context, state) => RbacGuard(
                  allowedRoles: const [RoleGuard.owner],
                  child: const OwnerDashboardPage(),
                ),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/employee',
                name: 'employee',
                builder: (context, state) => RbacGuard(
                  allowedRoles: const [RoleGuard.employee],
                  child: const EmployeeHomePage(),
                ),
              ),
              GoRoute(
                path: '/research',
                name: 'research',
                builder: (context, state) => RbacGuard(
                  allowedRoles: const [
                    RoleGuard.admin,
                    RoleGuard.owner,
                    RoleGuard.employee,
                  ],
                  child: const DiagnosisPage(),
                ),
                routes: [
                  GoRoute(
                    path: 'chat',
                    name: 'researchChat',
                    redirect: (context, state) {
                      final extra = state.extra;
                      if (extra is Map &&
                          extra['role'] is String &&
                          extra['sector'] is String &&
                          extra['submissionId'] is String) {
                        return null;
                      }
                      return '/research';
                    },
                    builder: (context, state) {
                      final extra = state.extra! as Map;
                      return RbacGuard(
                        allowedRoles: const [
                          RoleGuard.admin,
                          RoleGuard.owner,
                          RoleGuard.employee,
                        ],
                        child: ChatDiagnosisPage(
                          jobRole: extra['role'] as String,
                          sector: extra['sector'] as String,
                          submissionId: extra['submissionId'] as String,
                          companyId: extra['companyId'] as String?,
                          allowRespond: extra['respondEnabled'] != false,
                        ),
                      );
                    },
                  ),
                ],
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/companies',
                name: 'companies',
                builder: (context, state) => RbacGuard(
                  allowedRoles: const [RoleGuard.admin],
                  child: const CompaniesManagementPage(),
                ),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/reports',
                name: 'reports',
                builder: (context, state) => RbacGuard(
                  allowedRoles: const [RoleGuard.admin, RoleGuard.owner],
                  child: const ModulePage(
                    title: 'Relatorios',
                    subtitle: 'Visualizacao de resultados, progresso e indicadores consolidados.',
                    icon: Icons.assessment_outlined,
                  ),
                ),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/users',
                name: 'users',
                builder: (context, state) => RbacGuard(
                  allowedRoles: const [RoleGuard.admin],
                  child: const CompaniesManagementPage(initialUsersView: true),
                ),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/team',
                name: 'team',
                builder: (context, state) => RbacGuard(
                  allowedRoles: const [RoleGuard.owner],
                  child: const ModulePage(
                    title: 'Equipe',
                    subtitle: 'Gestao dos colaboradores da empresa e acompanhamento do time.',
                    icon: Icons.groups_2_outlined,
                  ),
                ),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/tasks',
                name: 'tasks',
                builder: (context, state) => RbacGuard(
                  allowedRoles: const [RoleGuard.employee],
                  child: const ModulePage(
                    title: 'Tarefas',
                    subtitle: 'Fila operacional do colaborador com execucao e acompanhamento.',
                    icon: Icons.task_alt_outlined,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    ],
    redirect: (context, state) {
      final isLoggedIn = authState.status == AuthStatus.authenticated;
      final isLoadingSession = authState.status == AuthStatus.unknown;
      final isLoginRoute = state.matchedLocation == '/login';

      if (isLoadingSession) {
        return null;
      }

      if (!isLoggedIn && !isLoginRoute) {
        return '/login';
      }

      if (isLoggedIn && isLoginRoute) {
        return RoleGuard.defaultRouteForRole(currentRole);
      }

      if (isLoggedIn &&
          !RoleGuard.canAccessRoute(currentRole, state.matchedLocation)) {
        return RoleGuard.defaultRouteForRole(currentRole);
      }

      return null;
    },
    errorBuilder: (context, state) => Scaffold(
      body: AppErrorState(
        title: 'Nao foi possivel abrir a rota',
        message: state.error.toString(),
        onRetry: () => context.go(
          authState.status == AuthStatus.authenticated
              ? RoleGuard.defaultRouteForRole(currentRole)
              : '/login',
        ),
      ),
    ),
  );
});
