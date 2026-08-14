import 'package:consultoria_app/features/action_plan/domain/entities/action_plan_task.dart';
import 'package:consultoria_app/features/action_plan/presentation/action_plan_labels.dart';
import 'package:consultoria_app/features/dashboard/presentation/widgets/owner_onboarding_checklist.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

void main() {
  test(
    'status, prioridade e origem usam apresentação central em português',
    () {
      expect(actionPlanStatusLabel('TODO'), 'Pendente');
      expect(
        actionPlanStatusLabel(ActionPlanTaskStatus.inProgress),
        'Em andamento',
      );
      expect(actionPlanStatusLabel('DONE'), 'Concluída');
      expect(actionPlanPriorityLabel('CRITICAL'), 'Crítica');
      expect(actionPlanSourceLabel('AI'), 'Inteligência artificial');
    },
  );

  void useSurface(WidgetTester tester, double width) {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = Size(width, 1000);
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(tester.view.resetPhysicalSize);
  }

  Map<String, dynamic> onboarding({
    required int completedCount,
    required Map<String, bool> items,
  }) {
    return {
      'completedCount': completedCount,
      'totalCount': 7,
      'progress': (completedCount / 7 * 100).round(),
      'isComplete': completedCount == 7,
      'items': items,
    };
  }

  final initial = onboarding(
    completedCount: 0,
    items: const {
      'companyProfile': false,
      'team': false,
      'professionalProfiles': false,
      'firstResearch': false,
      'firstResult': false,
      'firstActionPlan': false,
      'strategyDefined': false,
    },
  );

  for (final width in [320.0, 390.0, 768.0, 1280.0]) {
    testWidgets('checklist inicial se adapta a ${width.toInt()} px', (
      tester,
    ) async {
      useSurface(tester, width);
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SingleChildScrollView(
              child: OwnerOnboardingChecklist(data: initial),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(
        find.byKey(const ValueKey('owner-onboarding-checklist')),
        findsOneWidget,
      );
      expect(find.text('0 de 7 etapas concluídas'), findsOneWidget);
      expect(find.text('Completar dados'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  }

  testWidgets('progresso parcial oferece ação de navegação', (tester) async {
    useSurface(tester, 390);
    final router = GoRouter(
      initialLocation: '/',
      routes: [
        GoRoute(
          path: '/',
          builder: (context, state) => Scaffold(
            body: SingleChildScrollView(
              child: OwnerOnboardingChecklist(
                data: onboarding(
                  completedCount: 3,
                  items: const {
                    'companyProfile': true,
                    'team': false,
                    'professionalProfiles': false,
                    'firstResearch': true,
                    'firstResult': true,
                    'firstActionPlan': false,
                  },
                ),
              ),
            ),
          ),
        ),
        GoRoute(
          path: '/team',
          builder: (context, state) =>
              const Scaffold(body: Text('Destino equipe')),
        ),
      ],
    );

    await tester.pumpWidget(MaterialApp.router(routerConfig: router));
    await tester.pumpAndSettle();
    expect(find.text('3 de 7 etapas concluídas'), findsOneWidget);

    await tester.tap(find.text('Gerenciar equipe'));
    await tester.pumpAndSettle();
    expect(find.text('Destino equipe'), findsOneWidget);
  });

  testWidgets('onboarding completo fica recolhido e discreto', (tester) async {
    useSurface(tester, 768);
    final complete = onboarding(
      completedCount: 7,
      items: const {
        'companyProfile': true,
        'team': true,
        'professionalProfiles': true,
        'firstResearch': true,
        'firstResult': true,
        'firstActionPlan': true,
        'strategyDefined': true,
      },
    );

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(body: OwnerOnboardingChecklist(data: complete)),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Configuração inicial concluída'), findsOneWidget);
    expect(find.text('7 de 7 etapas concluídas'), findsOneWidget);
    expect(find.text('Etapa concluída.'), findsNothing);
    expect(tester.takeException(), isNull);
  });
}
