import 'dart:async';

import 'package:consultoria_app/core/auth/role_guard.dart';
import 'package:consultoria_app/core/widgets/sidebar.dart';
import 'package:dio/dio.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/behavioral_test_api.dart';

void main() {
  testWidgets('abrir a tela exige ação explícita para criar ou retomar', (
    tester,
  ) async {
    final api = BehavioralTestApi();
    await pumpBehavioral(tester, api);
    expect(api.requests, isEmpty);
    await startBehavioral(tester);
    expect(find.text('1/20'), findsOneWidget);
    expect(api.requests.map((r) => '${r.method} ${r.path}'), [
      'POST /behavioral/assessments/current',
      'GET /behavioral/assessments/assessment-1/questions',
    ]);
  });

  testWidgets('exige resposta, permite 1 a 5 e preserva escolha ao voltar', (
    tester,
  ) async {
    final api = BehavioralTestApi();
    await pumpBehavioral(tester, api);
    await startBehavioral(tester);
    expect(
      tester
          .widget<FilledButton>(find.byKey(const Key('behavioral-next')))
          .onPressed,
      isNull,
    );
    for (var value = 1; value <= 5; value++) {
      await tapBehavioral(tester, 'likert-$value');
      expect(
        tester.widget<ChoiceChip>(find.byKey(Key('likert-$value'))).selected,
        isTrue,
      );
    }
    await tapBehavioral(tester, 'behavioral-next');
    expect(find.text('2/20'), findsOneWidget);
    expect(api.answers['q-1'], 5);
    expect(api.requests.where((r) => r.method == 'PUT').single.data, {
      'value': 5,
    });
    await tapBehavioral(tester, 'behavioral-back');
    expect(find.text('1/20'), findsOneWidget);
    expect(
      tester.widget<ChoiceChip>(find.byKey(const Key('likert-5'))).selected,
      isTrue,
    );
    await tapBehavioral(tester, 'likert-2');
    await tapBehavioral(tester, 'behavioral-next');
    expect(api.answers['q-1'], 2);
  });

  testWidgets('retoma na primeira pergunta pendente com as respostas salvas', (
    tester,
  ) async {
    final api = BehavioralTestApi(answers: {'q-1': 4, 'q-2': 2});
    await pumpBehavioral(tester, api);
    await startBehavioral(tester);
    expect(find.text('3/20'), findsOneWidget);
    await tapBehavioral(tester, 'behavioral-back');
    expect(
      tester.widget<ChoiceChip>(find.byKey(const Key('likert-2'))).selected,
      isTrue,
    );
  });

  testWidgets(
    'salva antes de voltar e bloqueia envio duplicado enquanto aguarda',
    (tester) async {
      final api = BehavioralTestApi(answers: {'q-1': 3});
      await pumpBehavioral(tester, api);
      await startBehavioral(tester);
      await tapBehavioral(tester, 'likert-4');
      final gate = Completer<void>();
      api.saveGate = gate.future;
      await tester.tap(find.byKey(const Key('behavioral-back')));
      await tester.pump();
      expect(
        tester
            .widget<OutlinedButton>(find.byKey(const Key('behavioral-back')))
            .onPressed,
        isNull,
      );
      expect(
        tester
            .widget<FilledButton>(find.byKey(const Key('behavioral-next')))
            .onPressed,
        isNull,
      );
      gate.complete();
      await tester.pumpAndSettle();
      expect(find.text('1/20'), findsOneWidget);
      expect(api.answers['q-2'], 4);
    },
  );

  testWidgets('falha ao salvar mantém seleção e pergunta para nova tentativa', (
    tester,
  ) async {
    final api = BehavioralTestApi();
    api.dio.interceptors.insert(
      0,
      InterceptorsWrapper(
        onRequest: (r, h) {
          if (r.method == 'PUT' && !api.failSave) {
            api.failSave = true;
            return h.reject(
              DioException(
                requestOptions: r,
                type: DioExceptionType.connectionError,
              ),
            );
          }
          h.next(r);
        },
      ),
    );
    await pumpBehavioral(tester, api);
    await startBehavioral(tester);
    await tapBehavioral(tester, 'likert-3');
    await tapBehavioral(tester, 'behavioral-next');
    expect(find.text('1/20'), findsOneWidget);
    expect(
      tester.widget<ChoiceChip>(find.byKey(const Key('likert-3'))).selected,
      isTrue,
    );
    expect(find.textContaining('Verifique sua conexao'), findsOneWidget);
    api.failSave = false;
    api.dio.interceptors.removeAt(0);
    await tapBehavioral(tester, 'behavioral-next');
    expect(find.text('2/20'), findsOneWidget);
  });

  for (final role in ['OWNER', 'EMPLOYEE']) {
    test('$role tem navegação e acesso à avaliação própria', () {
      expect(RoleGuard.canAccessRoute(role, '/behavioral'), isTrue);
      expect(
        RoleGuard.sidebarItemsForRole(role),
        contains(SidebarItem.comportamental),
      );
    });

    testWidgets(
      '$role conclui com confirmação sem score ou gráfico e sem reinício automático',
      (tester) async {
        final api = BehavioralTestApi(
          answers: {for (var i = 1; i <= 19; i++) 'q-$i': 3},
        );
        await pumpBehavioral(tester, api);
        await startBehavioral(tester);
        expect(find.text('20/20'), findsOneWidget);
        await tapBehavioral(tester, 'likert-5');
        await tapBehavioral(tester, 'behavioral-next');
        expect(find.text('Concluir avaliação?'), findsOneWidget);
        expect(api.completed, isFalse);
        await tester.tap(find.text('Continuar respondendo'));
        await tester.pumpAndSettle();
        expect(find.text('20/20'), findsOneWidget);
        await tapBehavioral(tester, 'behavioral-next');
        await tester.tap(find.byKey(const Key('behavioral-confirm-complete')));
        await tester.pumpAndSettle();
        expect(api.completed, isTrue);
        expect(find.text('Avaliação concluída com sucesso.'), findsOneWidget);
        expect(find.byType(BarChart), findsNothing);
        expect(find.textContaining('Score'), findsNothing);
        expect(find.textContaining('EXECUTOR'), findsNothing);
        expect(find.textContaining('predominante'), findsNothing);
        await pumpBehavioral(tester, api, pageKey: const Key('reopen'));
        expect(
          api.requests.where((r) => r.path.endsWith('/current')),
          hasLength(1),
        );
        expect(find.byKey(const Key('behavioral-start')), findsOneWidget);
      },
    );
  }

  test('ADMIN não acessa o questionário do respondente', () {
    expect(RoleGuard.canAccessRoute('ADMIN', '/behavioral'), isFalse);
    expect(
      RoleGuard.sidebarItemsForRole('ADMIN'),
      isNot(contains(SidebarItem.comportamental)),
    );
  });
}
