enum ActionPlanTaskPriority { low, medium, high, critical }

enum ActionPlanTaskStatus { todo, inProgress, done, canceled }

enum ActionPlanTaskSource { researchRecommendation, manual, ai }

enum ActionPlanTaskScope { all, mine, overdue, dueSoon, critical, completed }

enum ActionPlanVersionStatus { draft, active, completed, archived }

enum ActionPlanVersionSource { ai, manual }

class ActionPlanVersionSummary {
  const ActionPlanVersionSummary({
    required this.id,
    required this.companyId,
    required this.submissionId,
    required this.versionNumber,
    required this.status,
    required this.source,
    required this.createdAt,
    required this.updatedAt,
    required this.tasksCount,
    this.generatedByUserId,
    this.generatedByUserName,
    this.archivedAt,
  });

  final String id;
  final String companyId;
  final String submissionId;
  final int versionNumber;
  final ActionPlanVersionStatus status;
  final ActionPlanVersionSource source;
  final String? generatedByUserId;
  final String? generatedByUserName;
  final DateTime createdAt;
  final DateTime updatedAt;
  final DateTime? archivedAt;
  final int tasksCount;
}

class ActionPlanAssignee {
  const ActionPlanAssignee({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
    required this.jobRole,
    required this.department,
    required this.companyId,
  });

  final String id;
  final String name;
  final String email;
  final String role;
  final String jobRole;
  final String department;
  final String companyId;
}

class ActionPlanTask {
  const ActionPlanTask({
    required this.id,
    required this.companyId,
    required this.title,
    required this.description,
    required this.priority,
    required this.status,
    required this.source,
    required this.createdAt,
    required this.updatedAt,
    this.companyName,
    this.submissionId,
    this.planVersionId,
    this.pillar,
    this.dueDate,
    this.responsibleUserId,
    this.responsibleUserName,
    this.responsibleUserEmail,
    this.completedAt,
    this.isOverdue = false,
    this.daysOverdue = 0,
    this.isDueSoon = false,
  });

  final String id;
  final String companyId;
  final String? companyName;
  final String? submissionId;
  final String? planVersionId;
  final String title;
  final String description;
  final String? pillar;
  final ActionPlanTaskPriority priority;
  final ActionPlanTaskStatus status;
  final DateTime? dueDate;
  final String? responsibleUserId;
  final String? responsibleUserName;
  final String? responsibleUserEmail;
  final ActionPlanTaskSource source;
  final DateTime createdAt;
  final DateTime updatedAt;
  final DateTime? completedAt;
  final bool isOverdue;
  final int daysOverdue;
  final bool isDueSoon;

  ActionPlanTask copyWith({
    String? id,
    String? companyId,
    String? companyName,
    String? submissionId,
    String? planVersionId,
    String? title,
    String? description,
    String? pillar,
    ActionPlanTaskPriority? priority,
    ActionPlanTaskStatus? status,
    DateTime? dueDate,
    String? responsibleUserId,
    String? responsibleUserName,
    String? responsibleUserEmail,
    ActionPlanTaskSource? source,
    DateTime? createdAt,
    DateTime? updatedAt,
    DateTime? completedAt,
    bool? isOverdue,
    int? daysOverdue,
    bool? isDueSoon,
  }) {
    return ActionPlanTask(
      id: id ?? this.id,
      companyId: companyId ?? this.companyId,
      companyName: companyName ?? this.companyName,
      submissionId: submissionId ?? this.submissionId,
      planVersionId: planVersionId ?? this.planVersionId,
      title: title ?? this.title,
      description: description ?? this.description,
      pillar: pillar ?? this.pillar,
      priority: priority ?? this.priority,
      status: status ?? this.status,
      dueDate: dueDate ?? this.dueDate,
      responsibleUserId: responsibleUserId ?? this.responsibleUserId,
      responsibleUserName: responsibleUserName ?? this.responsibleUserName,
      responsibleUserEmail: responsibleUserEmail ?? this.responsibleUserEmail,
      source: source ?? this.source,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      completedAt: completedAt ?? this.completedAt,
      isOverdue: isOverdue ?? this.isOverdue,
      daysOverdue: daysOverdue ?? this.daysOverdue,
      isDueSoon: isDueSoon ?? this.isDueSoon,
    );
  }
}

class ActionPlanGenerationResult {
  const ActionPlanGenerationResult({
    required this.submissionId,
    required this.companyId,
    required this.alreadyGenerated,
    this.planVersion,
    required this.createdCount,
    required this.tasks,
  });

  final String submissionId;
  final String companyId;
  final bool alreadyGenerated;
  final ActionPlanVersionSummary? planVersion;
  final int createdCount;
  final List<ActionPlanTask> tasks;
}
