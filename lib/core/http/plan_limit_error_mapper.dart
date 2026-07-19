String? planLimitMessageFromResponseData(dynamic data) {
  if (data is! Map || data['error']?.toString() != 'PLAN_LIMIT_REACHED') {
    return null;
  }

  final feature = data['feature']?.toString();
  final baseMessage = switch (feature) {
    'USER_SEATS' =>
      'Sua empresa atingiu o limite de usuarios ativos do plano atual.',
    'RESEARCH_SUBMISSIONS_MONTHLY' =>
      'Sua empresa atingiu o limite de pesquisas mensais do plano atual.',
    'REPORT_PDFS_MONTHLY' =>
      'Sua empresa atingiu o limite de PDFs do plano atual.',
    'ACTION_TASKS_ACTIVE' =>
      'Sua empresa atingiu o limite de tarefas ativas do plano atual.',
    'AI_QUESTIONS_MONTHLY' =>
      'Sua empresa atingiu o limite de uso de IA do plano atual.',
    _ => 'Sua empresa atingiu um limite do plano atual.',
  };

  return '$baseMessage Entre em contato com o administrador para liberar um plano maior.';
}
