import 'package:dio/dio.dart';
import 'dart:typed_data';

import '../../../../core/http/plan_limit_error_mapper.dart';
import '../../domain/entities/report.dart';

class ReportPdfFile {
  const ReportPdfFile({required this.filename, required this.bytes});

  final String filename;
  final Uint8List bytes;
}

class ReportsService {
  ReportsService(this._dio);

  final Dio _dio;

  Future<List<ReportSummary>> listResearchReports() async {
    try {
      final response = await _dio.get<List<dynamic>>('/reports/research');
      final data = response.data ?? const [];
      return data
          .whereType<Map>()
          .map((item) => _summaryFromMap(Map<String, dynamic>.from(item)))
          .toList();
    } on DioException catch (error) {
      throw Exception(
        _extractError(error, fallback: 'Falha ao carregar os relatorios.'),
      );
    }
  }

  Future<ExecutiveReport> getExecutiveReport(String submissionId) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/reports/research/$submissionId/executive',
      );

      return _executiveFromMap(response.data ?? const {});
    } on DioException catch (error) {
      throw Exception(
        _extractError(
          error,
          fallback: 'Falha ao carregar o relatorio executivo.',
        ),
      );
    }
  }

  Future<ReportPdfFile> downloadExecutiveReportPdf(String submissionId) async {
    try {
      final response = await _dio.get<List<int>>(
        '/reports/research/$submissionId/executive/pdf',
        options: Options(responseType: ResponseType.bytes),
      );

      final filename = _extractFilename(
        response.headers.value('content-disposition'),
        fallback: 'relatorio-executivo-$submissionId.pdf',
      );
      final bytes = Uint8List.fromList(response.data ?? const <int>[]);
      return ReportPdfFile(filename: filename, bytes: bytes);
    } on DioException catch (error) {
      throw Exception(
        _extractError(error, fallback: 'Falha ao exportar o PDF do relatorio.'),
      );
    }
  }

  ReportSummary _summaryFromMap(Map<String, dynamic> map) {
    return ReportSummary(
      submissionId: map['submissionId']?.toString() ?? '',
      companyId: map['companyId']?.toString() ?? '',
      companyName: map['companyName']?.toString() ?? '',
      respondentName: map['respondentName']?.toString(),
      respondentRole: map['respondentRole']?.toString(),
      department: map['department']?.toString(),
      completedAt: _parseDate(map['completedAt']),
      overallScore: (map['overallScore'] as num?)?.toDouble(),
      maturityLevel: map['maturityLevel']?.toString(),
      maturityLabel: map['maturityLabel']?.toString(),
      actionPlanGenerated: map['actionPlanGenerated'] == true,
    );
  }

  ExecutiveReport _executiveFromMap(Map<String, dynamic> map) {
    final company = _readMap(map['company']);
    final research = _readMap(map['research']);
    final result = _readMap(map['result']);
    final actionPlan = _readMap(map['actionPlan']);

    return ExecutiveReport(
      companyId: company['companyId']?.toString() ?? '',
      companyName: company['companyName']?.toString() ?? '',
      companyStatus: company['companyStatus']?.toString() ?? '',
      submissionId: research['submissionId']?.toString() ?? '',
      respondentName: research['respondentName']?.toString(),
      respondentEmail: research['respondentEmail']?.toString(),
      respondentRole: research['respondentRole']?.toString(),
      department: research['department']?.toString(),
      status: research['status']?.toString() ?? '',
      createdAt: _parseDate(research['createdAt']),
      completedAt: _parseDate(research['completedAt']),
      overallScore: (research['overallScore'] as num?)?.toDouble(),
      maturityLevel: research['maturityLevel']?.toString(),
      maturityLabel: research['maturityLabel']?.toString(),
      summary: result['summary']?.toString(),
      pillarScores: _readPillarScores(result['pillarScores']),
      criticalPoints: _readStrings(result['criticalPoints']),
      opportunities: _readStrings(result['opportunities']),
      recommendations: _readStrings(result['recommendations']),
      nextSteps: _readStrings(result['nextSteps']),
      actionPlanGenerated: actionPlan['actionPlanGenerated'] == true,
      tasksTotal: (actionPlan['tasksTotal'] as num?)?.toInt() ?? 0,
      tasksTodo: (actionPlan['tasksTodo'] as num?)?.toInt() ?? 0,
      tasksInProgress: (actionPlan['tasksInProgress'] as num?)?.toInt() ?? 0,
      tasksDone: (actionPlan['tasksDone'] as num?)?.toInt() ?? 0,
      tasksCanceled: (actionPlan['tasksCanceled'] as num?)?.toInt() ?? 0,
      tasksOverdue: (actionPlan['tasksOverdue'] as num?)?.toInt() ?? 0,
      tasks: _readTasks(actionPlan['tasks']),
    );
  }

  List<ReportPillarScore> _readPillarScores(dynamic value) {
    if (value is! List) {
      return const [];
    }

    return value
        .whereType<Map>()
        .map(
          (item) => ReportPillarScore(
            pillar: item['pillar']?.toString() ?? '',
            score: (item['score'] as num?)?.toDouble() ?? 0,
            answersCount: (item['answersCount'] as num?)?.toInt(),
            maturity: item['maturity']?.toString(),
          ),
        )
        .where((item) => item.pillar.isNotEmpty)
        .toList();
  }

  List<ReportTask> _readTasks(dynamic value) {
    if (value is! List) {
      return const [];
    }

    return value
        .whereType<Map>()
        .map(
          (item) => ReportTask(
            id: item['id']?.toString() ?? '',
            title: item['title']?.toString() ?? '',
            description: item['description']?.toString() ?? '',
            pillar: item['pillar']?.toString(),
            priority: item['priority']?.toString() ?? '',
            status: item['status']?.toString() ?? '',
            dueDate: _parseDate(item['dueDate']),
            responsibleUserName: item['responsibleUserName']?.toString(),
            responsibleUserEmail: item['responsibleUserEmail']?.toString(),
            source: item['source']?.toString() ?? '',
          ),
        )
        .toList();
  }

  List<String> _readStrings(dynamic value) {
    if (value is! List) {
      return const [];
    }

    return value.map((item) => item.toString()).toList();
  }

  Map<String, dynamic> _readMap(dynamic value) {
    if (value is Map<String, dynamic>) {
      return value;
    }
    if (value is Map) {
      return Map<String, dynamic>.from(value);
    }
    return const {};
  }

  DateTime? _parseDate(dynamic value) {
    final raw = value?.toString();
    if (raw == null || raw.isEmpty) {
      return null;
    }

    return DateTime.tryParse(raw);
  }

  String _extractFilename(
    String? contentDisposition, {
    required String fallback,
  }) {
    if (contentDisposition == null || contentDisposition.trim().isEmpty) {
      return fallback;
    }

    final match = RegExp(
      'filename="?([^";]+)"?',
    ).firstMatch(contentDisposition);
    if (match == null) {
      return fallback;
    }

    return match.group(1)?.trim().isNotEmpty == true
        ? match.group(1)!.trim()
        : fallback;
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
        case 'FORBIDDEN':
          return 'Voce nao tem permissao para acessar este relatorio.';
        case 'REPORT_NOT_FOUND':
          return 'Relatorio nao encontrado.';
        case 'REPORT_NOT_AVAILABLE':
          return 'A pesquisa ainda nao foi concluida. O relatorio ainda nao esta disponivel.';
        case 'INACTIVE_USER':
          return 'Seu usuario esta inativo.';
      }
    }

    return fallback;
  }
}
