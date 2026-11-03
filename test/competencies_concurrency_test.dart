import 'package:consultoria_app/features/competencies/presentation/pages/competency_assessment_editor_page.dart';
import 'package:consultoria_app/features/competencies/presentation/pages/competency_assessments_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'support/competencies_admin_test_api.dart';

Map<String, Object?> item(String id) => {
  'id': 'item-$id',
  'updatedAt': 'original',
  'assessmentId': 'assessment-1',
  'competencyId': id,
  'competencyNameSnapshot': id,
  'competencyDescriptionSnapshot': 'Snapshot',
  'competencyScopeSnapshot': 'SYSTEM',
  'evidenceStatus': 'RATED',
  'level': 3,
  'observation': null,
};
const editor = CompetencyAssessmentEditorPage(
  companyId: 'company-1',
  assessmentId: 'assessment-1',
);

void main() {
  testWidgets(
    'salvar envia apenas dirty; versão adotada evita reenvio dos já salvos',
    (tester) async {
      final api = CompetenciesAdminTestApi()
        ..items.addAll([item('system-1'), item('private-1')]);
      await pumpCompetencies(tester, api, editor);
      api.items[0] = {...api.items[0], 'level': 5, 'updatedAt': 'remote'};
      await tapCompetency(tester, 'level-private-1-4');
      await tapCompetency(tester, 'assessment-save');
      expect(
        api.requests
            .where((r) => r.method == 'PUT')
            .map((r) => r.path.split('/').last),
        ['private-1'],
      );
      expect(
        api.items.firstWhere((i) => i['competencyId'] == 'system-1')['level'],
        5,
      );
      await tapCompetency(tester, 'assessment-save');
      expect(api.requests.where((r) => r.method == 'PUT').length, 1);
      await tapCompetency(tester, 'level-private-1-5');
      await tapCompetency(tester, 'assessment-save');
      expect(
        api.items.firstWhere((i) => i['competencyId'] == 'private-1')['level'],
        5,
      );
    },
  );
  for (final remote in ['update', 'remove', 'add', 'delete-stale']) {
    testWidgets(
      'conflito $remote bloqueia escrita até recarregar explicitamente',
      (tester) async {
        final api = CompetenciesAdminTestApi();
        if (remote != 'add') api.items.add(item('system-1'));
        await pumpCompetencies(tester, api, editor);
        if (remote == 'remove') {
          api.items.clear();
        } else if (remote == 'add') {
          api.items.add({
            ...item('system-1'),
            'level': 5,
            'updatedAt': 'remote',
          });
        } else {
          api.items[0] = {...api.items[0], 'level': 5, 'updatedAt': 'remote'};
        }
        if (remote == 'add') {
          await tapCompetency(tester, 'add-system-1');
        } else if (remote == 'delete-stale') {
          await tapCompetency(tester, 'remove-system-1');
        } else {
          await tapCompetency(tester, 'level-system-1-1');
          await tapCompetency(tester, 'assessment-complete');
        }
        expect(api.completed, isFalse);
        expect(
          api.items.isEmpty ? null : api.items.single['level'],
          remote == 'remove' ? null : 5,
        );
        expect(find.textContaining('Outro administrador'), findsOneWidget);
        expect(
          tester
              .widget<OutlinedButton>(find.byKey(const Key('assessment-save')))
              .onPressed,
          isNull,
        );
        await tapCompetency(tester, 'assessment-reload');
        expect(find.textContaining('Outro administrador'), findsNothing);
        if (remote == 'remove') {
          expect(find.byKey(const Key('add-system-1')), findsOneWidget);
        } else {
          expect(
            tester
                .widget<ChoiceChip>(find.byKey(const Key('level-system-1-5')))
                .selected,
            isTrue,
          );
        }
      },
    );
  }
  testWidgets('histórico recarrega após finalizar e voltar do editor', (
    tester,
  ) async {
    final api = CompetenciesAdminTestApi();
    await pumpCompetencies(
      tester,
      api,
      const CompetencyAssessmentsPage(companyId: 'company-1', userId: 'user-1'),
    );
    await tester.tap(find.text('Histórico da pessoa'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Retomar avaliação'));
    await tester.pumpAndSettle();
    await tapCompetency(tester, 'add-system-1');
    await tapCompetency(tester, 'assessment-complete');
    await tester.tap(find.text('Voltar'));
    await tester.pumpAndSettle();
    expect(find.text('Ver resultado'), findsOneWidget);
    expect(find.text('Retomar avaliação'), findsNothing);
    expect(
      api.requests.where((r) => r.path.endsWith('/history')).length,
      greaterThanOrEqualTo(3),
    );
  });
}
