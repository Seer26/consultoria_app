import 'package:dio/dio.dart';

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
          if (companyId != null && companyId.trim().isNotEmpty) 'companyId': companyId,
          'respondentRole': respondentRole,
          'department': department,
        },
      );

      return _sessionFromMap(response.data ?? const {});
    } on DioException catch (error) {
      throw Exception(_extractError(error, fallback: 'Falha ao iniciar a pesquisa.'));
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
      throw Exception(_extractError(error, fallback: 'Falha ao salvar a resposta.'));
    }
  }

  Future<ResearchCompletionResult> completeSubmission(String submissionId) async {
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
      throw Exception(_extractError(error, fallback: 'Falha ao finalizar a pesquisa.'));
    }
  }

  Future<List<ResearchSubmission>> listSubmissions({String? companyId}) async {
    try {
      final response = await _dio.get<List<dynamic>>(
        '/research/submissions',
        queryParameters: {
          if (companyId != null && companyId.trim().isNotEmpty) 'companyId': companyId,
        },
      );

      final data = response.data ?? const [];
      return data
          .whereType<Map>()
          .map((item) => _historyFromMap(Map<String, dynamic>.from(item)))
          .toList();
    } on DioException catch (error) {
      throw Exception(_extractError(error, fallback: 'Falha ao carregar o historico.'));
    }
  }

  ResearchSubmissionSession _sessionFromMap(Map<String, dynamic> map) {
    return ResearchSubmissionSession(
      id: map['id']?.toString() ?? '',
      companyId: map['companyId']?.toString() ??
          (map['company'] is Map ? (map['company'] as Map)['id']?.toString() ?? '' : ''),
      userId: map['userId']?.toString() ??
          (map['user'] is Map ? (map['user'] as Map)['id']?.toString() ?? '' : ''),
      respondentRole: map['respondentRole']?.toString() ?? '',
      department: map['department']?.toString() ?? '',
      status: map['status']?.toString() ?? 'IN_PROGRESS',
      overallScore: (map['overallScore'] as num?)?.toDouble(),
      summary: map['summary']?.toString(),
      createdAt: DateTime.tryParse(map['createdAt']?.toString() ?? '') ?? DateTime.now(),
      updatedAt: DateTime.tryParse(map['updatedAt']?.toString() ?? '') ?? DateTime.now(),
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
      answersCount: (map['answersCount'] as num?)?.toInt() ?? 0,
      overallScore: (map['overallScore'] as num?)?.toDouble(),
      summary: map['summary']?.toString(),
      createdAt: DateTime.tryParse(map['createdAt']?.toString() ?? '') ?? DateTime.now(),
      updatedAt: DateTime.tryParse(map['updatedAt']?.toString() ?? '') ?? DateTime.now(),
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
          ),
        )
        .where((item) => item.pillar.isNotEmpty)
        .toList();
  }

  String _extractError(DioException error, {required String fallback}) {
    final data = error.response?.data;
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
        case 'INACTIVE_USER':
          return 'Seu usuario esta inativo.';
        case 'FORBIDDEN':
          return 'Voce nao tem permissao para acessar esta pesquisa.';
      }
    }

    return fallback;
  }
}
