import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../domain/enums/action_status.dart';
import '../../domain/entities/action_item.dart';

class ActionPlanController extends StateNotifier<List<ActionItem>> {
  ActionPlanController() : super(_seed);

  static final List<ActionItem> _seed = [
    ActionItem(
      id: 'a1',
      title: 'Revisar modelo comercial',
      client: 'Alfa Tech',
      dueDate: DateTime.now().add(const Duration(days: 2)),
      priority: 'Alta',
      status: ActionStatus.inProgress,
      owner: 'Mariana Souza',
      description: 'Ajustar funil, metas e criterios de repasse.',
    ),
    ActionItem(
      id: 'a2',
      title: 'Implantar CRM',
      client: 'Beta Foods',
      dueDate: DateTime.now().add(const Duration(days: 5)),
      priority: 'Media',
      status: ActionStatus.pending,
      owner: 'Bruno Lima',
      description: 'Escolher ferramenta e iniciar rotina de acompanhamento comercial.',
    ),
    ActionItem(
      id: 'a3',
      title: 'Treinamento lideranca',
      client: 'Clara Financas',
      dueDate: DateTime.now().add(const Duration(days: 1)),
      priority: 'Alta',
      status: ActionStatus.pending,
      owner: 'Paula Costa',
      description: 'Preparar workshop com diretoria e rituais de acompanhamento.',
    ),
  ];

  void updateStatus(String id, ActionStatus status) {
    state = [
      for (final item in state)
        if (item.id == id) item.copyWith(status: status) else item,
    ];
  }

  void addItem(ActionItem item) {
    state = [item, ...state];
  }

  void updateItem(ActionItem updatedItem) {
    state = [
      for (final item in state)
        if (item.id == updatedItem.id) updatedItem else item,
    ];
  }

  void addGeneratedFromForm({
    required String clientName,
    required String formTitle,
    required Map<String, dynamic> answers,
  }) {
    final generated = <ActionItem>[
      ActionItem(
        id: 'a-${DateTime.now().microsecondsSinceEpoch}',
        title: 'Reuniao de devolutiva: $formTitle',
        client: clientName,
        dueDate: DateTime.now().add(const Duration(days: 2)),
        priority: 'Alta',
        status: ActionStatus.pending,
        owner: 'Consultor responsavel',
        description: 'Consolidar respostas do formulario e priorizar entregas.',
      ),
    ];

    final hasLowScore = answers.values.any((value) {
      final score = int.tryParse(value?.toString() ?? '');
      return score != null && score <= 2;
    });

    final hasNegativeAnswer = answers.values.any((value) {
      final text = value?.toString().toLowerCase() ?? '';
      return text.contains('nao') || text.contains('n/a');
    });

    if (hasLowScore) {
      generated.add(
        ActionItem(
          id: 'a-${DateTime.now().microsecondsSinceEpoch + 1}',
          title: 'Plano emergencial para pontos criticos',
          client: clientName,
          dueDate: DateTime.now().add(const Duration(days: 5)),
          priority: 'Alta',
          status: ActionStatus.pending,
          owner: 'Consultor responsavel',
          description: 'Atacar rapidamente os indicadores com nota baixa.',
        ),
      );
    }

    if (hasNegativeAnswer) {
      generated.add(
        ActionItem(
          id: 'a-${DateTime.now().microsecondsSinceEpoch + 2}',
          title: 'Corrigir lacunas mapeadas no formulario',
          client: clientName,
          dueDate: DateTime.now().add(const Duration(days: 7)),
          priority: 'Media',
          status: ActionStatus.pending,
          owner: 'Responsavel interno',
          description: 'Tratar pontos negativos apontados pelo cliente.',
        ),
      );
    }

    state = [...generated, ...state];
  }
}
