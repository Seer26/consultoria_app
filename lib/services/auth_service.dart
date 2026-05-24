import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../core/http/token_storage.dart';
import '../features/auth/presentation/providers/auth_providers.dart';

/// Sessão e logout alinhados ao app (Riverpod + [TokenStorage] + go_router).
///
/// O **login** real permanece em [AuthController.login] (Dio + repositório),
/// para não duplicar HTTP nem divergir das chaves de armazenamento.
class AuthService {
  AuthService._();

  /// Role persistido (mesma fonte do interceptor do Dio).
  static Future<String?> getRole() => TokenStorage().readRole();

  /// Token de acesso JWT persistido.
  static Future<String?> getToken() => TokenStorage().readAccessToken();

  /// Encerra sessão no backend local e navega para login.
  static Future<void> logout(WidgetRef ref, BuildContext context) async {
    await ref.read(authControllerProvider.notifier).logout();
    if (context.mounted) {
      context.go('/login');
    }
  }
}
