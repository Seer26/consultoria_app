import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/behavioral_test_api.dart';

void main() {
  testWidgets('trocar entre perguntas longas mostra o início em tela baixa', (
    tester,
  ) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(320, 568);
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(tester.view.resetPhysicalSize);
    const first =
        'Quando surge uma pendência e ainda faltam alguns detalhes, procuro identificar o que já pode ser feito para avançar e organizo os próximos passos com as pessoas envolvidas no trabalho.';
    const second =
        'Em atividades longas, mantenho o ritmo ao dividir o trabalho em entregas menores e verifico com as pessoas envolvidas se os próximos passos estão claros antes de continuar avançando.';
    final api = BehavioralTestApi(questionTexts: {'q-1': first, 'q-2': second});
    await pumpBehavioral(tester, api);
    await tapBehavioral(tester, 'behavioral-start');
    await tapBehavioral(tester, 'likert-4');
    await tapBehavioral(tester, 'behavioral-next');
    expect(find.text('2/20').hitTestable(), findsOneWidget);
    expect(
      tester
          .getRect(find.byType(ListView))
          .contains(tester.getTopLeft(find.text(second))),
      isTrue,
    );
    await tapBehavioral(tester, 'likert-2');
    await tapBehavioral(tester, 'behavioral-back');
    expect(find.text('1/20').hitTestable(), findsOneWidget);
    expect(
      tester
          .getRect(find.byType(ListView))
          .contains(tester.getTopLeft(find.text(first))),
      isTrue,
    );
    expect(api.answers, {'q-1': 4, 'q-2': 2});
    expect(tester.takeException(), isNull);
  });

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
