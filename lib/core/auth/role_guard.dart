import '../http/token_storage.dart';
import '../widgets/sidebar.dart';

/// RBAC do app de consultoria (alinhado ao backend: ADMIN, OWNER, EMPLOYEE).
///
/// Regras resumidas:
/// - ADMIN: dashboard global, empresas, usuarios, relatorios e consulta de pesquisas.
/// - OWNER: dashboard da empresa, relatorios, pesquisa e plano de acao.
/// - EMPLOYEE: pesquisa operacional e tarefas.
class RoleGuard {
  static const String admin = 'ADMIN';
  static const String owner = 'OWNER';
  static const String employee = 'EMPLOYEE';

  static Future<String?> getUserRole() async {
    return TokenStorage().readRole();
  }

  static List<SidebarItem> sidebarItemsForRole(String? role) {
    switch (normalizeRole(role)) {
      case admin:
        return const [
          SidebarItem.dashboard,
          SidebarItem.empresas,
          SidebarItem.relatorios,
          SidebarItem.usuarios,
        ];
      case owner:
        return const [
          SidebarItem.dashboard,
          SidebarItem.diagnostico,
          SidebarItem.tarefas,
          SidebarItem.relatorios,
          SidebarItem.plano,
          SidebarItem.configuracoesEmpresa,
        ];
      case employee:
        return const [
          SidebarItem.dashboard,
          SidebarItem.diagnostico,
          SidebarItem.tarefas,
        ];
      default:
        return const [];
    }
  }

  static bool canAccessItem(String? role, SidebarItem item) {
    return sidebarItemsForRole(role).contains(item);
  }

  static bool canAccessRoute(String? role, String location) {
    if (_isSafeUtilityRoute(location)) {
      return true;
    }

    final item = _itemFromLocation(location);

    if (item == null) {
      return location == '/login';
    }

    return canAccessItem(role, item);
  }

  static String defaultRouteForRole(String? role) {
    switch (normalizeRole(role)) {
      case admin:
        return '/admin';
      case owner:
        return '/owner';
      case employee:
        return '/employee';
      default:
        return '/login';
    }
  }

  static String normalizeRole(String? role) {
    final normalized = role?.trim().toUpperCase();

    if (normalized == admin || normalized == owner || normalized == employee) {
      return normalized!;
    }

    return '';
  }

  static SidebarItem? _itemFromLocation(String location) {
    if (location.startsWith('/reports/')) {
      return SidebarItem.relatorios;
    }
    if (location.startsWith('/research/')) {
      return SidebarItem.diagnostico;
    }

    switch (location) {
      case '/dashboard':
        return SidebarItem.dashboard;
      case '/admin':
      case '/owner':
      case '/employee':
        return SidebarItem.dashboard;
      case '/diagnosis':
        return SidebarItem.diagnostico;
      case '/research':
      case '/research/chat':
        return SidebarItem.diagnostico;
      case '/companies':
        return SidebarItem.empresas;
      case '/reports':
        return SidebarItem.relatorios;
      case '/users':
        return SidebarItem.usuarios;
      case '/tasks':
        return SidebarItem.tarefas;
      case '/plan':
        return SidebarItem.plano;
      case '/company-settings':
        return SidebarItem.configuracoesEmpresa;
      default:
        return null;
    }
  }

  static bool _isSafeUtilityRoute(String location) {
    return location == '/unavailable' ||
        location == '/legal-acceptance' ||
        location == '/change-password' ||
        location == '/clients' ||
        location.startsWith('/clients/') ||
        location == '/forms' ||
        location.startsWith('/forms/') ||
        location == '/chat' ||
        location == '/ai-diagnosis' ||
        location == '/diagnosis/legacy' ||
        location == '/diagnosis-workspace';
  }
}
