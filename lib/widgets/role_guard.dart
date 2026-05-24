import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/auth/role_guard.dart' as rbac;
import '../features/auth/presentation/providers/auth_providers.dart';

/// Envolve uma tela e só exibe [child] se o role do usuário estiver em [allowedRoles].
/// Usa o estado de auth já carregado pelo app (mesma fonte do redirect do [GoRouter]).
class RbacGuard extends ConsumerWidget {
  const RbacGuard({
    super.key,
    required this.allowedRoles,
    required this.child,
    this.deniedChild,
  });

  final List<String> allowedRoles;
  final Widget child;
  final Widget? deniedChild;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final role = ref.watch(authControllerProvider).user?.role;
    final normalized = rbac.RoleGuard.normalizeRole(role);

    final allowed = allowedRoles
        .map(rbac.RoleGuard.normalizeRole)
        .contains(normalized);

    if (allowed) {
      return child;
    }

    return deniedChild ??
        Scaffold(
          body: Center(
            child: Text(
              'Acesso negado',
              style: Theme.of(context).textTheme.titleMedium,
            ),
          ),
        );
  }
}
