function normalizeAnswer(answer, index) {
    const title = answer.question ?? `Pergunta ${index + 1}`;
    const area = answer.area ?? 'geral';
    const questionId = answer.questionId ? ` (${answer.questionId})` : '';
    const notes = answer.notes ? ` | contexto: ${answer.notes}` : '';
    return `- [${area}] ${title}${questionId} => resposta: ${String(answer.answer)}${notes}`;
}
export function buildAiDiagnosisPrompt(answers) {
    const normalizedAnswers = answers.map(normalizeAnswer).join('\n');
    return [
        'Voce e um consultor empresarial senior especializado em diagnostico organizacional.',
        'Analise as respostas recebidas e gere um diagnostico objetivo para apoiar uma consultoria empresarial.',
        'Regras:',
        '- Identifique no maximo 5 problemas prioritarios.',
        '- Gere entre 3 e 5 novas perguntas que aprofundem os gargalos.',
        '- Gere entre 3 e 5 acoes objetivas e executaveis.',
        '- Use portugues do Brasil.',
        '- Priorize clareza, concisao e utilidade pratica.',
        '- Considere notas baixas como indicio de gargalo operacional ou gerencial.',
        '- Nao repita perguntas ja respondidas com a mesma formulacao.',
        '- Nas acoes, indique iniciativas concretas que caibam nas proximas semanas.',
        '- Em problems, descreva causa ou impacto do problema, nao apenas o sintoma.',
        '- Mantenha coerencia entre area, problema identificado, pergunta sugerida e acao proposta.',
        '',
        'Respostas recebidas:',
        normalizedAnswers,
    ].join('\n');
}
