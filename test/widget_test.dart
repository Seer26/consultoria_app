import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:consultoria_app/core/auth/role_guard.dart';
import 'package:consultoria_app/core/constants/app_constants.dart';
import 'package:consultoria_app/core/http/token_storage.dart';
import 'package:consultoria_app/core/widgets/sidebar.dart';
import 'package:consultoria_app/features/auth/data/datasources/auth_remote_data_source.dart';
import 'package:consultoria_app/features/auth/data/repositories/auth_repository_impl.dart';
import 'package:consultoria_app/features/auth/presentation/pages/forgot_password_page.dart';
import 'package:consultoria_app/features/auth/presentation/pages/login_page.dart';
import 'package:consultoria_app/features/auth/presentation/pages/reset_password_page.dart';
import 'package:consultoria_app/features/action_plan/domain/entities/action_plan_task.dart';
import 'package:consultoria_app/features/action_plan/presentation/pages/action_plan_page.dart';
import 'package:consultoria_app/features/dashboard/presentation/widgets/employee_dashboard.dart';
import 'package:consultoria_app/features/diagnosis/domain/entities/research_submission.dart';
import 'package:consultoria_app/features/diagnosis/presentation/pages/research_details_page.dart';
import 'package:consultoria_app/features/reports/domain/entities/report.dart';
import 'package:consultoria_app/features/reports/presentation/pages/reports_page.dart';

class _MemorySecureTokenStore implements SecureTokenStore {
  final Map<String, String> values = {};
  bool fail = false;

  @override
  Future<void> delete(String key) async {
    if (fail) throw StateError('secure storage unavailable');
    values.remove(key);
  }

  @override
  Future<String?> read(String key) async {
    if (fail) throw StateError('secure storage unavailable');
    return values[key];
  }

  @override
  Future<void> write(String key, String value) async {
    if (fail) throw StateError('secure storage unavailable');
    values[key] = value;
  }
}

void useLargeTestSurface(WidgetTester tester) {
  tester.view.devicePixelRatio = 1;
  tester.view.physicalSize = const Size(1400, 3000);
  addTearDown(tester.view.resetDevicePixelRatio);
  addTearDown(tester.view.resetPhysicalSize);
}

