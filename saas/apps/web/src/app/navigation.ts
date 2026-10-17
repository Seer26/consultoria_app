export const appSections = [
  { key: 'action_plan', label: 'Plano de ação' },
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'strategy', label: 'Estrategia' },
  { key: 'people', label: 'Pessoas' },
  { key: 'processes', label: 'Processos' },
  { key: 'marketing_sales', label: 'Marketing' },
  { key: 'financial', label: 'Financeiro' },
] as const;

export type AppSection = (typeof appSections)[number]['key'];
