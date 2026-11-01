import 'package:consultoria_app/features/behavioral/presentation/pages/behavioral_assessments_page.dart';
import 'package:consultoria_app/features/behavioral/presentation/pages/behavioral_result_page.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'support/behavioral_admin_test_api.dart';

void main() {
  for (final width in [320.0, 390.0, 768.0, 1280.0]) {
    testWidgets('consulta e quatro barras sem overflow em $width px', (
      tester,
    ) async {
      tester.view.devicePixelRatio = 1;
      tester.view.physicalSize = Size(width, 1000);
      addTearDown(tester.view.resetDevicePixelRatio);
      addTearDown(tester.view.resetPhysicalSize);
      final api = BehavioralAdminTestApi();
      await pumpBehavioralAdmin(
        tester,
        api,
        const BehavioralAssessmentsPage(companyId: 'company-1'),
      );
      expect(find.text('Ver resultado'), findsOneWidget);
      expect(tester.takeException(), isNull);
      await pumpBehavioralAdmin(
        tester,
        api,
        const BehavioralResultPage(
          companyId: 'company-1',
          assessmentId: 'assessment-1',
        ),
      );
      expect(find.byType(BarChart), findsOneWidget);
      for (final label in [
        'Executor: 85/100',
        'Comunicador: 60/100',
        'Planejador: 40/100',
        'Analítico: 25/100',
      ]) {
        expect(find.text(label), findsOneWidget);
      }
      await tester.scrollUntilVisible(find.textContaining('01/10/2026'), 160);
      expect(tester.takeException(), isNull);
    });
  }
}
