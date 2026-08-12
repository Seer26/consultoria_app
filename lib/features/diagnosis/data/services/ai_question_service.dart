import 'package:dio/dio.dart';

import '../../../../core/http/dio_client.dart';
import '../../../../core/http/plan_limit_error_mapper.dart';
import '../../../../core/http/token_storage.dart';

class AdaptiveQuestion {
  const AdaptiveQuestion({
    required this.question,
    required this.pillar,
    required this.reason,
    required this.shouldContinue,
  });
  final String question;
  final String pillar;
  final String reason;
  final bool shouldContinue;
}

class AiQuestionService {
  AiQuestionService({Dio? dio, TokenStorage? tokenStorage})
    : _dio =
          dio ?? DioClient(tokenStorage: tokenStorage ?? TokenStorage()).client;

  final Dio _dio;

  Future<AdaptiveQuestion> getNextQuestion(String submissionId) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/ai/next-question',
        data: {'submissionId': submissionId},
      );
      final data = response.data ?? const {};
      final question = data['question']?.toString().trim();
      final pillar = data['pillar']?.toString().trim();
      if (question == null ||
          question.isEmpty ||
          pillar == null ||
          pillar.isEmpty) {
        throw Exception('Resposta invalida da IA.');
      }
      return AdaptiveQuestion(
        question: question,
        pillar: pillar,
        reason: data['reason']?.toString() ?? '',
        shouldContinue: data['shouldContinue'] != false,
      );
    } on DioException catch (error) {
      final planLimit = planLimitMessageFromResponseData(error.response?.data);
      throw Exception(
        planLimit ??
            'A resposta foi salva, mas a IA nao conseguiu gerar a proxima pergunta. Tente novamente ou finalize a pesquisa.',
      );
    }
  }
}
