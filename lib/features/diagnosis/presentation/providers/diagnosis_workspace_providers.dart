import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../domain/entities/business_area.dart';
import '../../domain/entities/diagnosis_scale_question.dart';
import '../controllers/diagnosis_workspace_controller.dart';
import '../state/diagnosis_workspace_state.dart';

final diagnosisWorkspaceControllerProvider =
    StateNotifierProvider<
      DiagnosisWorkspaceController,
      DiagnosisWorkspaceState
    >((ref) {
      return DiagnosisWorkspaceController();
    });

final diagnosisQuestionsByAreaProvider =
    Provider.family<List<DiagnosisScaleQuestion>, BusinessArea>((ref, area) {
      final state = ref.watch(diagnosisWorkspaceControllerProvider);
      return state.questions
          .where((question) => question.area == area)
          .toList();
    });

final diagnosisAreaScoreProvider =
    Provider.family<AreaScoreSnapshot?, BusinessArea>((ref, area) {
      final state = ref.watch(diagnosisWorkspaceControllerProvider);
      for (final snapshot in state.areaScores) {
        if (snapshot.area == area) {
          return snapshot;
        }
      }
      return null;
    });
