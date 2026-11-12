import '../../domain/entities/business_area.dart';
import '../../domain/entities/diagnosis_scale_question.dart';

class AreaScoreSnapshot {
  const AreaScoreSnapshot({
    required this.area,
    required this.answeredQuestions,
    required this.totalQuestions,
    required this.averageScore,
    required this.percentage,
  });

  final BusinessArea area;
  final int answeredQuestions;
  final int totalQuestions;
  final double averageScore;
  final int percentage;
}

class PriorityTask {
  const PriorityTask({
    required this.title,
    required this.area,
    required this.priority,
  });

  final String title;
  final BusinessArea area;
  final String priority;
}

class WorkspaceAlert {
  const WorkspaceAlert({required this.title, required this.description});

  final String title;
  final String description;
}

class DiagnosisWorkspaceState {
  const DiagnosisWorkspaceState({
    required this.companyName,
    required this.questions,
    required this.answers,
    required this.areaScores,
    required this.priorityTasks,
    required this.alerts,
    required this.overallScore,
    required this.completion,
  });

  final String companyName;
  final List<DiagnosisScaleQuestion> questions;
  final Map<String, int> answers;
  final List<AreaScoreSnapshot> areaScores;
  final List<PriorityTask> priorityTasks;
  final List<WorkspaceAlert> alerts;
  final int overallScore;
  final int completion;

  DiagnosisWorkspaceState copyWith({
    String? companyName,
    List<DiagnosisScaleQuestion>? questions,
    Map<String, int>? answers,
    List<AreaScoreSnapshot>? areaScores,
    List<PriorityTask>? priorityTasks,
    List<WorkspaceAlert>? alerts,
    int? overallScore,
    int? completion,
  }) {
    return DiagnosisWorkspaceState(
      companyName: companyName ?? this.companyName,
      questions: questions ?? this.questions,
      answers: answers ?? this.answers,
      areaScores: areaScores ?? this.areaScores,
      priorityTasks: priorityTasks ?? this.priorityTasks,
      alerts: alerts ?? this.alerts,
      overallScore: overallScore ?? this.overallScore,
      completion: completion ?? this.completion,
    );
  }
}
