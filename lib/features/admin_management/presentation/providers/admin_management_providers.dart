import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/di/providers.dart';
import '../../data/services/admin_management_service.dart';
import '../controllers/admin_management_controller.dart';

final adminManagementServiceProvider = Provider<AdminManagementService>((ref) {
  return AdminManagementService(ref.watch(dioProvider));
});

final adminManagementControllerProvider =
    StateNotifierProvider<AdminManagementController, AdminManagementState>((ref) {
  return AdminManagementController(ref.watch(adminManagementServiceProvider));
});
