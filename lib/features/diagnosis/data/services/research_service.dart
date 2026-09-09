import 'package:dio/dio.dart';

import '../../../../core/http/plan_limit_error_mapper.dart';
import '../../../action_plan/domain/entities/action_plan_task.dart';
import '../../domain/entities/research_submission.dart';

class ResearchSubmissionSession {
  const ResearchSubmissionSession({
    required this.id,
    required this.companyId,
    required this.userId,
    required this.respondentRole,
    required this.department,
    required this.status,
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
    this.scoreInterpretation,
    this.aiAnalysis,
  });

  final String id;
  final String companyId;
  final String userId;
  final String respondentRole;
  final String department;
  final String status;
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
  final DiagnosisScoreInterpretation? scoreInterpretation;
  final AiConsultingAnalysis? aiAnalysis;
}

class ResearchCompletionResult {
  const ResearchCompletionResult({
    required this.submission,
    required this.answersCount,
  });

  final ResearchSubmissionSession submission;
  final int answersCount;
}

class ResearchService {
  ResearchService(this._dio);

  final Dio _dio;

  Future<ResearchSubmissionSession> createSubmission({
    String? companyId,
    required String respondentRole,
    required String department,
  }) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/research/submissions',
        data: {
          if (companyId != null && companyId.trim().isNotEmpty)
            'companyId': companyId,
          'respondentRole': respondentRole,
          'department': department,
        },
      );

      return _sessionFromMap(response.data ?? const {});
    } on DioException catch (error) {
      throw Exception(
        _extractError(error, fallback: 'Falha ao iniciar a pesquisa.'),
      );
    }
  }

  Future<void> saveAnswer({
    required String submissionId,
    required String question,
    required String answer,
    String? pillar,
    double? score,
  }) async {
    try {
      await _dio.post<Map<String, dynamic>>(
        '/research/submissions/$submissionId/answers',
        data: {
          'question': question,
          'answer': answer,
          if (pillar != null && pillar.trim().isNotEmpty) 'pillar': pillar,
          if (score != null) 'score': score,
        },
      );
    } on DioException catch (error) {
      throw Exception(
        _extractError(error, fallback: 'Falha ao salvar a resposta.'),
      );
    }
  }

  Future<ResearchCompletionResult> completeSubmission(
    String submissionId,
  ) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/research/submissions/$submissionId/complete',
        data: const {},
      );

      final data = response.data ?? const {};
      final submission = _sessionFromMap(data);
      final answers = (data['answers'] as List?) ?? const [];

      return ResearchCompletionResult(
        submission: submission,
        answersCount: answers.length,
      );
    } on DioException catch (error) {
      throw Exception(
        _extractError(error, fallback: 'Falha ao finalizar a pesquisa.'),
      );
    }
  }

  Future<AiConsultingAnalysis> generateAiAnalysis(
    String submissionId, {
    bool retry = false,
  }) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/ai/research/$submissionId/analysis',
        data: {'retry': retry},
      );
      return _aiAnalysisFromMap(response.data ?? const {});
    } on DioException catch (error) {
      final planLimit = planLimitMessageFromResponseData(error.response?.data);
      throw Exception(
        planLimit ??
            'Nao foi possivel gerar a analise inteligente agora. Os resultados calculados continuam disponiveis.',
      );
    }
  }

  Future<ActionPlanGenerationResult> generateActionPlan(
    String submissionId,
  ) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/research/submissions/$submissionId/generate-action-plan',
      );

      final data = response.data ?? const {};
      return ActionPlanGenerationResult(
        submissionId: data['submissionId']?.toString() ?? submissionId,
        companyId: data['companyId']?.toString() ?? '',
        alreadyGenerated: data['alreadyGenerated'] == true,
        createdCount: (data['createdCount'] as num?)?.toInt() ?? 0,
        tasks: ((data['tasks'] as List?) ?? const [])
            .whereType<Map>()
            .map(
              (item) => ActionPlanTask(
                id: item['id']?.toString() ?? '',
                companyId: item['companyId']?.toString() ?? '',
                companyName: item['companyName']?.toString(),
                submissionId: item['submissionId']?.toString(),
                title: item['title']?.toString() ?? '',
                description: item['description']?.toString() ?? '',
                pillar: item['pillar']?.toString(),
                priority: _taskPriorityFromApi(item['priority']?.toString()),
                status: _taskStatusFromApi(item['status']?.toString()),
                dueDate: _parseDate(item['dueDate']),
                responsibleUserId: item['responsibleUserId']?.toString(),
                responsibleUserName: item['responsibleUserName']?.toString(),
                responsibleUserEmail: item['responsibleUserEmail']?.toString(),
                source: _taskSourceFromApi(item['source']?.toString()),
                createdAt: _parseDate(item['createdAt']) ?? DateTime.now(),
                updatedAt: _parseDate(item['updatedAt']) ?? DateTime.now(),
                completedAt: _parseDate(item['completedAt']),
              ),
            )
            .toList(),
      );
    } on DioException catch (error) {
      throw Exception(
        _extractError(
          error,
          fallback: 'Falha ao gerar o plano de acao da pesquisa.',
        ),
      );
    }
  }

  Future<List<ResearchSubmission>> listSubmissions({String? companyId}) async {
    try {
      final response = await _dio.get<List<dynamic>>(
        '/research/submissions',
        queryParameters: {
          if (companyId != null && companyId.trim().isNotEmpty)
            'companyId': companyId,
        },
      );

      final data = response.data ?? const [];
      return data
          .whereType<Map>()
          .map((item) => _historyFromMap(Map<String, dynamic>.from(item)))
          .toList();
    } on DioException catch (error) {
      throw Exception(
        _extractError(error, fallback: 'Falha ao carregar o historico.'),
      );
    }
  }

  Future<ResearchSubmissionDetails> getSubmissionById(
    String submissionId,
  ) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/research/submissions/$submissionId',
      );
      return _detailsFromMap(response.data ?? const {});
    } on DioException catch (error) {
      throw Exception(
        _extractError(
          error,
          fallback: 'Falha ao carregar o resultado da pesquisa.',
        ),
      );
    }
  }

  Future<ResearchSubmissionDetails> reviewDiagnosis(
    String submissionId, {
    String? summary,
    List<String>? criticalPoints,
    List<String>? opportunities,
    List<String>? recommendations,
    List<String>? nextSteps,
    String? reviewNotes,
  }) async {
    try {
      final response = await _dio.put<Map<String, dynamic>>(
        '/research/submissions/$submissionId/diagnosis/review',
        data: {
          if (summary != null) 'summary': summary,
          if (criticalPoints != null) 'criticalPoints': criticalPoints,
          if (opportunities != null) 'opportunities': opportunities,
          if (recommendations != null) 'recommendations': recommendations,
          if (nextSteps != null) 'nextSteps': nextSteps,
          if (reviewNotes != null) 'reviewNotes': reviewNotes,
        },
      );
      return _detailsFromMap(response.data ?? const {});
    } on DioException catch (error) {
      throw Exception(
        _extractError(error, fallback: 'Falha ao revisar o diagnóstico.'),
      );
    }
  }

  Future<ResearchSubmissionDetails> approveDiagnosis(String submissionId) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/research/submissions/$submissionId/diagnosis/approve',
      );
      return _detailsFromMap(response.data ?? const {});
    } on DioException catch (error) {
      throw Exception(
        _extractError(error, fallback: 'Falha ao aprovar o diagnóstico.'),
      );
    }
  }

  Future<ResearchSubmissionDetails> publishDiagnosis(String submissionId) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/research/submissions/$submissionId/diagnosis/publish',
      );
      return _detailsFromMap(response.data ?? const {});
    } on DioException catch (error) {
      throw Exception(
        _extractError(error, fallback: 'Falha ao publicar o diagnóstico.'),
      );
    }
  }

  ResearchSubmissionDetails _detailsFromMap(Map<String, dynamic> map) {
    final company = map['company'] is Map
        ? Map<String, dynamic>.from(map['company'] as Map)
        : const <String, dynamic>{};
    final user = map['user'] is Map
        ? Map<String, dynamic>.from(map['user'] as Map)
        : const <String, dynamic>{};
    final answers = map['answers'] is List ? map['answers'] as List : const [];

    return ResearchSubmissionDetails(
      id: map['id']?.toString() ?? '',
      companyId: company['id']?.toString() ?? '',
      companyName: company['name']?.toString() ?? '',
      userId: user['id']?.toString() ?? '',
      userName: user['name']?.toString() ?? '',
      userEmail: user['email']?.toString() ?? '',
      respondentRole: map['respondentRole']?.toString() ?? '',
      department: map['department']?.toString() ?? '',
      status: map['status']?.toString() == 'COMPLETED'
          ? ResearchSubmissionStatus.completed
          : ResearchSubmissionStatus.inProgress,
      diagnosisStatus: _diagnosisStatusFromApi(map['diagnosisStatus']),
      overallScore: (map['overallScore'] as num?)?.toDouble(),
      scoreInterpretation: _readScoreInterpretation(map['scoreInterpretation']),
      summary: map['summary']?.toString(),
      createdAt:
          DateTime.tryParse(map['createdAt']?.toString() ?? '') ??
          DateTime.now(),
      updatedAt:
          DateTime.tryParse(map['updatedAt']?.toString() ?? '') ??
          DateTime.now(),
      completedAt: _parseDate(map['completedAt']),
      criticalPoints: _readStringList(map['criticalPoints']),
      opportunities: _readStringList(map['opportunities']),
      recommendations: _readStringList(map['recommendations']),
      nextSteps: _readStringList(map['nextSteps']),
      pillarScores: _readPillarScores(map['pillarScores']),
      answers: answers
          .whereType<Map>()
          .map(
            (item) => ResearchAnswer(
              id: item['id']?.toString() ?? '',
              question: item['question']?.toString() ?? '',
              answer: item['answer']?.toString() ?? '',
              pillar: item['pillar']?.toString(),
              score: (item['score'] as num?)?.toDouble(),
              createdAt:
                  DateTime.tryParse(item['createdAt']?.toString() ?? '') ??
                  DateTime.now(),
            ),
          )
          .toList(),
      aiAnalysis: _readAiAnalysis(map['aiAnalysis']),
    );
  }

  ResearchSubmissionSession _sessionFromMap(Map<String, dynamic> map) {
    return ResearchSubmissionSession(
      id: map['id']?.toString() ?? '',
      companyId:
          map['companyId']?.toString() ??
          (map['company'] is Map
              ? (map['company'] as Map)['id']?.toString() ?? ''
              : ''),
      userId:
          map['userId']?.toString() ??
          (map['user'] is Map
              ? (map['user'] as Map)['id']?.toString() ?? ''
              : ''),
      respondentRole: map['respondentRole']?.toString() ?? '',
      department: map['department']?.toString() ?? '',
      status: map['status']?.toString() ?? 'IN_PROGRESS',
      overallScore: (map['overallScore'] as num?)?.toDouble(),
      scoreInterpretation: _readScoreInterpretation(map['scoreInterpretation']),
      summary: map['summary']?.toString(),
      createdAt:
          DateTime.tryParse(map['createdAt']?.toString() ?? '') ??
          DateTime.now(),
      updatedAt:
          DateTime.tryParse(map['updatedAt']?.toString() ?? '') ??
          DateTime.now(),
      completedAt: map['completedAt'] == null
          ? null
          : DateTime.tryParse(map['completedAt']?.toString() ?? ''),
      criticalPoints: _readStringList(map['criticalPoints']),
      opportunities: _readStringList(map['opportunities']),
      recommendations: _readStringList(map['recommendations']),
      nextSteps: _readStringList(map['nextSteps']),
      pillarScores: _readPillarScores(map['pillarScores']),
      aiAnalysis: _readAiAnalysis(map['aiAnalysis']),
    );
  }

  ResearchSubmission _historyFromMap(Map<String, dynamic> map) {
    return ResearchSubmission(
      id: map['id']?.toString() ?? '',
      companyId: map['companyId']?.toString() ?? '',
      companyName: map['companyName']?.toString() ?? '',
      userId: map['userId']?.toString() ?? '',
      userName: map['userName']?.toString() ?? '',
      respondentRole: map['respondentRole']?.toString() ?? '',
      department: map['department']?.toString() ?? '',
      status: map['status']?.toString() == 'COMPLETED'
          ? ResearchSubmissionStatus.completed
          : ResearchSubmissionStatus.inProgress,
      diagnosisStatus: _diagnosisStatusFromApi(map['diagnosisStatus']),
      answersCount: (map['answersCount'] as num?)?.toInt() ?? 0,
      overallScore: (map['overallScore'] as num?)?.toDouble(),
      scoreInterpretation: _readScoreInterpretation(map['scoreInterpretation']),
      summary: map['summary']?.toString(),
      createdAt:
          DateTime.tryParse(map['createdAt']?.toString() ?? '') ??
          DateTime.now(),
      updatedAt:
          DateTime.tryParse(map['updatedAt']?.toString() ?? '') ??
          DateTime.now(),
      completedAt: map['completedAt'] == null
          ? null
          : DateTime.tryParse(map['completedAt']?.toString() ?? ''),
      criticalPoints: _readStringList(map['criticalPoints']),
      opportunities: _readStringList(map['opportunities']),
      recommendations: _readStringList(map['recommendations']),
      nextSteps: _readStringList(map['nextSteps']),
      pillarScores: _readPillarScores(map['pillarScores']),
    );
  }

  List<String> _readStringList(dynamic value) {
    if (value is List) {
      return value.map((item) => item.toString()).toList();
    }
    return const [];
  }

  DiagnosisReviewStatus _diagnosisStatusFromApi(dynamic value) {
    switch (value?.toString()) {
      case 'APROVADO':
        return DiagnosisReviewStatus.approved;
      case 'PUBLICADO':
        return DiagnosisReviewStatus.published;
      case 'AGUARDANDO_REVISAO':
      default:
        return DiagnosisReviewStatus.awaitingReview;
    }
  }

  List<ResearchPillarScore> _readPillarScores(dynamic value) {
    if (value is! List) {
      return const [];
    }

    return value
        .whereType<Map>()
        .map(
          (item) => ResearchPillarScore(
            pillar: item['pillar']?.toString() ?? '',
            score: (item['score'] as num?)?.toDouble() ?? 0,
            answersCount: (item['answersCount'] as num?)?.toInt() ?? 0,
            maturity: item['maturity']?.toString() ?? '',
            scoreInterpretation: _readScoreInterpretation(
              item['scoreInterpretation'],
            ),
          ),
        )
        .where((item) => item.pillar.isNotEmpty)
        .toList();
  }

  AiConsultingAnalysis? _readAiAnalysis(dynamic value) {
    if (value is! Map) return null;
    return _aiAnalysisFromMap(Map<String, dynamic>.from(value));
  }

  DiagnosisScoreInterpretation? _readScoreInterpretation(dynamic value) {
    if (value is! Map) return null;
    final map = Map<String, dynamic>.from(value);
    final classification = map['classification']?.toString() ?? '';
    final label = map['label']?.toString() ?? '';
    final description = map['description']?.toString() ?? '';
    if (classification.isEmpty || label.isEmpty || description.isEmpty) {
      return null;
    }
    return DiagnosisScoreInterpretation(
      classification: classification,
      label: label,
      description: description,
    );
  }

  AiConsultingAnalysis _aiAnalysisFromMap(Map<String, dynamic> map) {
    final recommendations = (map['recommendations'] as List?) ?? const [];
    return AiConsultingAnalysis(
      executiveSummary: map['executiveSummary']?.toString() ?? '',
      strengths: _readStringList(map['strengths']),
      attentionPoints: _readStringList(map['attentionPoints']),
      recommendations: recommendations.whereType<Map>().map((item) {
        final priority = item['priority']?.toString();
        return AiConsultingRecommendation(
          title: item['title']?.toString() ?? '',
          description: item['description']?.toString() ?? '',
          pillar: item['pillar']?.toString() ?? '',
          priority: priority == 'HIGH'
              ? AiRecommendationPriority.high
              : priority == 'LOW'
              ? AiRecommendationPriority.low
              : AiRecommendationPriority.medium,
        );
      }).toList(),
      generatedAt:
          DateTime.tryParse(map['generatedAt']?.toString() ?? '') ??
          DateTime.now(),
    );
  }

  DateTime? _parseDate(dynamic value) {
    final raw = value?.toString();
    if (raw == null || raw.isEmpty) {
      return null;
    }

    return DateTime.tryParse(raw);
  }

  ActionPlanTaskPriority _taskPriorityFromApi(String? value) {
    switch (value) {
      case 'LOW':
        return ActionPlanTaskPriority.low;
      case 'HIGH':
        return ActionPlanTaskPriority.high;
      case 'CRITICAL':
        return ActionPlanTaskPriority.critical;
      case 'MEDIUM':
      default:
        return ActionPlanTaskPriority.medium;
    }
  }

  ActionPlanTaskStatus _taskStatusFromApi(String? value) {
    switch (value) {
      case 'IN_PROGRESS':
        return ActionPlanTaskStatus.inProgress;
      case 'DONE':
        return ActionPlanTaskStatus.done;
      case 'CANCELED':
        return ActionPlanTaskStatus.canceled;
      case 'TODO':
      default:
        return ActionPlanTaskStatus.todo;
    }
  }

  ActionPlanTaskSource _taskSourceFromApi(String? value) {
    switch (value) {
      case 'RESEARCH_RECOMMENDATION':
        return ActionPlanTaskSource.researchRecommendation;
      case 'AI':
        return ActionPlanTaskSource.ai;
      case 'MANUAL':
      default:
        return ActionPlanTaskSource.manual;
    }
  }

  String _extractError(DioException error, {required String fallback}) {
    final data = error.response?.data;
    final planLimitMessage = planLimitMessageFromResponseData(data);
    if (planLimitMessage != null) {
      return planLimitMessage;
    }

    if (data is Map && data['error'] != null) {
      final code = data['error'].toString();
      switch (code) {
        case 'COMPANY_ID_REQUIRED':
          return 'Usuario sem empresa vinculada ou empresa nao informada.';
        case 'RESEARCH_SUBMISSION_NOT_FOUND':
          return 'A submissao da pesquisa nao foi encontrada.';
        case 'RESEARCH_ALREADY_COMPLETED':
          return 'Esta pesquisa ja foi finalizada.';
        case 'RESEARCH_ANSWERS_REQUIRED':
          return 'Responda ao menos uma pergunta antes de finalizar.';
        case 'RESEARCH_MIN_QUESTIONS_REQUIRED':
          return 'Continue a pesquisa ate atingir a quantidade minima de perguntas.';
        case 'RESEARCH_COVERAGE_REQUIRED':
          return 'Continue a pesquisa para cobrir os pilares relevantes.';
        case 'EMPLOYEE_PROFILE_INCOMPLETE':
          return 'Seu perfil profissional esta incompleto. Solicite ao OWNER o preenchimento do departamento e da funcao.';
        case 'INACTIVE_USER':
          return 'Seu usuario esta inativo.';
        case 'FORBIDDEN':
          return 'Voce nao tem permissao para acessar esta pesquisa.';
        case 'ADMIN_RESEARCH_READ_ONLY':
          return 'O perfil ADMIN pode acompanhar resultados, mas nao responder pesquisas.';
        case 'ACTION_PLAN_SUBMISSION_NOT_COMPLETED':
          return 'Finalize a pesquisa antes de gerar o plano de acao.';
      }
    }

    return fallback;
  }
}
