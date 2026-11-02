import 'package:consultoria_app/features/competencies/data/services/competencies_admin_service.dart';
import 'package:consultoria_app/features/competencies/domain/entities/competency_assessment.dart';
import 'package:consultoria_app/features/competencies/presentation/pages/competency_assessment_editor_page.dart';
import 'package:consultoria_app/features/competencies/presentation/pages/competency_assessment_result_page.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'support/competencies_admin_test_api.dart';

void main() {
  testWidgets(
    'editor salva ausência como null, níveis 1–5, observação e remoção',
    (tester) async {
      final api = CompetenciesAdminTestApi();
      await pumpCompetencies(
        tester,
        api,
        const CompetencyAssessmentEditorPage(
          companyId: 'company-1',
          assessmentId: 'assessment-1',
        ),
      );
      await tapCompetency(tester, 'add-system-1');
      await tester.enterText(
        find.byKey(const Key('observation-system-1')),
        'Ainda sem evidência',
      );
      await tapCompetency(tester, 'assessment-save');
      final first = api.requests.lastWhere((r) => r.method == 'PUT');
      expect(first.data, {
        'evidenceStatus': 'NOT_OBSERVED',
        'level': null,
        'observation': 'Ainda sem evidência',
      });
      for (var level = 1; level <= 5; level++) {
        await tapCompetency(tester, 'level-system-1-$level');
        await tapCompetency(tester, 'assessment-save');
        expect(
          api.requests.lastWhere((r) => r.method == 'PUT').data['level'],
          level,
        );
        expect(
          api.requests
              .lastWhere((r) => r.method == 'PUT')
              .data['evidenceStatus'],
          'RATED',
        );
      }
      await tapCompetency(tester, 'level-system-1-0');
      await tapCompetency(tester, 'assessment-save');
      expect(
        api.requests.lastWhere((r) => r.method == 'PUT').data['level'],
        isNull,
      );
      expect(
        api.requests.lastWhere((r) => r.method == 'PUT').data['evidenceStatus'],
        'NOT_OBSERVED',
      );
      await tapCompetency(tester, 'remove-system-1');
      expect(api.items, isEmpty);
      expect(api.requests.last.method, 'DELETE');
      expect(
        tester
            .widget<FilledButton>(find.byKey(const Key('assessment-complete')))
            .onPressed,
        isNull,
      );
    },
  );
  test(
    'serviço rejeita combinações inválidas antes de HTTP e usa contexto empresarial',
    () async {
      final api = CompetenciesAdminTestApi();
      final service = CompetenciesAdminService(api.dio);
      for (final level in [0, 6, null]) {
        await expectLater(
          service.saveItem(
            'company-1',
            'assessment-1',
            'system-1',
            evidenceStatus: EvidenceStatus.rated,
            level: level,
          ),
          throwsArgumentError,
        );
      }
      await expectLater(
        service.saveItem(
          'company-1',
          'assessment-1',
          'system-1',
          evidenceStatus: EvidenceStatus.notObserved,
          level: 2,
        ),
        throwsArgumentError,
      );
      expect(api.requests, isEmpty);
      await service.startOrResume('company-1', 'user-1');
      expect(
        api.requests.single.path,
        '/companies/company-1/users/user-1/competency-assessments/current',
      );
    },
  );
  testWidgets(
    'finalizar salva itens e mostra resultado insuficiente com histórico sem métrica ou gráfico',
    (tester) async {
      final api = CompetenciesAdminTestApi();
      await pumpCompetencies(
        tester,
        api,
        const CompetencyAssessmentEditorPage(
          companyId: 'company-1',
          assessmentId: 'assessment-1',
        ),
      );
      await tapCompetency(tester, 'add-system-1');
      await tapCompetency(tester, 'assessment-complete');
      expect(api.completed, isTrue);
      expect(
        api.requests.indexWhere((r) => r.method == 'PUT'),
        lessThan(api.requests.indexWhere((r) => r.path.endsWith('/complete'))),
      );
      expect(find.text('Evidência insuficiente'), findsOneWidget);
      expect(find.byType(BarChart), findsNothing);
      expect(find.byType(RadarChart), findsNothing);
      expect(find.textContaining('Média'), findsNothing);
      expect(api.requests.any((r) => r.path.endsWith('/history')), isTrue);
    },
  );
  testWidgets('falha ao salvar preserva rascunho e impede finalização', (
    tester,
  ) async {
    final api = CompetenciesAdminTestApi();
    await pumpCompetencies(
      tester,
      api,
      const CompetencyAssessmentEditorPage(
        companyId: 'company-1',
        assessmentId: 'assessment-1',
      ),
    );
    await tapCompetency(tester, 'add-system-1');
    api.failSave = true;
    await tapCompetency(tester, 'assessment-complete');
    expect(api.completed, isFalse);
    expect(api.requests.any((r) => r.path.endsWith('/complete')), isFalse);
    expect(find.text('Avaliar competências'), findsOneWidget);
    api.failSave = false;
    await tapCompetency(tester, 'assessment-save');
    expect(find.text('Rascunho salvo.'), findsOneWidget);
  });
  testWidgets('resultado lê snapshots, avaliadores, observação e datas', (
    tester,
  ) async {
    final api = CompetenciesAdminTestApi()..completed = true;
    api.items.add({
      'id': 'i',
      'assessmentId': 'assessment-1',
      'competencyId': 'system-1',
      'competencyNameSnapshot': 'Nome histórico',
      'competencyDescriptionSnapshot': 'Descrição histórica',
      'competencyScopeSnapshot': 'SYSTEM',
      'evidenceStatus': 'RATED',
      'level': 4,
      'observation': 'Evidência registrada',
    });
    await pumpCompetencies(
      tester,
      api,
      const CompetencyAssessmentResultPage(
        companyId: 'company-1',
        assessmentId: 'assessment-1',
      ),
    );
    expect(find.text('Nome histórico'), findsOneWidget);
    expect(find.textContaining('4 —'), findsOneWidget);
    expect(find.text('Evidência registrada'), findsOneWidget);
    expect(find.textContaining('Outra consultora'), findsOneWidget);
    expect(find.text('Evidência insuficiente'), findsNothing);
  });
}
