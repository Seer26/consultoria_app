import 'package:consultoria_app/core/di/providers.dart';
import 'package:consultoria_app/features/auth/domain/entities/user.dart';
import 'package:consultoria_app/features/auth/domain/repositories/auth_repository.dart';
import 'package:consultoria_app/features/auth/presentation/providers/auth_providers.dart';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

class CompetenciesAdminTestApi {
  CompetenciesAdminTestApi() {
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (request, handler) {
          requests.add(request);
          if (fail || (failSave && request.method == 'PUT')) {
            handler.reject(
              DioException(
                requestOptions: request,
                type: DioExceptionType.connectionError,
              ),
            );
            return;
          }
          final path = request.path;
          Object data;
          if (path == '/companies') {
            data = [
              {'id': 'company-1', 'name': 'Empresa Alfa'},
            ];
          } else if (path.endsWith('/users')) {
            data = [
              {
                'id': 'user-1',
                'companyId': 'company-1',
                'name': 'Ana Silva',
                'email': 'ana@test.com',
                'role': 'EMPLOYEE',
                'status': 'ACTIVE',
              },
            ];
          } else if (path.endsWith('/competencies') &&
              request.method == 'GET') {
            data = catalog
                .where(
                  (item) => item['status'] == request.queryParameters['status'],
                )
                .toList();
          } else if (path.contains('/competencies') &&
              request.method != 'GET') {
            if (request.method == 'POST' && path.endsWith('/competencies')) {
              catalog.add({
                ...catalog.last,
                ...(request.data as Map),
                'id': 'new',
              });
            } else if (path.endsWith('/deactivate')) {
              catalog.last['status'] = 'INACTIVE';
            } else {
              catalog.last.addAll(
                Map<String, Object?>.from(request.data as Map),
              );
            }
            data = catalog.last;
          } else if (path.endsWith('/current')) {
            data = assessment;
          } else if (path.endsWith('/history')) {
            data = [dto];
          } else if (path.endsWith('/competency-assessments')) {
            data = [assessment];
          } else if (path.contains('/items/')) {
            final id = path.split('/').last;
            final current = items
                .where((item) => item['competencyId'] == id)
                .firstOrNull;
            final expected = request.method == 'DELETE'
                ? request.queryParameters['expectedVersion']
                : (request.data as Map)['expectedVersion'];
            final currentVersion = current == null
                ? null
                : '${current['id']}:${current['updatedAt']}';
            if (expected != currentVersion ||
                (request.method == 'DELETE' && current == null)) {
              handler.reject(
                DioException(
                  requestOptions: request,
                  response: Response(
                    requestOptions: request,
                    statusCode: 409,
                    data: {'error': 'COMPETENCIES_ITEM_CONFLICT'},
                  ),
                  type: DioExceptionType.badResponse,
                ),
              );
              return;
            }
            if (request.method == 'DELETE') {
              items.removeWhere((item) => item['competencyId'] == id);
              data = {'assessmentId': 'assessment-1', 'competencyId': id};
            } else {
              items.removeWhere((item) => item['competencyId'] == id);
              final competency = catalog.firstWhere((item) => item['id'] == id);
              final item = <String, Object?>{
                'id': current?['id'] ?? 'item-$id-${++revision}',
                'updatedAt': '${++revision}',
                'assessmentId': 'assessment-1',
                'competencyId': id,
                'competencyNameSnapshot': competency['name'],
                'competencyDescriptionSnapshot': competency['description'],
                'competencyCategorySnapshot': competency['category'],
                'competencyScopeSnapshot': competency['scope'],
                ...(request.data as Map<String, dynamic>),
              };
              items.add(item);
              data = item;
            }
          } else if (path.endsWith('/complete')) {
            completed = true;
            data = {
              'id': 'assessment-1',
              'status': 'COMPLETED',
              'completedAt': '2026-11-02T12:00:00Z',
            };
          } else if (path.endsWith('/assessment-1') ||
              path.endsWith('/result')) {
            data = dto;
          } else {
            throw StateError('Unexpected HTTP ${request.method} $path');
          }
          handler.resolve(Response(requestOptions: request, data: data));
        },
      ),
    );
  }
  final dio = Dio();
  final requests = <RequestOptions>[];
  int revision = 0;
  bool completed = false;
  bool fail = false;
  bool failSave = false;
  final catalog = <Map<String, Object?>>[
    {
      'id': 'system-1',
      'companyId': null,
      'name': 'Comunicação profissional',
      'description': 'Clareza e contexto.',
      'category': 'Comunicação',
      'scope': 'SYSTEM',
      'status': 'ACTIVE',
    },
    {
      'id': 'private-1',
      'companyId': 'company-1',
      'name': 'Processo privado',
      'description': 'Rotina da empresa.',
      'category': null,
      'scope': 'COMPANY',
      'status': 'ACTIVE',
    },
  ];
  final items = <Map<String, Object?>>[];
  Map<String, Object?> get assessment => {
    'id': 'assessment-1',
    'companyId': 'company-1',
    'subjectUserId': 'user-1',
    'subjectNameSnapshot': 'Ana Silva',
    'startedByUserId': 'admin-1',
    'startedByNameSnapshot': 'Consultoria',
    'completedByUserId': completed ? 'admin-2' : null,
    'completedByNameSnapshot': completed ? 'Outra consultora' : null,
    'status': completed ? 'COMPLETED' : 'IN_PROGRESS',
    'startedAt': '2026-11-01T12:00:00Z',
    'createdAt': '2026-11-01T12:00:00Z',
    'completedAt': completed ? '2026-11-02T12:00:00Z' : null,
  };
  Map<String, Object?> get dto => {
    'assessment': assessment,
    'items': items.toList(),
    'insufficientEvidence':
        items.isNotEmpty &&
        items.every((item) => item['evidenceStatus'] == 'NOT_OBSERVED'),
  };
}

class CompetenciesAuthRepository implements AuthRepository {
  CompetenciesAuthRepository(this.role);
  final String role;
  User get user => User(
    id: 'actor',
    name: 'Consultoria',
    email: 'admin@test.com',
    role: role,
  );
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

Future<void> pumpCompetencies(
  WidgetTester tester,
  CompetenciesAdminTestApi api,
  Widget page, {
  String role = 'ADMIN',
  List<Override> overrides = const [],
}) async {
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        dioProvider.overrideWithValue(api.dio),
        authRepositoryProvider.overrideWithValue(
          CompetenciesAuthRepository(role),
        ),
        ...overrides,
      ],
      child: MaterialApp(theme: ThemeData(useMaterial3: true), home: page),
    ),
  );
  await tester.pumpAndSettle();
}

Future<void> tapCompetency(WidgetTester tester, String key) async {
  final finder = find.byKey(Key(key));
  if (finder.evaluate().isEmpty) {
    await tester.scrollUntilVisible(
      finder,
      200,
      scrollable: find.byType(Scrollable).first,
    );
  }
  await tester.ensureVisible(finder);
  await tester.pumpAndSettle();
  await tester.tap(finder);
  await tester.pumpAndSettle();
}
