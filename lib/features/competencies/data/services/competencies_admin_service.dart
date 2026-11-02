import 'package:dio/dio.dart';
import '../../../../core/errors/api_error_presenter.dart';
import '../../domain/entities/competency.dart';
import '../../domain/entities/competency_assessment.dart';

class CompetenciesAdminService {
  CompetenciesAdminService(this._dio);
  final Dio _dio;
  String _company(String id) => '/companies/${Uri.encodeComponent(id)}';
  String _assessment(String companyId, String id) =>
      '${_company(companyId)}/competency-assessments/${Uri.encodeComponent(id)}';
  Future<List<Competency>> catalog(
    String companyId, {
    bool activeOnly = false,
  }) => _request(() async {
    final response = await _dio.get<List<dynamic>>(
      '${_company(companyId)}/competencies',
      queryParameters: {'status': 'ACTIVE'},
    );
    final active = response.data!
        .map(
          (item) => Competency.fromMap(Map<String, dynamic>.from(item as Map)),
        )
        .toList();
    if (activeOnly) return active;
    final inactive = await _dio.get<List<dynamic>>(
      '${_company(companyId)}/competencies',
      queryParameters: {'status': 'INACTIVE'},
    );
    final byId = {
      for (final item in [
        ...active,
        ...inactive.data!.map(
          (item) => Competency.fromMap(Map<String, dynamic>.from(item as Map)),
        ),
      ])
        item.id: item,
    };
    return byId.values.toList();
  });
  Future<void> saveCompetency(
    String companyId, {
    String? id,
    required String name,
    required String description,
    String? category,
  }) => _request(() async {
    final data = {
      'name': name.trim(),
      'description': description.trim(),
      'category': category?.trim().isEmpty == true ? null : category?.trim(),
    };
    final path = '${_company(companyId)}/competencies';
    if (id == null) {
      await _dio.post(path, data: data);
    } else {
      await _dio.patch('$path/${Uri.encodeComponent(id)}', data: data);
    }
  });
  Future<void> deactivate(String companyId, String id) => _request(() async {
    await _dio.post(
      '${_company(companyId)}/competencies/${Uri.encodeComponent(id)}/deactivate',
    );
  });
  Future<List<CompetencyAssessment>> assessments(
    String companyId, {
    String? userId,
  }) => _request(() async {
    final response = await _dio.get<List<dynamic>>(
      '${_company(companyId)}/competency-assessments',
      queryParameters: {if (userId != null) 'userId': userId},
    );
    return response.data!
        .map(
          (item) => CompetencyAssessment.fromMap(
            Map<String, dynamic>.from(item as Map),
          ),
        )
        .toList();
  });
  Future<CompetencyAssessment> startOrResume(
    String companyId,
    String userId,
  ) => _request(() async {
    final response = await _dio.post<Map<String, dynamic>>(
      '${_company(companyId)}/users/${Uri.encodeComponent(userId)}/competency-assessments/current',
    );
    return CompetencyAssessment.fromMap(response.data!);
  });
  Future<AdminCompetencyAssessment> assessment(
    String companyId,
    String id, {
    bool result = false,
  }) => _request(() async {
    final response = await _dio.get<Map<String, dynamic>>(
      '${_assessment(companyId, id)}${result ? '/result' : ''}',
    );
    return AdminCompetencyAssessment.fromMap(response.data!);
  });
  Future<List<AdminCompetencyAssessment>> history(
    String companyId,
    String userId,
  ) => _request(() async {
    final response = await _dio.get<List<dynamic>>(
      '${_company(companyId)}/users/${Uri.encodeComponent(userId)}/competency-assessments/history',
    );
    return response.data!
        .map(
          (item) => AdminCompetencyAssessment.fromMap(
            Map<String, dynamic>.from(item as Map),
          ),
        )
        .toList();
  });
  Future<CompetencyItem> saveItem(
    String companyId,
    String assessmentId,
    String competencyId, {
    required EvidenceStatus evidenceStatus,
    required int? level,
    String? observation,
  }) async {
    if (evidenceStatus == EvidenceStatus.notObserved
        ? level != null
        : level == null || level < 1 || level > 5) {
      throw ArgumentError('Combinação de evidência e nível inválida');
    }
    return _request(() async {
      final response = await _dio.put<Map<String, dynamic>>(
        '${_assessment(companyId, assessmentId)}/items/${Uri.encodeComponent(competencyId)}',
        data: {
          'evidenceStatus': evidenceStatus.apiValue,
          'level': level,
          'observation': observation,
        },
      );
      return CompetencyItem.fromMap(response.data!);
    });
  }

  Future<void> removeItem(
    String companyId,
    String assessmentId,
    String competencyId,
  ) => _request(() async {
    await _dio.delete(
      '${_assessment(companyId, assessmentId)}/items/${Uri.encodeComponent(competencyId)}',
    );
  });
  Future<void> complete(String companyId, String assessmentId) =>
      _request(() async {
        await _dio.post('${_assessment(companyId, assessmentId)}/complete');
      });
  Future<T> _request<T>(Future<T> Function() operation) async {
    try {
      return await operation();
    } on DioException catch (error) {
      throw Exception(
        dioErrorMessage(
          error,
          fallback:
              'Não foi possível atualizar as competências. Tente novamente.',
          codeMessages: const {
            'COMPETENCIES_ITEMS_REQUIRED':
                'Inclua ao menos uma competência antes de finalizar.',
            'COMPETENCIES_ASSESSMENT_COMPLETED':
                'Esta avaliação já foi concluída. Consulte o histórico.',
            'COMPETENCIES_DUPLICATE_ACTIVE_NAME':
                'Já existe uma competência ativa com este nome.',
            'COMPETENCIES_INACTIVE':
                'Esta competência está inativa. Atualize o catálogo.',
            'COMPETENCIES_ASSESSMENT_NOT_FOUND':
                'Avaliação não encontrada nesta empresa.',
            'COMPETENCIES_INVALID_ITEM':
                'Selecione não observado ou um nível de 1 a 5.',
          },
        ),
      );
    }
  }
}
