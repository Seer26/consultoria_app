import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../domain/entities/action_item.dart';
import '../controllers/action_plan_controller.dart';

final actionPlanControllerProvider =
    StateNotifierProvider<ActionPlanController, List<ActionItem>>((ref) {
  return ActionPlanController();
});
