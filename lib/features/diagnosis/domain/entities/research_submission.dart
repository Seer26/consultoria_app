enum ResearchSubmissionStatus { inProgress, completed }

enum AiRecommendationPriority { high, medium, low }

enum DiagnosisReviewStatus { awaitingReview, approved, published }

class DiagnosisScoreInterpretation {
  const DiagnosisScoreInterpretation({
    required this.classification,
    required this.label,
    required this.description,
  });

  final String classification;
  final String label;
  final String description;
}

class AiConsultingRecommendation {
  const AiConsultingRecommendation({
    required this.title,
    required this.description,
    required this.priority,
    required this.pillar,
  });
  final String title;
  final String description;
  final AiRecommendationPriority priority;
  final String pillar;
}

class AiConsultingAnalysis {
  const AiConsultingAnalysis({
    required this.executiveSummary,
    required this.strengths,
    required this.attentionPoints,
    required this.recommendations,
    required this.generatedAt,
  });
  final String executiveSummary;
  final List<String> strengths;
  final List<String> attentionPoints;
  final List<AiConsultingRecommendation> recommendations;
  final DateTime generatedAt;
}

class ResearchPillarScore {
  const ResearchPillarScore({
    required this.pillar,
    required this.score,
    required this.answersCount,
    required this.maturity,
    this.scoreInterpretation,
  });

  final String pillar;
  final double score;
  final int answersCount;
  final String maturity;
  final DiagnosisScoreInterpretation? scoreInterpretation;
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
    required this.diagnosisStatus,
    required this.answersCount,
    required this.createdAt,
    required this.updatedAt,
    this.overallScore,
    this.scoreInterpretation,
    this.summary,
    this.completedAt,
    this.criticalPoints = const [],
    this.opportunities = const [],
    this.recommendations = const [],
    this.nextSteps = const [],
    this.pillarScores = const [],
    this.aiAnalysis,
  });

  final String id;
  final String companyId;
  final String companyName;
  final String userId;
  final String userName;
  final String respondentRole;
  final String department;
  final ResearchSubmissionStatus status;
  final DiagnosisReviewStatus diagnosisStatus;
  final int answersCount;
  final double? overallScore;
  final DiagnosisScoreInterpretation? scoreInterpretation;
  final String? summary;
  final DateTime createdAt;
  final DateTime updatedAt;
  final DateTime? completedAt;
  final List<String> criticalPoints;
  final List<String> opportunities;
  final List<String> recommendations;
  final List<String> nextSteps;
  final List<ResearchPillarScore> pillarScores;
  final AiConsultingAnalysis? aiAnalysis;
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
    required this.diagnosisStatus,
    required this.createdAt,
    required this.updatedAt,
    this.completedAt,
    this.overallScore,
    this.scoreInterpretation,
    this.summary,
    this.criticalPoints = const [],
    this.opportunities = const [],
    this.recommendations = const [],
    this.nextSteps = const [],
    this.pillarScores = const [],
    this.answers = const [],
    this.aiAnalysis,
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
  final DiagnosisReviewStatus diagnosisStatus;
  final DateTime createdAt;
  final DateTime updatedAt;
  final DateTime? completedAt;
  final double? overallScore;
  final DiagnosisScoreInterpretation? scoreInterpretation;
  final String? summary;
  final List<String> criticalPoints;
  final List<String> opportunities;
  final List<String> recommendations;
  final List<String> nextSteps;
  final List<ResearchPillarScore> pillarScores;
  final List<ResearchAnswer> answers;
  final AiConsultingAnalysis? aiAnalysis;
}
