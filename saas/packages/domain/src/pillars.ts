export const pillars = [
  { key: 'strategy', label: 'Estrategia' },
  { key: 'people', label: 'Pessoas' },
  { key: 'processes', label: 'Processos' },
  { key: 'marketing_sales', label: 'Marketing & Vendas' },
  { key: 'financial', label: 'Financeiro' },
] as const;

export type PillarKey = (typeof pillars)[number]['key'];
