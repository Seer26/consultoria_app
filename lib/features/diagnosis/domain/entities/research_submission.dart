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

class ResearchAnswer {
  const ResearchAnswer({
    required this.id,
    required this.question,
    required this.answer,
    required this.createdAt,
    this.pillar,
    this.score,
  });

  final String id;
  final String question;
  final String answer;
  final String? pillar;
  final double? score;
  final DateTime createdAt;
}

class ResearchSubmissionDetails {
  const ResearchSubmissionDetails({
    required this.id,
    required this.companyId,
    required this.companyName,
    required this.userId,
    required this.userName,
    required this.userEmail,
    required this.respondentRole,
    required this.department,
    required this.status,
    required this.createdAt,
    required this.updatedAt,
    this.completedAt,
    this.overallScore,
    this.summary,
    this.criticalPoints = const [],
    this.opportunities = const [],
    this.recommendations = const [],
    this.nextSteps = const [],
    this.pillarScores = const [],
    this.answers = const [],
  });

  final String id;
  final String companyId;
  final String companyName;
  final String userId;
  final String userName;
  final String userEmail;
  final String respondentRole;
  final String department;
  final ResearchSubmissionStatus status;
  final DateTime createdAt;
  final DateTime updatedAt;
  final DateTime? completedAt;
  final double? overallScore;
  final String? summary;
  final List<String> criticalPoints;
  final List<String> opportunities;
  final List<String> recommendations;
  final List<String> nextSteps;
  final List<ResearchPillarScore> pillarScores;
  final List<ResearchAnswer> answers;
}
