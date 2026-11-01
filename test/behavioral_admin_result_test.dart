import 'package:consultoria_app/core/auth/role_guard.dart';
import 'package:consultoria_app/features/behavioral/presentation/pages/behavioral_assessments_page.dart';
import 'package:consultoria_app/features/behavioral/presentation/pages/behavioral_result_page.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:flutter_test/flutter_test.dart';
import 'support/behavioral_admin_test_api.dart';

void main() {
  const listPage = BehavioralAssessmentsPage(companyId: 'company-1');
  const resultPage = BehavioralResultPage(
    companyId: 'company-1',
    assessmentId: 'assessment-1',
  );
  testWidgets(
    'ADMIN consulta pessoas, status, data e apenas resultados concluídos',
    (tester) async {
      final api = BehavioralAdminTestApi();
      await pumpBehavioralAdmin(tester, api, listPage);
      expect(find.text('Ana Silva'), findsNWidgets(2));
      expect(find.text('EMPLOYEE'), findsNWidgets(2));
      expect(find.text('Concluída'), findsOneWidget);
      expect(find.text('Em andamento'), findsOneWidget);
      expect(find.textContaining('01/11/2026'), findsNWidgets(2));
      expect(find.text('Ver resultado'), findsOneWidget);
      expect(
        api.requests.single.path,
        '/behavioral/companies/company-1/assessments',
      );
    },
  );
  testWidgets(
    'resultado usa os quatro scores do servidor e histórico da pessoa na empresa',
    (tester) async {
      final api = BehavioralAdminTestApi();
      await pumpBehavioralAdmin(tester, api, resultPage);
      expect(find.text('Ana Silva'), findsOneWidget);
      expect(find.textContaining('EMPLOYEE'), findsOneWidget);
      final chart = tester.widget<BarChart>(find.byType(BarChart));
      expect(chart.data.maxY, 100);
      expect(chart.data.barGroups.map((g) => g.barRods.single.toY), [
        85,
        60,
        40,
        25,
      ]);
      expect(find.text('Predominante: Executor'), findsOneWidget);
      await tester.scrollUntilVisible(find.text('Histórico da pessoa'), 200);
      expect(find.textContaining('01/10/2026'), findsOneWidget);
      expect(
        api.requests.map((r) => r.path),
        contains('/behavioral/companies/company-1/users/user-1/history'),
      );
      expect(find.textContaining('Ranking'), findsNothing);
    },
  );
  testWidgets('empate não inventa dimensão predominante', (tester) async {
    await pumpBehavioralAdmin(
      tester,
      BehavioralAdminTestApi(predominant: null),
      resultPage,
    );
    expect(find.byType(BarChart), findsOneWidget);
    expect(find.textContaining('Predominante:'), findsNothing);
  });
  for (final role in ['OWNER', 'EMPLOYEE']) {
    testWidgets('$role não consulta lista, resultado, histórico ou gráfico', (
      tester,
    ) async {
      final api = BehavioralAdminTestApi();
      for (final page in [listPage, resultPage]) {
        await pumpBehavioralAdmin(tester, api, page, role: role);
        expect(find.text('Acesso negado'), findsOneWidget);
        expect(find.byType(BarChart), findsNothing);
        expect(find.text('Ana Silva'), findsNothing);
        expect(api.requests, isEmpty);
      }
      expect(
        RoleGuard.canAccessRoute(role, '/behavioral/companies/company-1'),
        isFalse,
      );
      expect(
        RoleGuard.canAccessRoute(
          role,
          '/behavioral/companies/company-1/assessments/assessment-1',
        ),
        isFalse,
      );
    });
  }
  test('ADMIN tem acesso às rotas contextuais de consulta', () {
    expect(
      RoleGuard.canAccessRoute('ADMIN', '/behavioral/companies/company-1'),
      isTrue,
    );
    expect(
      RoleGuard.canAccessRoute(
        'ADMIN',
        '/behavioral/companies/company-1/assessments/assessment-1',
      ),
      isTrue,
    );
  });
  testWidgets('lista vazia e erro recuperável não exibem resultados', (
    tester,
  ) async {
    final api = BehavioralAdminTestApi()..fail = true;
    await pumpBehavioralAdmin(tester, api, listPage);
    expect(
      find.text('Não foi possível carregar as avaliações'),
      findsOneWidget,
    );
    api.fail = false;
    api.empty = true;
    await tester.tap(find.text('Tentar novamente'));
    await tester.pumpAndSettle();
    expect(find.text('Nenhuma avaliação nesta empresa'), findsOneWidget);
  });
}
