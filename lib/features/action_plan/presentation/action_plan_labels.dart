import '../domain/entities/action_plan_task.dart';

String actionPlanStatusLabel(Object? value) {
  final normalized = switch (value) {
    ActionPlanTaskStatus.todo => 'TODO',
    ActionPlanTaskStatus.inProgress => 'IN_PROGRESS',
    ActionPlanTaskStatus.done => 'DONE',
    ActionPlanTaskStatus.canceled => 'CANCELED',
    _ => value?.toString().toUpperCase() ?? '',
  };
  return switch (normalized) {
    'TODO' => 'Pendente',
    'IN_PROGRESS' => 'Em andamento',
    'DONE' => 'Concluída',
    'CANCELED' => 'Cancelada',
    _ => 'Status não informado',
  };
}

String actionPlanPriorityLabel(Object? value) {
  final normalized = switch (value) {
    ActionPlanTaskPriority.low => 'LOW',
    ActionPlanTaskPriority.medium => 'MEDIUM',
    ActionPlanTaskPriority.high => 'HIGH',
    ActionPlanTaskPriority.critical => 'CRITICAL',
    _ => value?.toString().toUpperCase() ?? '',
  };
  return switch (normalized) {
    'LOW' => 'Baixa',
    'MEDIUM' => 'Média',
    'HIGH' => 'Alta',
    'CRITICAL' => 'Crítica',
    _ => 'Prioridade não informada',
  };
}

String actionPlanSourceLabel(Object? value) {
  final normalized = switch (value) {
    ActionPlanTaskSource.researchRecommendation => 'RESEARCH_RECOMMENDATION',
    ActionPlanTaskSource.manual => 'MANUAL',
    ActionPlanTaskSource.ai => 'AI',
    _ => value?.toString().toUpperCase() ?? '',
  };
  return switch (normalized) {
    'RESEARCH_RECOMMENDATION' => 'Pesquisa',
    'MANUAL' => 'Manual',
    'AI' => 'Inteligência artificial',
    _ => 'Origem não informada',
  };
}
