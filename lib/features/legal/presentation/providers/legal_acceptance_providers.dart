import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/di/providers.dart';
import '../../../auth/presentation/providers/auth_providers.dart';
import '../../data/services/legal_acceptance_service.dart';
import '../controllers/legal_acceptance_controller.dart';
import '../state/legal_acceptance_state.dart';

final legalAcceptanceApiProvider = Provider<LegalAcceptanceApi>((ref) {
  return LegalAcceptanceService(ref.read(dioProvider));
});

final legalAcceptanceControllerProvider =
    StateNotifierProvider<LegalAcceptanceController, LegalAcceptanceState>((
      ref,
    ) {
      final controller = LegalAcceptanceController(
        ref.read(legalAcceptanceApiProvider),
      );

      ref.listen(authControllerProvider, (previous, next) {
        final userChanged = previous?.user?.id != next.user?.id;
        final becameAuthenticated =
            previous?.isAuthenticated != true && next.isAuthenticated;

        if (next.isAuthenticated && (userChanged || becameAuthenticated)) {
          controller.checkPending();
        } else if (!next.isAuthenticated) {
          controller.reset();
        }
      }, fireImmediately: true);

      return controller;
    });
