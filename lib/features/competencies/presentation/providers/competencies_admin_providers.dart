import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/auth/role_guard.dart';
import '../../../../core/di/providers.dart';
import '../../../auth/presentation/providers/auth_providers.dart';
import '../../data/services/competencies_admin_service.dart';

final competenciesAdminServiceProvider = Provider<CompetenciesAdminService>((
  ref,
) {
  if (RoleGuard.normalizeRole(ref.watch(authControllerProvider).user?.role) !=
      RoleGuard.admin) {
    throw StateError('Acesso exclusivo ADMIN');
  }
  return CompetenciesAdminService(ref.watch(dioProvider));
});
