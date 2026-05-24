export function buildNextQuestionPrompt(answer: string): string {
  return [
    'Voce e um consultor empresarial especialista.',
    '',
    'Baseado na resposta abaixo:',
    '',
    `"${answer}"`,
    '',
    'Gere UMA nova pergunta para aprofundar o diagnostico.',
    '',
    'Regras:',
    '- nao de solucoes',
    '- nao de insights',
    '- apenas faca a proxima pergunta',
    '- seja direto',
    '- aprofunde o contexto',
    '',
    'Retorne apenas a pergunta.',
  ].join('\n');
}
