import 'package:dio/dio.dart';

import '../../../../core/http/dio_client.dart';
import '../../../../core/http/plan_limit_error_mapper.dart';
import '../../../../core/http/token_storage.dart';

class AiQuestionService {
  AiQuestionService({Dio? dio, TokenStorage? tokenStorage})
    : _dio =
          dio ?? DioClient(tokenStorage: tokenStorage ?? TokenStorage()).client;

  final Dio _dio;

  Future<String> getNextQuestion(String answer) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/ai/next-question',
        data: {'answer': answer},
      );

      final nextQuestion = response.data?['nextQuestion']?.toString();

      if (nextQuestion == null || nextQuestion.isEmpty) {
        throw Exception('Resposta invalida da IA.');
      }

      return nextQuestion;
    } on DioException catch (error) {
      final data = error.response?.data;
      final planLimitMessage = planLimitMessageFromResponseData(data);
      if (planLimitMessage != null) {
        throw Exception(
          'A resposta foi salva, mas sua empresa atingiu o limite de IA do plano atual. Entre em contato com o administrador para liberar um plano maior.',
        );
      }

      final code = data is Map ? data['error']?.toString() : null;
      switch (code) {
        case 'AI_QUOTA_UNAVAILABLE':
          throw Exception(
            'A resposta foi salva, mas os creditos da IA estao indisponiveis. Voce pode finalizar a pesquisa agora.',
          );
        case 'AI_API_KEY_NOT_CONFIGURED':
        case 'AI_INVALID_API_KEY':
          throw Exception(
            'A resposta foi salva, mas a IA nao esta configurada. Avise o administrador ou finalize a pesquisa.',
          );
        default:
          throw Exception(
            'A resposta foi salva, mas a IA nao conseguiu gerar a proxima pergunta. Tente novamente ou finalize a pesquisa.',
          );
      }
    } catch (error) {
      throw Exception('Nao foi possivel gerar a proxima pergunta: $error');
    }
  }
}
