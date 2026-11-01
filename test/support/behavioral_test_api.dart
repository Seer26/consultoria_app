import 'package:consultoria_app/core/di/providers.dart';
import 'package:consultoria_app/features/behavioral/presentation/pages/behavioral_questionnaire_page.dart';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

/// In-memory HTTP boundary; widgets, providers, DTOs and service stay real.
class BehavioralTestApi {
  BehavioralTestApi({Map<String, int> answers = const {}})
    : answers = Map.of(answers) {
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (request, handler) async {
          requests.add(request);
          final data = await respond(request);
          handler.resolve(Response(requestOptions: request, data: data));
        },
      ),
    );
  }

  final dio = Dio();
  final Map<String, int> answers;
  final requests = <RequestOptions>[];
  bool failSave = false;
  bool failStart = false;
  Future<void>? saveGate;
  bool completed = false;

  Map<String, dynamic> get assessment => {
    'id': 'assessment-1',
    'companyId': 'company-1',
    'userId': 'user-1',
    'status': completed ? 'COMPLETED' : 'IN_PROGRESS',
    'questionnaireVersion': 1,
    'answeredCount': answers.length,
    'totalQuestions': 20,
    'startedAt': '2026-11-01T12:00:00Z',
    'completedAt': completed ? '2026-11-01T12:30:00Z' : null,
    'createdAt': '2026-11-01T12:00:00Z',
  };

  Future<dynamic> respond(RequestOptions request) async {
    if (request.path == '/behavioral/assessments/current' &&
        request.method == 'POST') {
      if (failStart) {
        throw StateError(
          'Unexpected start failure: use an HTTP error response',
        );
      }
      return assessment;
    }
    if (request.path == '/behavioral/assessments/assessment-1/questions' &&
        request.method == 'GET') {
      return {
        'assessment': assessment,
        'questions': List.generate(
          20,
          (i) => {
            'id': 'q-${i + 1}',
            'position': i + 1,
            'text': i == 0
                ? 'Quando surge uma pendência e ainda faltam alguns detalhes, procuro identificar o que já pode ser feito para avançar.'
                : 'Afirmação ${i + 1}',
          },
        ),
        'answers': answers.entries
            .map((e) => {'questionId': e.key, 'value': e.value})
            .toList(),
      };
    }
    if (request.method == 'PUT' &&
        request.path.startsWith(
          '/behavioral/assessments/assessment-1/answers/q-',
        )) {
      await saveGate;
      if (failSave) {
        throw StateError('Unexpected save failure: use an HTTP error response');
      }
      final questionId = request.path.split('/').last;
      answers[questionId] = (request.data as Map)['value'] as int;
      return {
        'assessmentId': 'assessment-1',
        'questionId': questionId,
        'value': answers[questionId],
      };
    }
    if (request.path == '/behavioral/assessments/assessment-1/complete' &&
        request.method == 'POST') {
      if (answers.length != 20) {
        throw StateError('Incomplete answers submitted');
      }
      completed = true;
      return {
        'id': 'assessment-1',
        'status': 'COMPLETED',
        'completedAt': '2026-11-01T12:30:00Z',
      };
    }
    throw StateError(
      'Unexpected HTTP request: ${request.method} ${request.path}',
    );
  }
}

Future<void> pumpBehavioral(
  WidgetTester tester,
  BehavioralTestApi api, {
  Key? pageKey,
}) async {
  await tester.pumpWidget(
    ProviderScope(
      overrides: [dioProvider.overrideWithValue(api.dio)],
      child: MaterialApp(home: BehavioralQuestionnairePage(key: pageKey)),
    ),
  );
  await tester.pumpAndSettle();
}

Future<void> startBehavioral(WidgetTester tester) async {
  await tester.tap(find.byKey(const Key('behavioral-start')));
  await tester.pumpAndSettle();
}

Future<void> tapBehavioral(WidgetTester tester, String key) async {
  final target = find.byKey(Key(key));
  await tester.ensureVisible(target);
  await tester.pumpAndSettle();
  await tester.tap(target);
  await tester.pumpAndSettle();
}
