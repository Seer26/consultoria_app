import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/behavioral_test_api.dart';

void main() {
  for (final width in [320.0, 390.0, 768.0, 1280.0]) {
    testWidgets(
      'entrada, pergunta longa e confirmação sem overflow em ${width.toInt()} px',
      (tester) async {
        tester.view.devicePixelRatio = 1;
        tester.view.physicalSize = Size(width, 900);
        addTearDown(tester.view.resetDevicePixelRatio);
        addTearDown(tester.view.resetPhysicalSize);
        final api = BehavioralTestApi();
        await pumpBehavioral(tester, api);
        expect(tester.takeException(), isNull);
        await startBehavioral(tester);
        for (var value = 1; value <= 5; value++) {
          await tapBehavioral(tester, 'likert-$value');
          expect(tester.takeException(), isNull);
        }
        await tapBehavioral(tester, 'behavioral-next');
        expect(find.text('2/20'), findsOneWidget);
        expect(find.text('Afirmação 2').hitTestable(), findsOneWidget);
        expect(tester.takeException(), isNull);

        await pumpBehavioral(
          tester,
          BehavioralTestApi(answers: {for (var i = 1; i <= 19; i++) 'q-$i': 3}),
          pageKey: const Key('final-question'),
        );
        await startBehavioral(tester);
        await tapBehavioral(tester, 'likert-3');
        await tapBehavioral(tester, 'behavioral-next');
        expect(find.text('Concluir avaliação?'), findsOneWidget);
        expect(tester.takeException(), isNull);
        await tester.tap(find.byKey(const Key('behavioral-confirm-complete')));
        await tester.pumpAndSettle();
        expect(find.text('Avaliação concluída com sucesso.'), findsOneWidget);
        expect(tester.takeException(), isNull);
      },
    );
  }
}
