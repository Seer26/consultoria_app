enum ResearchSubmissionStatus { inProgress, completed }

class ResearchPillarScore {
  const ResearchPillarScore({
    required this.pillar,
    required this.score,
    required this.answersCount,
    required this.maturity,
  });

  final String pillar;
  final double score;
  final int answersCount;
  final String maturity;
}

class ResearchSubmission {
  const ResearchSubmission({
    required this.id,
    required this.companyId,
    required this.companyName,
    required this.userId,
    required this.userName,
    required this.respondentRole,
    required this.department,
    required this.status,
    required this.answersCount,
    required this.createdAt,
    required this.updatedAt,
    this.overallScore,
    this.summary,
    this.completedAt,
    this.criticalPoints = const [],
    this.opportunities = const [],
    this.recommendations = const [],
    this.nextSteps = const [],
    this.pillarScores = const [],
  });

  final String id;
  final String companyId;
  final String companyName;
  final String userId;
  final String userName;
  final String respondentRole;
  final String department;
  final ResearchSubmissionStatus status;
  final int answersCount;
  final double? overallScore;
  final String? summary;
  final DateTime createdAt;
  final DateTime updatedAt;
  final DateTime? completedAt;
  final List<String> criticalPoints;
  final List<String> opportunities;
  final List<String> recommendations;
  final List<String> nextSteps;
  final List<ResearchPillarScore> pillarScores;
}
