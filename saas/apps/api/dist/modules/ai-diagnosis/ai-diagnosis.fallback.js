function normalizeScore(answer) {
    if (typeof answer.answer === 'number') {
        return answer.answer;
    }
    const parsed = Number(answer.answer);
    return Number.isFinite(parsed) ? parsed : 3;
}
function groupByArea(answers) {
    return answers.reduce((accumulator, answer) => {
        const area = answer.area?.trim() || 'geral';
        const current = accumulator.get(area) ?? [];
        current.push(answer);
        accumulator.set(area, current);
        return accumulator;
    }, new Map());
}
function buildProblem(area, averageScore) {
    const severity = averageScore <= 2 ? 'high' : averageScore <= 3 ? 'medium' : 'low';
    return {
        area,
        title: `Baixa maturidade em ${area}`,
        description: `As respostas indicam media ${averageScore.toFixed(1)} nesta area, sugerindo falta de consistencia operacional ou gerencial.`,
        severity,
    };
}
function buildFollowUpQuestion(area) {
    return {
        area,
        question: `Qual e o principal bloqueio que impede a evolucao de ${area} hoje?`,
        reason: `Aprofundar a causa raiz da baixa maturidade detectada em ${area}.`,
    };
}
function buildAction(area, averageScore) {
    const priority = averageScore <= 2 ? 'high' : averageScore <= 3 ? 'medium' : 'low';
    return {
        area,
        title: `Definir plano de melhoria para ${area}`,
        description: `Mapear processos, responsaveis e indicadores da area para elevar a maturidade nas proximas semanas.`,
        priority,
    };
}
export function buildFallbackAiDiagnosis(answers) {
    const groupedAnswers = groupByArea(answers);
    const areas = [...groupedAnswers.entries()]
        .map(([area, areaAnswers]) => {
        const total = areaAnswers.reduce((sum, answer) => sum + normalizeScore(answer), 0);
        const averageScore = areaAnswers.length === 0 ? 0 : total / areaAnswers.length;
        return { area, averageScore };
    })
        .sort((left, right) => left.averageScore - right.averageScore);
    const criticalAreas = areas.slice(0, Math.min(5, areas.length));
    return {
        problems: criticalAreas.map(({ area, averageScore }) => buildProblem(area, averageScore)),
        questions: criticalAreas.map(({ area }) => buildFollowUpQuestion(area)),
        actions: criticalAreas.map(({ area, averageScore }) => buildAction(area, averageScore)),
    };
}
