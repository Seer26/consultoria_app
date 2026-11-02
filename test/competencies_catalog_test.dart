import 'package:consultoria_app/core/auth/role_guard.dart';
import 'package:consultoria_app/core/widgets/sidebar.dart';
import 'package:consultoria_app/core/router/app_router.dart';
import 'package:consultoria_app/features/auth/presentation/state/auth_state.dart';
import 'package:consultoria_app/features/legal/presentation/state/legal_acceptance_state.dart';
import 'package:consultoria_app/features/competencies/presentation/pages/competency_catalog_page.dart';
import 'package:consultoria_app/features/competencies/presentation/pages/competency_assessments_page.dart';
import 'package:consultoria_app/features/competencies/presentation/pages/competency_assessment_editor_page.dart';
import 'package:consultoria_app/features/competencies/presentation/pages/competency_assessment_result_page.dart';
import 'package:consultoria_app/features/competencies/presentation/providers/competencies_admin_providers.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'support/competencies_admin_test_api.dart';

void main() {
  testWidgets('ADMIN vê origem e gerencia somente catálogo privado', (
    tester,
  ) async {
    final api = CompetenciesAdminTestApi();
    await pumpCompetencies(
      tester,
      api,
      const CompetencyCatalogPage(companyId: 'company-1'),
    );
    expect(find.text('Comunicação profissional'), findsOneWidget);
    expect(find.text('Padrão do sistema'), findsOneWidget);
    expect(find.byKey(const Key('edit-system-1')), findsNothing);
    await tapCompetency(tester, 'catalog-create');
    await tester.enterText(
      find.byKey(const Key('competency-name')),
      'Nova competência técnica',
    );
    await tester.enterText(
      find.byKey(const Key('competency-description')),
      'Descrição técnica',
    );
    await tester.tap(find.text('Salvar'));
    await tester.pumpAndSettle();
    expect(
      api.requests.any(
        (r) =>
            r.method == 'POST' && r.path == '/companies/company-1/competencies',
      ),
      isTrue,
    );
    expect(find.text('Nova competência técnica'), findsOneWidget);
    await tapCompetency(tester, 'edit-new');
    await tester.enterText(
      find.byKey(const Key('competency-name')),
      'Competência editada',
    );
    await tester.tap(find.text('Salvar'));
    await tester.pumpAndSettle();
    expect(find.text('Competência editada'), findsOneWidget);
    await tapCompetency(tester, 'deactivate-new');
    expect(
      api.requests.lastWhere((r) => r.method == 'POST').path,
      '/companies/company-1/competencies/new/deactivate',
    );
  });
  testWidgets(
    'ADMIN seleciona empresa e pessoa sem iniciar rascunho implicitamente',
    (tester) async {
      final api = CompetenciesAdminTestApi();
      await pumpCompetencies(tester, api, const CompetencyAssessmentsPage());
      await tester.tap(find.byKey(const Key('competency-company')));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Empresa Alfa').last);
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('competency-person')), findsOneWidget);
      expect(find.text('Catálogo'), findsOneWidget);
      expect(api.requests.where((r) => r.method == 'POST'), isEmpty);
      await tester.tap(find.byKey(const Key('competency-person')));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Ana Silva').last);
      await tester.pumpAndSettle();
      await tapCompetency(tester, 'competency-start');
      expect(find.text('Avaliar competências'), findsOneWidget);
      expect(api.requests.where((r) => r.path.endsWith('/current')).length, 1);
    },
  );
  for (final role in ['OWNER', 'EMPLOYEE']) {
    testWidgets(
      '$role não instancia serviço nem chama HTTP em qualquer tela técnica',
      (tester) async {
        final api = CompetenciesAdminTestApi();
        for (final page in <Widget>[
          const CompetencyCatalogPage(companyId: 'company-1'),
          const CompetencyAssessmentsPage(),
          const CompetencyAssessmentEditorPage(
            companyId: 'company-1',
            assessmentId: 'assessment-1',
          ),
          const CompetencyAssessmentResultPage(
            companyId: 'company-1',
            assessmentId: 'assessment-1',
          ),
        ]) {
          await pumpCompetencies(
            tester,
            api,
            page,
            role: role,
            overrides: [
              competenciesAdminServiceProvider.overrideWith(
                (ref) => throw StateError('Technical service instantiated'),
              ),
            ],
          );
          expect(find.text('Acesso negado'), findsOneWidget);
          expect(tester.takeException(), isNull);
          expect(api.requests, isEmpty);
        }
        expect(
          RoleGuard.sidebarItemsForRole(role),
          isNot(contains(SidebarItem.competencias)),
        );
        for (final path in [
          '/competencies',
          '/competencies/companies/company-1/catalog',
          '/competencies/companies/company-1/assessments/assessment-1/result',
        ]) {
          expect(RoleGuard.canAccessRoute(role, path), isFalse);
          expect(RoleGuard.canAccessRoute('ADMIN', path), isTrue);
          expect(
            resolveAppRedirect(
              authState: AuthState(
                status: AuthStatus.authenticated,
                user: CompetenciesAuthRepository(role).user,
              ),
              legalState: const LegalAcceptanceState(
                status: LegalAcceptanceStatus.clear,
              ),
              location: path,
            ),
            RoleGuard.defaultRouteForRole(role),
          );
        }
      },
    );
  }
}
