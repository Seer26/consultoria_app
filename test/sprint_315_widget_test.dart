import 'package:consultoria_app/core/auth/role_guard.dart';
import 'package:consultoria_app/core/widgets/sidebar.dart';
import 'package:consultoria_app/features/diagnosis/domain/entities/research_submission.dart';
import 'package:consultoria_app/features/diagnosis/presentation/pages/research_details_page.dart';
import 'package:consultoria_app/features/diagnosis/presentation/pages/research_start_page.dart';
import 'package:consultoria_app/features/team/data/services/team_service.dart';
import 'package:consultoria_app/features/team/presentation/pages/team_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  void useLargeSurface(WidgetTester tester) {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(1400, 2600);
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(tester.view.resetPhysicalSize);
  }

  test('menu Equipe e exclusivo do OWNER', () {
    expect(RoleGuard.sidebarItemsForRole(RoleGuard.owner), contains(SidebarItem.equipe));
    expect(RoleGuard.canAccessRoute(RoleGuard.owner, '/team'), isTrue);
    expect(RoleGuard.sidebarItemsForRole(RoleGuard.employee), isNot(contains(SidebarItem.equipe)));
    expect(RoleGuard.sidebarItemsForRole(RoleGuard.admin), isNot(contains(SidebarItem.equipe)));
  });

  testWidgets('Equipe exibe perfil, status, criacao e edicao', (tester) async {
    useLargeSurface(tester);
    await tester.pumpWidget(ProviderScope(
      overrides: [teamProvider.overrideWith((ref) async => const [
        TeamMember(id: '1', name: 'Ana', email: 'ana@example.invalid', status: 'ACTIVE', department: 'Financeiro', jobFunction: 'Analista'),
        TeamMember(id: '2', name: 'Bruno', email: 'bruno@example.invalid', status: 'INACTIVE', department: 'Comercial', jobFunction: 'Vendedor'),
      ])],
      child: const MaterialApp(home: TeamPage()),
    ));
    await tester.pumpAndSettle();
    expect(find.textContaining('Analista | Financeiro'), findsOneWidget);
    expect(find.byType(Switch), findsNWidgets(2));
    expect(tester.widget<Switch>(find.byType(Switch).first).value, isTrue);
    expect(tester.widget<Switch>(find.byType(Switch).last).value, isFalse);
    await tester.tap(find.text('Novo colaborador'));
    await tester.pumpAndSettle();
    expect(find.text('Departamento'), findsOneWidget);
    expect(find.text('Funcao profissional'), findsOneWidget);
    expect(find.text('Senha inicial'), findsOneWidget);
    await tester.tap(find.text('Cancelar'));
    await tester.pumpAndSettle();
    await tester.tap(find.byIcon(Icons.edit_outlined).first);
    await tester.pumpAndSettle();
    expect(find.text('Editar colaborador'), findsOneWidget);
    expect(find.text('Nova senha (opcional)'), findsOneWidget);
  });

  testWidgets('EMPLOYEE ve perfil somente leitura e nenhum seletor', (tester) async {
    useLargeSurface(tester);
    await tester.pumpWidget(MaterialApp(home: ResearchStartPage(
      lockAssignedProfile: true,
      assignedRole: 'Analista Financeiro',
      assignedSector: 'Financeiro',
      onStart: ({required String role, required String sector, String? companyId}) async {},
    )));
    await tester.pump();
    expect(find.byType(DropdownButtonFormField<String>), findsNothing);
    expect(find.text('Analista Financeiro'), findsOneWidget);
    expect(find.text('Financeiro'), findsOneWidget);
  });

  testWidgets('perfil incompleto bloqueia inicio com mensagem amigavel', (tester) async {
    useLargeSurface(tester);
    await tester.pumpWidget(MaterialApp(home: ResearchStartPage(
      lockAssignedProfile: true,
      onStart: ({required String role, required String sector, String? companyId}) async {},
    )));
    await tester.pump();
    expect(find.byType(DropdownButtonFormField<String>), findsNothing);
    expect(find.text('Perfil profissional incompleto'), findsOneWidget);
    final start = find.ancestor(
      of: find.text('Iniciar Pesquisa Empresarial'),
      matching: find.byWidgetPredicate((widget) => widget is FilledButton),
    );
    expect(start, findsOneWidget);
    expect(tester.widget<FilledButton>(start).onPressed, isNull);
  });

  testWidgets('OWNER recebe aviso de respostas individuais protegidas', (tester) async {
    useLargeSurface(tester);
    final now = DateTime(2026, 1, 1);
    final details = ResearchSubmissionDetails(
      id: 's', companyId: 'c', companyName: 'Empresa', userId: 'employee',
      userName: 'Funcionario', userEmail: 'employee@example.invalid',
      respondentRole: 'Analista', department: 'Financeiro',
      status: ResearchSubmissionStatus.completed, createdAt: now, updatedAt: now,
      overallScore: 70, summary: 'Resumo consolidado',
    );
    await tester.pumpWidget(MaterialApp(home: Scaffold(body: ResearchDetailsContent(
      details: details, rawAnswersRestricted: true,
    ))));
    await tester.pump();
    expect(find.text('Respostas individuais protegidas'), findsOneWidget);
    expect(find.textContaining('resultados consolidados'), findsOneWidget);
  });
}
