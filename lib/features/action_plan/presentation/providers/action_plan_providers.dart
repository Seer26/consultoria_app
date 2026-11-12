import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/di/providers.dart';
import '../../data/services/action_plan_service.dart';
import '../../domain/entities/action_item.dart';
import '../controllers/action_plan_controller.dart';

final actionPlanServiceProvider = Provider<ActionPlanService>((ref) {
  return ActionPlanService(ref.watch(dioProvider));
});

final actionPlanControllerProvider =
    StateNotifierProvider<ActionPlanController, List<ActionItem>>((ref) {
      return ActionPlanController();
    });
