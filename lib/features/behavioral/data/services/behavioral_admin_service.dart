import 'package:dio/dio.dart';
import '../../../../core/errors/api_error_presenter.dart';
import '../../domain/entities/behavioral_admin_assessment.dart';

class BehavioralAdminService {
  BehavioralAdminService(this._dio);
  final Dio _dio;
  String _company(String id) =>
      '/behavioral/companies/${Uri.encodeComponent(id)}';

  Future<List<BehavioralAdminAssessment>> assessments(String companyId) =>
      _list('${_company(companyId)}/assessments');
  Future<List<BehavioralAdminAssessment>> history(
    String companyId,
    String userId,
  ) => _list(
    '${_company(companyId)}/users/${Uri.encodeComponent(userId)}/history',
  );
  Future<List<BehavioralAdminAssessment>> _list(String path) =>
      _request(() async {
        final response = await _dio.get<List<dynamic>>(path);
        return response.data!
            .map(
              (item) => BehavioralAdminAssessment.fromMap(
                Map<String, dynamic>.from(item as Map),
              ),
            )
            .toList();
      });
  Future<BehavioralAdminResult> result(
    String companyId,
    String assessmentId,
  ) => _request(() async {
    final response = await _dio.get<Map<String, dynamic>>(
      '${_company(companyId)}/assessments/${Uri.encodeComponent(assessmentId)}/result',
    );
    return BehavioralAdminResult.fromMap(response.data!);
  });
  Future<T> _request<T>(Future<T> Function() operation) async {
    try {
      return await operation();
    } on DioException catch (error) {
      throw Exception(
        dioErrorMessage(
          error,
          fallback: 'Não foi possível consultar a avaliação. Tente novamente.',
          codeMessages: const {
            'BEHAVIORAL_ADMIN_REQUIRED': 'Acesso exclusivo da consultoria.',
            'BEHAVIORAL_RESULT_NOT_FOUND':
                'O resultado ainda não está disponível.',
            'BEHAVIORAL_ASSESSMENT_NOT_FOUND':
                'A avaliação não foi encontrada.',
          },
        ),
      );
    }
  }
}
