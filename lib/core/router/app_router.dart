import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/presentation/pages/login_page.dart';
import '../../features/auth/presentation/pages/auth_splash_page.dart';
import '../../features/auth/presentation/pages/forgot_password_page.dart';
import '../../features/auth/presentation/pages/reset_password_page.dart';
import '../../features/auth/presentation/pages/change_password_page.dart';
import '../../features/auth/presentation/providers/auth_providers.dart';
import '../../features/auth/presentation/state/auth_state.dart';
import '../../features/dashboard/presentation/pages/admin_dashboard_page.dart';
import '../../features/dashboard/presentation/pages/owner_dashboard_page.dart';
import '../../features/dashboard/presentation/pages/employee_home_page.dart';
import '../../features/billing/presentation/pages/current_plan_page.dart';
import '../../features/company_settings/presentation/pages/company_settings_page.dart';
import '../../features/action_plan/presentation/pages/action_plan_page.dart';
import '../../features/action_plan/domain/entities/action_plan_task.dart';
import '../../features/admin_management/presentation/pages/companies_management_page.dart';
import '../../features/diagnosis/presentation/pages/diagnosis_page.dart';
import '../../features/diagnosis/presentation/pages/chat_diagnosis_page.dart';
import '../../features/diagnosis/presentation/pages/research_details_page.dart';
import '../../features/reports/presentation/pages/reports_page.dart';
import '../../features/legal/presentation/pages/legal_acceptance_page.dart';
import '../../features/legal/presentation/providers/legal_acceptance_providers.dart';
import '../../features/legal/presentation/state/legal_acceptance_state.dart';
import '../auth/role_guard.dart';
import '../widgets/app_shell.dart';
import '../widgets/app_state_widgets.dart';
import '../../widgets/role_guard.dart';

final appRouterProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authControllerProvider);
  final legalState = ref.watch(legalAcceptanceControllerProvider);
  final currentRole = authState.user?.role;

  return GoRouter(
    initialLocation: '/',
    routes: [
      GoRoute(
        path: '/',
        name: 'splash',
        builder: (context, state) => const AuthSplashPage(),
      ),
      GoRoute(
        path: '/login',
        name: 'login',
        builder: (context, state) => const LoginPage(),
      ),
      GoRoute(
        path: '/forgot-password',
        name: 'forgotPassword',
        builder: (context, state) => const ForgotPasswordPage(),
      ),
      GoRoute(
        path: '/reset-password',
        name: 'resetPassword',
        builder: (context, state) {
          final queryToken = state.uri.queryParameters['token'];
          final memoryToken = state.extra is String
              ? state.extra! as String
              : null;
          return ResetPasswordPage(
            token: queryToken ?? memoryToken ?? '',
            removeTokenFromUrl: queryToken != null && queryToken.isNotEmpty,
          );
        },
      ),
      GoRoute(
        path: '/legal-acceptance',
        name: 'legalAcceptance',
        builder: (context, state) => const LegalAcceptancePage(),
      ),
      GoRoute(
        path: '/change-password',
        name: 'changePassword',
        builder: (context, state) => const ChangePasswordPage(),
      ),
      GoRoute(
        path: '/unavailable',
        name: 'unavailableFeature',
        builder: (context, state) => const _UnavailableFeaturePage(),
      ),
      GoRoute(path: '/clients', redirect: (context, state) => '/unavailable'),
      GoRoute(
        path: '/clients/:id',
        redirect: (context, state) => '/unavailable',
      ),
      GoRoute(path: '/forms', redirect: (context, state) => '/unavailable'),
      GoRoute(path: '/chat', redirect: (context, state) => '/unavailable'),
      GoRoute(
        path: '/ai-diagnosis',
        redirect: (context, state) => '/unavailable',
      ),
      GoRoute(
        path: '/diagnosis/legacy',
        redirect: (context, state) => '/unavailable',
      ),
      GoRoute(
        path: '/diagnosis-workspace',
        redirect: (context, state) => '/unavailable',
      ),
      GoRoute(path: '/pesquisa', redirect: (context, state) => '/research'),
      GoRoute(path: '/diagnosis', redirect: (context, state) => '/research'),
      GoRoute(
        path: '/dashboard',
        redirect: (context, state) =>
            RoleGuard.defaultRouteForRole(currentRole),
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
              GoRoute(
                path: '/employee',
                name: 'employee',
                builder: (context, state) => RbacGuard(
                  allowedRoles: const [RoleGuard.employee],
                  child: const EmployeeHomePage(),
                ),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
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
                  GoRoute(
                    path: ':submissionId',
                    name: 'researchDetails',
                    builder: (context, state) => RbacGuard(
                      allowedRoles: const [
                        RoleGuard.admin,
                        RoleGuard.owner,
                        RoleGuard.employee,
                      ],
                      child: ResearchDetailsPage(
                        submissionId:
                            state.pathParameters['submissionId'] ?? '',
                      ),
                    ),
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
                  child: const ReportsPage(),
                ),
                routes: [
                  GoRoute(
                    path: ':submissionId',
                    name: 'reportDetails',
                    builder: (context, state) => RbacGuard(
                      allowedRoles: const [RoleGuard.admin, RoleGuard.owner],
                      child: ReportDetailsPage(
                        submissionId:
                            state.pathParameters['submissionId'] ?? '',
                      ),
                    ),
                  ),
                ],
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
                path: '/tasks',
                name: 'tasks',
                builder: (context, state) => RbacGuard(
                  allowedRoles: const [
                    RoleGuard.admin,
                    RoleGuard.owner,
                    RoleGuard.employee,
                  ],
                  child: ActionPlanPage(
                    initialScope: _taskScopeFromQuery(
                      state.uri.queryParameters['filter'],
                    ),
                  ),
                ),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/plan',
                name: 'plan',
                builder: (context, state) => RbacGuard(
                  allowedRoles: const [RoleGuard.owner],
                  child: const CurrentPlanPage(),
                ),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/company-settings',
                name: 'companySettings',
                builder: (context, state) => RbacGuard(
                  allowedRoles: const [RoleGuard.owner],
                  child: const CompanySettingsPage(),
                ),
              ),
            ],
          ),
        ],
      ),
    ],
    redirect: (context, state) {
      return resolveAppRedirect(
        authState: authState,
        legalState: legalState,
        location: state.matchedLocation,
      );
    },
    errorBuilder: (context, state) => Scaffold(
      body: AppErrorState(
        title: 'Nao foi possivel abrir esta tela',
        message: 'Este recurso ainda nao faz parte da versao atual do produto.',
        buttonLabel: 'Voltar para o inicio',
        onRetry: () => context.go(
          authState.status == AuthStatus.authenticated
              ? RoleGuard.defaultRouteForRole(currentRole)
              : '/login',
        ),
      ),
    ),
  );
});

