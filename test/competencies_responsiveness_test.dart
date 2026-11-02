import 'package:consultoria_app/features/competencies/presentation/pages/competency_assessment_editor_page.dart';
import 'package:consultoria_app/features/competencies/presentation/pages/competency_assessment_result_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'support/competencies_admin_test_api.dart';

void main() {
  for (final width in [320.0, 390.0, 768.0]) {
    testWidgets('editor e histórico sem overflow em $width px', (tester) async {
      tester.view.physicalSize = Size(width, 900);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
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
      await tapCompetency(tester, 'level-system-1-5');
      expect(tester.takeException(), isNull);
      await pumpCompetencies(
        tester,
        api,
        const CompetencyAssessmentResultPage(
          companyId: 'company-1',
          assessmentId: 'assessment-1',
        ),
      );
      await tester.scrollUntilVisible(find.text('Histórico da pessoa'), 150);
      expect(tester.takeException(), isNull);
    });
  }
}
