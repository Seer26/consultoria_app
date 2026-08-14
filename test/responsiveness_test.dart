import 'package:consultoria_app/features/auth/presentation/pages/login_page.dart';
import 'package:consultoria_app/features/billing/data/services/current_plan_service.dart';
import 'package:consultoria_app/features/billing/presentation/pages/current_plan_page.dart';
import 'package:consultoria_app/features/team/presentation/pages/team_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  void useSurface(WidgetTester tester, Size size) {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = size;
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(tester.view.resetPhysicalSize);
  }

  for (final width in [320.0, 390.0, 768.0, 1280.0]) {
    testWidgets('login se adapta a largura ${width.toInt()} px', (
      tester,
    ) async {
      useSurface(tester, Size(width, 900));
      SharedPreferences.setMockInitialValues({});

      await tester.pumpWidget(
        const ProviderScope(child: MaterialApp(home: LoginPage())),
      );
      await tester.pump();

      expect(find.text('Entrar na plataforma'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  }

  testWidgets('equipe e dialogo permanecem utilizaveis em 320 px', (
    tester,
  ) async {
    useSurface(tester, const Size(320, 760));
    await tester.pumpWidget(
      ProviderScope(
        overrides: [teamProvider.overrideWith((ref) async => const [])],
        child: const MaterialApp(home: TeamPage()),
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text('Novo colaborador'));
    await tester.pumpAndSettle();

    expect(find.text('Novo colaborador'), findsWidgets);
    expect(find.text('Cancelar'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('plano atual se adapta a 320 px', (tester) async {
    useSurface(tester, const Size(320, 760));
    const snapshot = CurrentPlanSnapshot(
      companyId: 'company-test',
      planName: 'Starter',
      planSlug: 'starter',
      planDescription: 'Plano para inicio da operacao.',
      subscriptionStatus: 'ACTIVE',
      currentPeriodStart: null,
      currentPeriodEnd: null,
      usageItems: [
        PlanUsageItem(
          feature: 'USER_SEATS',
          label: 'Usuarios ativos',
          used: 1,
          limit: 3,
          remaining: 2,
          period: null,
        ),
      ],
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [currentPlanProvider.overrideWith((ref) async => snapshot)],
        child: const MaterialApp(home: CurrentPlanPage()),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Starter'), findsOneWidget);
    expect(find.text('Ativo'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
