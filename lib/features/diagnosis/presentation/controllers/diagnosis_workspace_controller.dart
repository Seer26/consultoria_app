import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../domain/entities/business_area.dart';
import '../mock/diagnosis_workspace_catalog.dart';
import '../state/diagnosis_workspace_state.dart';

class DiagnosisWorkspaceController extends StateNotifier<DiagnosisWorkspaceState> {
  DiagnosisWorkspaceController()
      : super(_buildDerivedState(buildInitialDiagnosisWorkspaceState()));

  void updateCompanyName(String value) {
    state = _buildDerivedState(state.copyWith(companyName: value));
  }

  void answerQuestion(String questionId, int value) {
    final nextAnswers = {...state.answers, questionId: value};
    state = _buildDerivedState(state.copyWith(answers: nextAnswers));
  }

  static DiagnosisWorkspaceState _buildDerivedState(
    DiagnosisWorkspaceState input,
  ) {
    final areaScores = BusinessArea.values.map((area) {
      final areaQuestions =
          input.questions.where((question) => question.area == area).toList();
      final answers = areaQuestions
          .map((question) => input.answers[question.id])
          .whereType<int>()
          .toList();
      final answeredQuestions = answers.length;
      final totalQuestions = areaQuestions.length;
      final averageScore = answeredQuestions == 0
          ? 0.0
          : answers.reduce((a, b) => a + b) / answeredQuestions;
      final totalScore = answers.fold<int>(0, (sum, item) => sum + item);
      final percentage = totalQuestions == 0
          ? 0
          : ((totalScore / (totalQuestions * 5)) * 100).round();

      return AreaScoreSnapshot(
        area: area,
        answeredQuestions: answeredQuestions,
        totalQuestions: totalQuestions,
        averageScore: averageScore,
        percentage: percentage,
      );
    }).toList();

    final overallScore = input.questions.isEmpty
        ? 0
        : ((input.answers.values.fold<int>(0, (sum, item) => sum + item) /
                    (input.questions.length * 5)) *
                100)
            .round();
    final completion = input.questions.isEmpty
        ? 0
        : ((input.answers.length / input.questions.length) * 100).round();

    return input.copyWith(
      areaScores: areaScores,
      overallScore: overallScore,
      completion: completion,
    );
  }
}