void main() {
  group('Demo segura - navegacao por perfil', () {
    test('OWNER acessa apenas os modulos reais da demonstracao', () {
      final items = RoleGuard.sidebarItemsForRole(RoleGuard.owner);

      expect(items, contains(SidebarItem.dashboard));
      expect(items, contains(SidebarItem.diagnostico));
      expect(items, contains(SidebarItem.tarefas));
      expect(items, contains(SidebarItem.relatorios));
      expect(items, contains(SidebarItem.plano));
      expect(items, contains(SidebarItem.configuracoesEmpresa));

      expect(items, isNot(contains(SidebarItem.empresas)));
      expect(items, isNot(contains(SidebarItem.usuarios)));
      expect(RoleGuard.canAccessRoute(RoleGuard.owner, '/companies'), isFalse);
      expect(RoleGuard.canAccessRoute(RoleGuard.owner, '/users'), isFalse);
    });

    test(
      'ADMIN acessa administracao e nao usa resposta de pesquisa como rota principal',
      () {
        final items = RoleGuard.sidebarItemsForRole(RoleGuard.admin);

        expect(items, contains(SidebarItem.dashboard));
        expect(items, contains(SidebarItem.empresas));
        expect(items, contains(SidebarItem.relatorios));
        expect(items, contains(SidebarItem.usuarios));

        expect(items, isNot(contains(SidebarItem.diagnostico)));
        expect(items, isNot(contains(SidebarItem.tarefas)));
        expect(RoleGuard.canAccessRoute(RoleGuard.admin, '/admin'), isTrue);
        expect(RoleGuard.canAccessRoute(RoleGuard.admin, '/companies'), isTrue);
        expect(RoleGuard.canAccessRoute(RoleGuard.admin, '/research'), isFalse);
        expect(RoleGuard.canAccessRoute(RoleGuard.admin, '/tasks'), isFalse);
      },
    );

    test(
      'EMPLOYEE acessa pesquisa e tarefas, mas nao administracao, plano ou configuracoes',
      () {
        final items = RoleGuard.sidebarItemsForRole(RoleGuard.employee);

        expect(items, contains(SidebarItem.dashboard));
        expect(items, contains(SidebarItem.diagnostico));
        expect(items, contains(SidebarItem.tarefas));
        expect(RoleGuard.defaultRouteForRole(RoleGuard.employee), '/employee');
        expect(
          RoleGuard.canAccessRoute(RoleGuard.employee, '/employee'),
          isTrue,
        );
        expect(
          RoleGuard.canAccessRoute(RoleGuard.employee, '/research'),
          isTrue,
        );
        expect(RoleGuard.canAccessRoute(RoleGuard.employee, '/tasks'), isTrue);

        expect(items, isNot(contains(SidebarItem.configuracoesEmpresa)));
        expect(items, isNot(contains(SidebarItem.empresas)));
        expect(items, isNot(contains(SidebarItem.plano)));
        expect(
          RoleGuard.canAccessRoute(RoleGuard.employee, '/company-settings'),
          isFalse,
        );
        expect(
          RoleGuard.canAccessRoute(RoleGuard.employee, '/companies'),
          isFalse,
        );
        expect(RoleGuard.canAccessRoute(RoleGuard.employee, '/plan'), isFalse);
      },
    );

    test('modulos fora da demo nao entram no menu e usam rota amigavel', () {
      for (final role in [
        RoleGuard.admin,
        RoleGuard.owner,
        RoleGuard.employee,
      ]) {
        final items = RoleGuard.sidebarItemsForRole(role);
        expect(items.map((item) => item.label), isNot(contains('Clientes')));
        expect(items.map((item) => item.label), isNot(contains('Formularios')));
        expect(items.map((item) => item.label), isNot(contains('Chat')));

        expect(RoleGuard.canAccessRoute(role, '/clients'), isTrue);
        expect(RoleGuard.canAccessRoute(role, '/forms'), isTrue);
        expect(RoleGuard.canAccessRoute(role, '/chat'), isTrue);
        expect(RoleGuard.canAccessRoute(role, '/unavailable'), isTrue);
      }
    });

    test('credenciais de demonstracao dependem de flag explicita', () {
      expect(AppConstants.showDemoCredentials, isFalse);
    });
  });

  group('Sprint 3.7 - apresentação comercial', () {
    testWidgets(
      'resultado detalhado mostra diagnóstico e respostas agrupadas',
      (tester) async {
        useLargeTestSurface(tester);
        final details = ResearchSubmissionDetails(
          id: 'research-1',
          companyId: 'company-1',
          companyName: 'Empresa Horizonte Consultoria Demo',
          userId: 'owner-1',
          userName: 'Marina Horizonte',
          userEmail: 'owner@example.test',
          respondentRole: 'Diretora executiva',
          department: 'Direção',
          status: ResearchSubmissionStatus.completed,
          diagnosisStatus: DiagnosisReviewStatus.published,
          createdAt: DateTime(2026, 7, 1),
          updatedAt: DateTime(2026, 7, 2),
          completedAt: DateTime(2026, 7, 2),
          overallScore: 65.3,
          summary: 'Boa tração comercial e oportunidade financeira.',
          criticalPoints: const ['Fluxo de caixa sem rotina semanal.'],
          opportunities: const ['Boa conversão comercial.'],
          recommendations: const ['Implantar ritual financeiro.'],
          nextSteps: const ['Executar o plano por trinta dias.'],
          pillarScores: const [
            ResearchPillarScore(
              pillar: 'Financeiro',
              score: 44,
              answersCount: 1,
              maturity: 'attention',
            ),
          ],
          answers: [
            ResearchAnswer(
              id: 'answer-1',
              question: 'Como acompanha o caixa?',
              answer: 'Há planilha mensal.',
              pillar: 'Financeiro',
              score: 44,
              createdAt: DateTime(2026, 7, 1),
            ),
          ],
        );

        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(body: ResearchDetailsContent(details: details)),
          ),
        );

        expect(
          find.byKey(const ValueKey('research-details-content')),
          findsOneWidget,
        );
        expect(find.text('Empresa Horizonte Consultoria Demo'), findsOneWidget);
        expect(
          find.text('Índice de Diagnóstico Organizacional'),
          findsOneWidget,
        );
        expect(find.text('65.3/100'), findsOneWidget);
        expect(find.text('Pontos críticos'), findsOneWidget);
        expect(find.text('Como acompanha o caixa?'), findsOneWidget);
        expect(find.text('Há planilha mensal.'), findsOneWidget);
      },
    );

    testWidgets('relatório executivo apresenta pilares, tarefas e atraso', (
      tester,
    ) async {
      useLargeTestSurface(tester);
      final report = ExecutiveReport(
        companyId: 'company-1',
        companyName: 'Empresa Horizonte Consultoria Demo',
        companyStatus: 'ACTIVE',
        submissionId: 'research-1',
        status: 'COMPLETED',
        respondentName: 'Marina Horizonte',
        respondentRole: 'Diretora executiva',
        department: 'Direção',
        overallScore: 65.3,
        maturityLevel: 'INTERMEDIATE',
        maturityLabel: 'Intermediário',
        summary: 'Resumo executivo comercial.',
        actionPlanGenerated: true,
        tasksTotal: 1,
        tasksTodo: 1,
        tasksInProgress: 0,
        tasksDone: 0,
        tasksCanceled: 0,
        tasksOverdue: 1,
        pillarScores: const [
          ReportPillarScore(
            pillar: 'Financeiro',
            score: 44,
            maturity: 'Atenção',
          ),
        ],
        criticalPoints: const ['Fluxo de caixa.'],
        opportunities: const ['Carteira recorrente.'],
        recommendations: const ['Ritual semanal.'],
        nextSteps: const ['Executar plano.'],
        tasks: [
          ReportTask(
            id: 'task-1',
            title: 'Implantar fluxo de caixa',
            description: 'Definir responsável.',
            priority: 'CRITICAL',
            status: 'TODO',
            source: 'RESEARCH_RECOMMENDATION',
            dueDate: DateTime.now().subtract(const Duration(days: 2)),
          ),
        ],
      );

      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            home: Scaffold(body: ExecutiveReportView(report: report)),
          ),
        ),
      );

      expect(find.text('Resumo Executivo'), findsOneWidget);
      expect(find.text('Score por Pilar'), findsOneWidget);
      expect(find.byType(LinearProgressIndicator), findsOneWidget);
      expect(find.text('Implantar fluxo de caixa'), findsOneWidget);
      expect(find.text('ATRASADA'), findsOneWidget);
      expect(find.text('Exportar PDF'), findsOneWidget);
    });

    testWidgets('edição de tarefa preserva campos completos e responsável', (
      tester,
    ) async {
      useLargeTestSurface(tester);
      TaskFormResult? result;
      final task = ActionPlanTask(
        id: 'task-1',
        companyId: 'company-1',
        title: 'Tarefa original',
        description: 'Descrição original',
        pillar: 'Financeiro',
        priority: ActionPlanTaskPriority.high,
        status: ActionPlanTaskStatus.inProgress,
        source: ActionPlanTaskSource.manual,
        createdAt: DateTime(2026, 7, 1),
        updatedAt: DateTime(2026, 7, 1),
        responsibleUserId: 'employee-1',
      );
      const assignee = ActionPlanAssignee(
        id: 'employee-1',
        name: 'Rafael Operações',
        email: 'rafael@example.test',
        role: 'EMPLOYEE',
        jobRole: 'Analista de operações',
        department: 'Operações',
        companyId: 'company-1',
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Builder(
            builder: (context) => Scaffold(
              body: ElevatedButton(
                onPressed: () async {
                  result = await showDialog<TaskFormResult>(
                    context: context,
                    builder: (_) => TaskFormDialog(
                      companyId: 'company-1',
                      assignees: const [assignee],
                      task: task,
                    ),
                  );
                },
                child: const Text('Editar'),
              ),
            ),
          ),
        ),
      );
      await tester.tap(find.text('Editar'));
      await tester.pumpAndSettle();

      expect(find.byKey(const ValueKey('task-form-dialog')), findsOneWidget);
      expect(find.textContaining('Rafael Operações'), findsWidgets);
      await tester.enterText(
        find.byKey(const ValueKey('task-title-field')),
        'Tarefa revisada',
      );
      await tester.tap(find.byKey(const ValueKey('save-task')));
      await tester.pumpAndSettle();

      expect(result?.title, 'Tarefa revisada');
      expect(result?.pillar, 'Financeiro');
      expect(result?.priority, ActionPlanTaskPriority.high);
      expect(result?.status, ActionPlanTaskStatus.inProgress);
      expect(result?.responsibleUserId, 'employee-1');
    });

    testWidgets('dashboard do colaborador destaca atrasos e vencimentos', (
      tester,
    ) async {
      useLargeTestSurface(tester);
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: EmployeeDashboard(
              data: {
                'metrics': {
                  'myResearchTotal': 1,
                  'assignedTasksTotal': 3,
                  'openTasks': 2,
                  'inProgressTasks': 1,
                  'doneTasks': 1,
                  'overdueTasks': 1,
                  'criticalOverdueTasks': 1,
                  'dueSoonTasks': 1,
                },
                'overdueTasks': const [],
                'dueSoonTasks': const [],
                'upcomingTasks': const [],
                'recentTasks': const [],
                'recentResearch': const [],
              },
            ),
          ),
        ),
      );

      expect(find.text('Atrasadas'), findsOneWidget);
      expect(find.text('Críticas atrasadas'), findsOneWidget);
      expect(find.text('Vencem em 7 dias'), findsOneWidget);
      expect(find.text('Minhas tarefas atrasadas'), findsOneWidget);
      expect(find.text('Próximas do vencimento'), findsOneWidget);
    });
  });

  group('Recuperacao de senha', () {
    testWidgets('link de recuperacao aparece no login', (tester) async {
      SharedPreferences.setMockInitialValues({});
      await tester.pumpWidget(
        const ProviderScope(child: MaterialApp(home: LoginPage())),
      );
      await tester.pump();

      expect(find.byKey(const Key('forgot-password-link')), findsOneWidget);
      expect(find.text('Esqueci minha senha'), findsOneWidget);
    });

    testWidgets('valida email sem fazer chamada HTTP', (tester) async {
      var calls = 0;
      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            home: ForgotPasswordPage(
              requestReset: (_) async {
                calls += 1;
              },
            ),
          ),
        ),
      );

      await tester.tap(find.byKey(const Key('forgot-submit-button')));
      await tester.pump();
      expect(find.text('Informe um email valido'), findsOneWidget);
      expect(calls, 0);
    });

    testWidgets('mostra loading e mensagem generica de sucesso', (
      tester,
    ) async {
      final completer = Completer<void>();
      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            home: ForgotPasswordPage(requestReset: (_) => completer.future),
          ),
        ),
      );
      await tester.enterText(
        find.byKey(const Key('forgot-email-field')),
        'usuario@empresa.com',
      );
      await tester.tap(find.byKey(const Key('forgot-submit-button')));
      await tester.pump();

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
      final button = tester.widget<FilledButton>(
        find.byKey(const Key('forgot-submit-button')),
      );
      expect(button.onPressed, isNull);

      completer.complete();
      await tester.pump();
      expect(find.byKey(const Key('forgot-success-message')), findsOneWidget);
      final message = tester.widget<Text>(
        find.byKey(const Key('forgot-success-message')),
      );
      expect(message.data, contains('Se existir uma conta associada'));
    });

    testWidgets('mostra erro amigavel sem revelar conta', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            home: ForgotPasswordPage(
              requestReset: (_) async => throw Exception('erro tecnico'),
            ),
          ),
        ),
      );
      await tester.enterText(
        find.byKey(const Key('forgot-email-field')),
        'usuario@empresa.com',
      );
      await tester.tap(find.byKey(const Key('forgot-submit-button')));
      await tester.pump();

      expect(find.byKey(const Key('forgot-error-message')), findsOneWidget);
      expect(find.textContaining('erro tecnico'), findsNothing);
    });

    testWidgets('redefinicao valida politica e confirmacao', (tester) async {
      var calls = 0;
      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            home: ResetPasswordPage(
              token: 'token-em-memoria',
              resetPassword: (_, _) async => calls += 1,
            ),
          ),
        ),
      );

      await tester.enterText(
        find.byKey(const Key('reset-password-field')),
        '12345678',
      );
      await tester.enterText(
        find.byKey(const Key('reset-confirmation-field')),
        '12345678',
      );
      await tester.tap(find.byKey(const Key('reset-submit-button')));
      await tester.pump();
      expect(
        find.text('A senha nao pode conter somente numeros'),
        findsOneWidget,
      );
      expect(calls, 0);

      await tester.enterText(
        find.byKey(const Key('reset-password-field')),
        'NovaSenha123',
      );
      await tester.enterText(
        find.byKey(const Key('reset-confirmation-field')),
        'OutraSenha123',
      );
      await tester.tap(find.byKey(const Key('reset-submit-button')));
      await tester.pump();
      expect(find.textContaining('nao coincidem'), findsOneWidget);
      expect(calls, 0);
    });

    testWidgets('redefinicao bloqueia envio duplicado e conclui com sucesso', (
      tester,
    ) async {
      final completer = Completer<void>();
      var calls = 0;
      var success = false;
      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            home: ResetPasswordPage(
              token: 'token-somente-em-memoria',
              resetPassword: (token, password) {
                expect(token, 'token-somente-em-memoria');
                expect(password, 'NovaSenha123');
                calls += 1;
                return completer.future;
              },
              onSuccess: () => success = true,
            ),
          ),
        ),
      );
      await tester.enterText(
        find.byKey(const Key('reset-password-field')),
        'NovaSenha123',
      );
      await tester.enterText(
        find.byKey(const Key('reset-confirmation-field')),
        'NovaSenha123',
      );
      await tester.tap(find.byKey(const Key('reset-submit-button')));
      await tester.pump();
      expect(find.byType(CircularProgressIndicator), findsOneWidget);
      expect(
        tester
            .widget<FilledButton>(find.byKey(const Key('reset-submit-button')))
            .onPressed,
        isNull,
      );
      expect(calls, 1);

      completer.complete();
      await tester.pump();
      expect(find.byKey(const Key('reset-success-message')), findsOneWidget);
      expect(success, isTrue);
    });

    testWidgets('redefinicao mostra erro retornado pela API', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            home: ResetPasswordPage(
              token: 'token-invalido',
              resetPassword: (_, _) async =>
                  throw Exception('Link expirado. Solicite um novo link.'),
            ),
          ),
        ),
      );
      await tester.enterText(
        find.byKey(const Key('reset-password-field')),
        'NovaSenha123',
      );
      await tester.enterText(
        find.byKey(const Key('reset-confirmation-field')),
        'NovaSenha123',
      );
      await tester.tap(find.byKey(const Key('reset-submit-button')));
      await tester.pump();
      expect(find.byKey(const Key('reset-error-message')), findsOneWidget);
      expect(find.textContaining('Link expirado'), findsOneWidget);
    });
  });

  group('Armazenamento seguro da sessao', () {
    test('migra token legado e o remove do SharedPreferences', () async {
      SharedPreferences.setMockInitialValues({'access_token': 'jwt-legado'});
      final secureStore = _MemorySecureTokenStore();
      final storage = TokenStorage(secureStore: secureStore);

      expect(await storage.readAccessToken(), 'jwt-legado');
      expect(secureStore.values['access_token'], 'jwt-legado');
      final prefs = await SharedPreferences.getInstance();
      expect(prefs.getString('access_token'), isNull);
    });

    test('logout/clear limpa token seguro e legado', () async {
      SharedPreferences.setMockInitialValues({'access_token': 'jwt-legado'});
      final secureStore = _MemorySecureTokenStore()
        ..values['access_token'] = 'jwt-seguro';
      final storage = TokenStorage(secureStore: secureStore);

      await storage.clear();

      expect(secureStore.values['access_token'], isNull);
      final prefs = await SharedPreferences.getInstance();
      expect(prefs.getString('access_token'), isNull);
    });

    test('sessao sem token permanece desautenticada', () async {
      SharedPreferences.setMockInitialValues({});
      final repository = AuthRepositoryImpl(
        remoteDataSource: AuthRemoteDataSource(),
        tokenStorage: TokenStorage(secureStore: _MemorySecureTokenStore()),
      );

      expect(await repository.loadSession(), isNull);
    });
  });
}
