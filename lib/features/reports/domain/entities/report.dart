class ReportPillarScore {
  const ReportPillarScore({
    required this.pillar,
    required this.score,
    this.answersCount,
    this.maturity,
  });

  final String pillar;
  final double score;
  final int? answersCount;
  final String? maturity;
}

class ReportTask {
  const ReportTask({
    required this.id,
    required this.title,
    required this.description,
    required this.priority,
    required this.status,
    required this.source,
    this.pillar,
    this.dueDate,
    this.responsibleUserName,
    this.responsibleUserEmail,
  });

  final String id;
  final String title;
  final String description;
  final String? pillar;
  final String priority;
  final String status;
  final DateTime? dueDate;
  final String? responsibleUserName;
  final String? responsibleUserEmail;
  final String source;
}

class ReportSummary {
  const ReportSummary({
    required this.submissionId,
    required this.companyId,
    required this.companyName,
    required this.actionPlanGenerated,
    this.respondentName,
    this.respondentRole,
    this.department,
    this.completedAt,
    this.overallScore,
    this.maturityLevel,
    this.maturityLabel,
  });

  final String submissionId;
  final String companyId;
  final String companyName;
  final String? respondentName;
  final String? respondentRole;
  final String? department;
  final DateTime? completedAt;
  final double? overallScore;
  final String? maturityLevel;
  final String? maturityLabel;
  final bool actionPlanGenerated;
}

class ExecutiveReport {
  const ExecutiveReport({
    required this.companyId,
    required this.companyName,
    required this.companyStatus,
    required this.submissionId,
    required this.status,
    required this.actionPlanGenerated,
    required this.tasksTotal,
    required this.tasksTodo,
    required this.tasksInProgress,
    required this.tasksDone,
    required this.tasksCanceled,
    required this.tasksOverdue,
    required this.pillarScores,
    required this.criticalPoints,
    required this.opportunities,
    required this.recommendations,
    required this.nextSteps,
    required this.tasks,
    this.respondentName,
    this.respondentEmail,
    this.respondentRole,
    this.department,
    this.createdAt,
    this.completedAt,
    this.overallScore,
    this.maturityLevel,
    this.maturityLabel,
    this.summary,
  });

  final String companyId;
  final String companyName;
  final String companyStatus;
  final String submissionId;
  final String? respondentName;
  final String? respondentEmail;
  final String? respondentRole;
  final String? department;
  final String status;
  final DateTime? createdAt;
  final DateTime? completedAt;
  final double? overallScore;
  final String? maturityLevel;
  final String? maturityLabel;
  final String? summary;
  final List<ReportPillarScore> pillarScores;
  final List<String> criticalPoints;
  final List<String> opportunities;
  final List<String> recommendations;
  final List<String> nextSteps;
  final bool actionPlanGenerated;
  final int tasksTotal;
  final int tasksTodo;
  final int tasksInProgress;
  final int tasksDone;
  final int tasksCanceled;
  final int tasksOverdue;
  final List<ReportTask> tasks;
}
