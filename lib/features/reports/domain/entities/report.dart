class ReportAreaScore {
  const ReportAreaScore({
    required this.name,
    required this.progress,
  });

  final String name;
  final double progress;
}

class ReportTask {
  const ReportTask({
    required this.title,
    required this.status,
    required this.priority,
  });

  final String title;
  final String status;
  final String priority;
}

class Report {
  const Report({
    required this.id,
    required this.title,
    required this.client,
    required this.sentAt,
    required this.summary,
    required this.type,
    required this.period,
    required this.status,
    required this.highlights,
    required this.consultant,
    required this.executiveSummary,
    required this.overallScore,
    required this.riskLevel,
    required this.planProgress,
    required this.engagement,
    required this.areas,
    required this.criticalIssues,
    required this.recommendations,
    required this.actionItems,
  });

  final String id;
  final String title;
  final String client;
  final DateTime sentAt;
  final String summary;
  final String type;
  final String period;
  final String status;
  final List<String> highlights;
  final String consultant;
  final String executiveSummary;
  final int overallScore;
  final String riskLevel;
  final double planProgress;
  final int engagement;
  final List<ReportAreaScore> areas;
  final List<String> criticalIssues;
  final List<String> recommendations;
  final List<ReportTask> actionItems;

  Report copyWith({
    String? id,
    String? title,
    String? client,
    DateTime? sentAt,
    String? summary,
    String? type,
    String? period,
    String? status,
    List<String>? highlights,
    String? consultant,
    String? executiveSummary,
    int? overallScore,
    String? riskLevel,
    double? planProgress,
    int? engagement,
    List<ReportAreaScore>? areas,
    List<String>? criticalIssues,
    List<String>? recommendations,
    List<ReportTask>? actionItems,
  }) {
    return Report(
      id: id ?? this.id,
      title: title ?? this.title,
      client: client ?? this.client,
      sentAt: sentAt ?? this.sentAt,
      summary: summary ?? this.summary,
      type: type ?? this.type,
      period: period ?? this.period,
      status: status ?? this.status,
      highlights: highlights ?? this.highlights,
      consultant: consultant ?? this.consultant,
      executiveSummary: executiveSummary ?? this.executiveSummary,
      overallScore: overallScore ?? this.overallScore,
      riskLevel: riskLevel ?? this.riskLevel,
      planProgress: planProgress ?? this.planProgress,
      engagement: engagement ?? this.engagement,
      areas: areas ?? this.areas,
      criticalIssues: criticalIssues ?? this.criticalIssues,
      recommendations: recommendations ?? this.recommendations,
      actionItems: actionItems ?? this.actionItems,
    );
  }
}
