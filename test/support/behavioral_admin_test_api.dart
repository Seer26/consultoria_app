import 'package:consultoria_app/core/di/providers.dart';
import 'package:consultoria_app/features/auth/domain/entities/user.dart';
import 'package:consultoria_app/features/auth/domain/repositories/auth_repository.dart';
import 'package:consultoria_app/features/auth/presentation/providers/auth_providers.dart';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

class BehavioralAdminTestApi {
  BehavioralAdminTestApi({this.predominant = 'EXECUTOR'}) {
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (request, handler) {
          requests.add(request);
          if (fail) {
            handler.reject(
              DioException(
                requestOptions: request,
                type: DioExceptionType.connectionError,
              ),
            );
            return;
          }
          final path = request.path;
          final Object data;
          if (path.endsWith('/result')) {
            data = {
              'assessment': assessment(),
              'user': {'id': 'user-1', 'name': 'Ana Silva', 'role': 'EMPLOYEE'},
              'result': {
                'executorScore': 85,
                'comunicadorScore': 60,
                'planejadorScore': 40,
                'analiticoScore': 25,
                'predominantDimension': predominant,
              },
              'questions': [],
              'answers': [],
            };
          } else if (path.endsWith('/history')) {
            data = [
              assessment(),
              assessment(id: 'assessment-old', date: '2026-10-01T12:30:00Z'),
            ];
          } else if (path.endsWith('/assessments')) {
            data = empty
                ? []
                : [
                    assessment(),
                    assessment(id: 'in-progress', status: 'IN_PROGRESS'),
                  ];
          } else {
            throw StateError('Unexpected request: $path');
          }
          handler.resolve(Response(requestOptions: request, data: data));
        },
      ),
    );
  }
  final dio = Dio();
  final requests = <RequestOptions>[];
  final String? predominant;
  bool fail = false;
  bool empty = false;
  Map<String, Object?> assessment({
    String id = 'assessment-1',
    String status = 'COMPLETED',
    String date = '2026-11-01T12:30:00Z',
  }) => {
    'id': id,
    'companyId': 'company-1',
    'userId': 'user-1',
    'userName': 'Ana Silva',
    'userRole': 'EMPLOYEE',
    'status': status,
    'questionnaireVersion': 1,
    'answeredCount': status == 'COMPLETED' ? 20 : 3,
    'totalQuestions': 20,
    'startedAt': date,
    'createdAt': date,
    'completedAt': status == 'COMPLETED' ? date : null,
  };
}

class _Repository implements AuthRepository {
  _Repository(String role)
    : user = User(
        id: 'actor',
        name: 'Consultoria',
        email: 'a@test.com',
        role: role,
      );
  final User user;
  @override
  Future<User?> loadSession() async => user;
  @override
  Future<User> login({required String email, required String password}) async =>
      user;
  @override
  Future<void> logout() async {}
  @override
  Future<void> requestPasswordReset({required String email}) async {}
  @override
  Future<void> resetPassword({
    required String token,
    required String newPassword,
  }) async {}
}

Future<void> pumpBehavioralAdmin(
  WidgetTester tester,
  BehavioralAdminTestApi api,
  Widget page, {
  String role = 'ADMIN',
}) async {
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        dioProvider.overrideWithValue(api.dio),
        authRepositoryProvider.overrideWithValue(_Repository(role)),
      ],
      child: MaterialApp(home: page),
    ),
  );
  await tester.pumpAndSettle();
}
