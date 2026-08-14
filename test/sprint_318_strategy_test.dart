import 'package:consultoria_app/core/auth/role_guard.dart';
import 'package:consultoria_app/core/widgets/sidebar.dart';
import 'package:consultoria_app/features/strategy/presentation/strategy_labels.dart';
import 'package:consultoria_app/features/strategy/presentation/strategy_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  void useSurface(WidgetTester tester, double width) {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = Size(width, 1200);
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(tester.view.resetPhysicalSize);
  }

  Widget strategy(Map<String, dynamic> data, {required bool canEdit}) {
    return MaterialApp(
      home: Scaffold(
        body: StrategyContent(
          data: data,
          canEdit: canEdit,
          onEditProfile: () {},
          onAddObjective: () {},
          onEditObjective: (_) {},
          onAddGoal: (_) {},
          onEditGoal: (_, _) {},
          onAddSwot: (_) {},
          onEditSwot: (_) {},
          onDeleteSwot: (_) {},
        ),
      ),
    );
  }

  const emptyData = <String, dynamic>{
    'profile': <String, dynamic>{'mission': '', 'vision': '', 'values': ''},
    'summary': <String, dynamic>{
      'activeObjectives': 0,
      'goalsDueSoon': 0,
      'progress': 0,
    },
    'objectives': <Map<String, dynamic>>[],
    'swotItems': <Map<String, dynamic>>[],
  };

  test('rotulos estrategicos sao centralizados em portugues', () {
    expect(strategyStatusLabel('IN_PROGRESS'), 'Em andamento');
    expect(strategyPriorityLabel('CRITICAL'), 'Crítica');
    expect(swotCategoryLabel('STRENGTH'), 'Forças');
    expect(swotCategoryLabel('WEAKNESS'), 'Fraquezas');
    expect(swotCategoryLabel('OPPORTUNITY'), 'Oportunidades');
    expect(swotCategoryLabel('THREAT'), 'Ameaças');
  });

  test('navegacao libera estrategia para owner e employee', () {
    expect(RoleGuard.canAccessRoute('OWNER', '/strategy'), isTrue);
    expect(RoleGuard.canAccessRoute('EMPLOYEE', '/strategy'), isTrue);
    expect(RoleGuard.canAccessRoute('ADMIN', '/strategy'), isFalse);
    expect(
      RoleGuard.sidebarItemsForRole('OWNER'),
      contains(SidebarItem.estrategia),
    );
  });

  for (final width in [320.0, 390.0, 768.0, 1280.0]) {
    testWidgets('estado vazio da estrategia responde em ${width.toInt()} px', (
      tester,
    ) async {
      useSurface(tester, width);
      await tester.pumpWidget(strategy(emptyData, canEdit: true));
      await tester.pumpAndSettle();

      expect(find.byKey(const ValueKey('strategy-content')), findsOneWidget);
      if (find.text('Novo objetivo').evaluate().isEmpty) {
        await tester.drag(find.byType(ListView).first, const Offset(0, -500));
        await tester.pumpAndSettle();
      }
      expect(find.text('Novo objetivo'), findsOneWidget);
      if (width >= 768) {
        expect(
          find.text('Nenhum objetivo estratégico foi definido ainda.'),
          findsOneWidget,
        );
      }
      expect(tester.takeException(), isNull);
    });
  }

  testWidgets('conteudo estrategico exibe objetivo, meta e SWOT', (
    tester,
  ) async {
    useSurface(tester, 390);
    final data = <String, dynamic>{
      'profile': <String, dynamic>{
        'mission': 'Simplificar a gestao.',
        'vision': 'Ser referencia nacional.',
        'values': 'Etica e clareza.',
      },
      'summary': <String, dynamic>{
        'activeObjectives': 1,
        'goalsDueSoon': 1,
        'progress': 0,
      },
      'objectives': <Map<String, dynamic>>[
        <String, dynamic>{
          'id': 'objective-1',
          'title': 'Crescer com previsibilidade',
          'description': 'Consolidar o processo comercial.',
          'status': 'IN_PROGRESS',
          'priority': 'HIGH',
          'responsibleUserName': 'Ana',
          'goals': <Map<String, dynamic>>[
            <String, dynamic>{
              'id': 'goal-1',
              'title': 'Atingir 180 mil',
              'status': 'IN_PROGRESS',
              'currentValue': 140000,
              'targetValue': 180000,
              'unit': 'BRL',
              'dueDate': null,
            },
          ],
        },
      ],
      'swotItems': <Map<String, dynamic>>[
        <String, dynamic>{
          'id': 'swot-1',
          'category': 'STRENGTH',
          'title': 'Equipe experiente',
          'description': 'Conhecimento do mercado.',
        },
      ],
    };

    await tester.pumpWidget(strategy(data, canEdit: true));
    await tester.pumpAndSettle();

    expect(find.text('Simplificar a gestao.'), findsOneWidget);
    expect(find.text('Crescer com previsibilidade'), findsOneWidget);
    expect(find.text('Atingir 180 mil'), findsOneWidget);
    await tester.drag(find.byType(ListView).first, const Offset(0, -900));
    await tester.pumpAndSettle();
    expect(find.text('Equipe experiente'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('colaborador recebe visualizacao sem acoes de edicao', (
    tester,
  ) async {
    useSurface(tester, 768);
    await tester.pumpWidget(strategy(emptyData, canEdit: false));
    await tester.pumpAndSettle();

    expect(find.text('Novo objetivo'), findsNothing);
    expect(find.text('Editar'), findsNothing);
    expect(find.byIcon(Icons.add_circle_outline), findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets('formularios estrategicos nao estouram em 320 px', (
    tester,
  ) async {
    useSurface(tester, 320);

    Future<void> open(Widget dialog) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Builder(
            builder: (context) => Scaffold(
              body: Center(
                child: FilledButton(
                  onPressed: () => showDialog<void>(
                    context: context,
                    builder: (_) => dialog,
                  ),
                  child: const Text('Abrir'),
                ),
              ),
            ),
          ),
        ),
      );
      await tester.tap(find.text('Abrir'));
      await tester.pumpAndSettle();
      expect(find.text('Salvar'), findsOneWidget);
      expect(tester.takeException(), isNull);
      await tester.tap(find.text('Cancelar'));
      await tester.pumpAndSettle();
    }

    await open(const StrategyProfileDialog(profile: <String, dynamic>{}));
    await open(
      const StrategicObjectiveDialog(assignees: <Map<String, dynamic>>[]),
    );
    await open(const StrategicGoalDialog());
    await open(const SwotItemDialog(category: 'STRENGTH'));
  });
}
