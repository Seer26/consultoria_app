import 'package:dio/dio.dart';
import '../../../../core/errors/api_error_presenter.dart';
import '../../domain/entities/behavioral_assessment.dart';

class BehavioralService {
  BehavioralService(this._dio);
  final Dio _dio;

  Future<BehavioralAssessment> startOrResume() => _request(() async {
    final response = await _dio.post<Map<String, dynamic>>(
      '/behavioral/assessments/current',
    );
    return BehavioralAssessment.fromMap(response.data!);
  });

  Future<BehavioralQuestionnaire> questions(String assessmentId) =>
      _request(() async {
        final response = await _dio.get<Map<String, dynamic>>(
          '${_path(assessmentId)}/questions',
        );
        return BehavioralQuestionnaire.fromMap(response.data!);
      });

  Future<void> saveAnswer(String assessmentId, String questionId, int value) =>
      _request(() async {
        await _dio.put<Map<String, dynamic>>(
          '${_path(assessmentId)}/answers/${Uri.encodeComponent(questionId)}',
          data: {'value': value},
        );
      });

  Future<BehavioralCompletion> complete(String assessmentId) =>
      _request(() async {
        final response = await _dio.post<Map<String, dynamic>>(
          '${_path(assessmentId)}/complete',
        );
        return BehavioralCompletion.fromMap(response.data!);
      });

  String _path(String id) =>
      '/behavioral/assessments/${Uri.encodeComponent(id)}';

  Future<T> _request<T>(Future<T> Function() operation) async {
    try {
      return await operation();
    } on DioException catch (error) {
      throw Exception(
        dioErrorMessage(
          error,
          fallback: 'Não foi possível atualizar a avaliação. Tente novamente.',
          codeMessages: const {
            'BEHAVIORAL_ASSESSMENT_COMPLETED':
                'Esta avaliação já foi concluída. Volte ao início para iniciar outra avaliação.',
            'BEHAVIORAL_INCOMPLETE_ANSWERS':
                'Responda todas as afirmações antes de concluir.',
            'BEHAVIORAL_INVALID_ANSWER': 'Selecione uma resposta de 1 a 5.',
            'BEHAVIORAL_ASSESSMENT_NOT_FOUND':
                'A avaliação não foi encontrada.',
            'BEHAVIORAL_CATALOG_NOT_FOUND':
                'O questionário ainda não está disponível. Tente novamente mais tarde.',
          },
        ),
      );
    }
  }
}
