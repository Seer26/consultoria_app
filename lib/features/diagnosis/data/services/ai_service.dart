import 'dart:convert';

import 'package:http/http.dart' as http;

class AiDiagnosisResult {
  const AiDiagnosisResult({
    required this.problems,
    required this.questions,
    required this.actions,
  });

  final List<String> problems;
  final List<String> questions;
  final List<String> actions;

  factory AiDiagnosisResult.fromJson(Map<String, dynamic> json) {
    return AiDiagnosisResult(
      problems: _readStringList(json['problems']),
      questions: _readStringList(json['questions']),
      actions: _readStringList(json['actions']),
    );
  }

  static List<String> _readStringList(dynamic value) {
    if (value is! List) {
      return const [];
    }

    return value
        .map((item) {
          if (item is String) {
            return item;
          }

          if (item is Map<String, dynamic>) {
            final question = item['question'];
            final title = item['title'];
            final description = item['description'];

            if (question is String && question.isNotEmpty) {
              return question;
            }

            if (title is String && description is String) {
              return '$title | $description';
            }

            if (title is String && title.isNotEmpty) {
              return title;
            }
          }

          return item?.toString() ?? '';
        })
        .where((item) => item.trim().isNotEmpty)
        .cast<String>()
        .toList();
  }
}

class AIService {
  AIService({
    http.Client? client,
    String? baseUrl,
  })  : _client = client ?? http.Client(),
        _baseUrl = baseUrl ?? 'http://127.0.0.1:3000/ai-diagnosis';

  final http.Client _client;
  final String _baseUrl;

  Future<AiDiagnosisResult> sendAnswers(List<Map<String, dynamic>> answers) async {
    try {
      final response = await _client.post(
        Uri.parse(_baseUrl),
        headers: const {
          'Content-Type': 'application/json',
        },
        body: jsonEncode({
          'answers': answers,
        }),
      );

      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw Exception(
          'Falha ao consultar IA: ${response.statusCode} ${response.body}',
        );
      }

      final decoded = jsonDecode(response.body);

      if (decoded is! Map<String, dynamic>) {
        throw Exception('Resposta invalida da API de IA.');
      }

      return AiDiagnosisResult.fromJson(decoded);
    } catch (error) {
      throw Exception('Nao foi possivel consultar a IA: $error');
    }
  }
}