String? resolveAppRedirect({
  required AuthState authState,
  required LegalAcceptanceState legalState,
  required String location,
}) {
  final isLoggedIn = authState.status == AuthStatus.authenticated;
  final isLoadingSession = authState.status == AuthStatus.unknown;
  final isPublicAuthRoute =
      location == '/login' ||
      location == '/forgot-password' ||
      location == '/reset-password';

  if (isLoadingSession) {
    return location == '/' ? null : '/';
  }

  if (!isLoggedIn) {
    return isPublicAuthRoute ? null : '/login';
  }

  if (legalState.isChecking) {
    return location == '/' ? null : '/';
  }

  if (legalState.blocksApp) {
    return location == '/legal-acceptance' ? null : '/legal-acceptance';
  }

  final defaultRoute = RoleGuard.defaultRouteForRole(authState.user?.role);
  if (location == '/' || location == '/legal-acceptance' || isPublicAuthRoute) {
    return defaultRoute;
  }

  if (!RoleGuard.canAccessRoute(authState.user?.role, location)) {
    return defaultRoute;
  }

  return null;
}

class _UnavailableFeaturePage extends ConsumerWidget {
  const _UnavailableFeaturePage();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final role = ref.watch(authControllerProvider).user?.role;

    return Scaffold(
      body: AppEmptyState(
        title: 'Recurso fora da versao atual',
        message: 'Este recurso ainda nao faz parte da versao atual do produto.',
        icon: Icons.lock_clock_outlined,
        action: FilledButton.icon(
          onPressed: () => context.go(RoleGuard.defaultRouteForRole(role)),
          icon: const Icon(Icons.arrow_back),
          label: const Text('Voltar para o inicio'),
        ),
      ),
    );
  }
}

ActionPlanTaskScope _taskScopeFromQuery(String? value) {
  switch (value) {
    case 'mine':
      return ActionPlanTaskScope.mine;
    case 'overdue':
      return ActionPlanTaskScope.overdue;
    case 'dueSoon':
      return ActionPlanTaskScope.dueSoon;
    case 'critical':
      return ActionPlanTaskScope.critical;
    case 'completed':
      return ActionPlanTaskScope.completed;
    default:
      return ActionPlanTaskScope.all;
  }
}
