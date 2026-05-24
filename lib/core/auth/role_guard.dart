import '../http/token_storage.dart';
import '../widgets/sidebar.dart';

/// RBAC do app de consultoria (alinhado ao backend: ADMIN, OWNER, EMPLOYEE).
///
/// Regras resumidas:
/// - ADMIN: dashboard global, empresas, usuarios, relatorios e pesquisa.
/// - OWNER: dashboard da empresa, equipe, relatorios completos e pesquisa.
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
          SidebarItem.diagnostico,
          SidebarItem.empresas,
          SidebarItem.relatorios,
          SidebarItem.usuarios,
        ];
      case owner:
        return const [
          SidebarItem.dashboard,
          SidebarItem.diagnostico,
          SidebarItem.relatorios,
          SidebarItem.equipe,
        ];
      case employee:
        return const [
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
    switch (location) {
      case '/dashboard':
        return SidebarItem.dashboard;
      case '/admin':
      case '/owner':
        return SidebarItem.dashboard;
      case '/diagnosis':
        return SidebarItem.diagnostico;
      case '/research':
      case '/research/chat':
      case '/employee':
        return SidebarItem.diagnostico;
      case '/companies':
        return SidebarItem.empresas;
      case '/reports':
        return SidebarItem.relatorios;
      case '/users':
        return SidebarItem.usuarios;
      case '/team':
        return SidebarItem.equipe;
      case '/tasks':
        return SidebarItem.tarefas;
      default:
        return null;
    }
  }
}
