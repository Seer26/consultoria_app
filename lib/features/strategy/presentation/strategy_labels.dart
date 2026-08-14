String strategyStatusLabel(Object? value) =>
    switch (value?.toString().toUpperCase()) {
      'PLANNED' => 'Planejado',
      'IN_PROGRESS' => 'Em andamento',
      'COMPLETED' => 'Concluído',
      'CANCELED' => 'Cancelado',
      _ => 'Não informado',
    };
String strategyPriorityLabel(Object? value) =>
    switch (value?.toString().toUpperCase()) {
      'LOW' => 'Baixa',
      'MEDIUM' => 'Média',
      'HIGH' => 'Alta',
      'CRITICAL' => 'Crítica',
      _ => 'Não informada',
    };
String swotCategoryLabel(Object? value) =>
    switch (value?.toString().toUpperCase()) {
      'STRENGTH' => 'Forças',
      'WEAKNESS' => 'Fraquezas',
      'OPPORTUNITY' => 'Oportunidades',
      'THREAT' => 'Ameaças',
      _ => 'SWOT',
    };
