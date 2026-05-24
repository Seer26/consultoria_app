import 'package:dio/dio.dart';

import '../../../../core/http/dio_client.dart';
import '../../../../core/http/token_storage.dart';

class AiQuestionService {
  AiQuestionService({
    Dio? dio,
    TokenStorage? tokenStorage,
  }) : _dio = dio ??
            DioClient(
              tokenStorage: tokenStorage ?? TokenStorage(),
            ).client;

  final Dio _dio;

  Future<String> getNextQuestion(String answer) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/ai/next-question',
        data: {
          'answer': answer,
        },
      );

      final nextQuestion = response.data?['nextQuestion']?.toString();

      if (nextQuestion == null || nextQuestion.isEmpty) {
        throw Exception('Resposta invalida da IA.');
      }

      return nextQuestion;
    } on DioException catch (error) {
      final message = error.response?.data?.toString() ?? error.message ?? 'Falha na requisicao';
      throw Exception('Nao foi possivel gerar a proxima pergunta: $message');
    } catch (error) {
      throw Exception('Nao foi possivel gerar a proxima pergunta: $error');
    }
  }
}
