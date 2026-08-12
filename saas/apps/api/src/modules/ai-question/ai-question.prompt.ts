import type {
  CompanyRecord,
  ResearchAnswerRecord,
  ResearchSubmissionRecord,
} from '../research/research.types';

function bounded(value: string | null | undefined, max: number): string {
  return (value?.trim() || 'nao informado').slice(0, max);
}

function answerContext(answers: ResearchAnswerRecord[]): string {
  return answers.slice(-12).map((answer, index) =>
    `${index + 1}. [${bounded(answer.pillar, 60)}] Pergunta: ${bounded(answer.question, 280)}\n` +
    `Resposta: ${bounded(answer.answer, 800)}`,
  ).join('\n');
}

export function buildAdaptiveQuestionInput(input: {
  company: CompanyRecord;
  submission: ResearchSubmissionRecord;
  answers: ResearchAnswerRecord[];
}): string {
  const pillars = [...new Set(input.answers.map((item) => item.pillar).filter(Boolean))];
  return [
    `Setor da empresa: ${bounded(input.company.sector, 100)}`,
    `Porte: ${bounded(input.company.size, 60)}`,
    `Funcao profissional atribuida: ${bounded(input.submission.respondentJobFunction, 100)}`,
    `Departamento atribuido: ${bounded(input.submission.respondentDepartment, 100)}`,
    `Estagio: ${input.submission.status}`,
    `Pilares abordados: ${pillars.join(', ') || 'nenhum'}`,
    `Quantidade de respostas: ${input.answers.length}`,
    'Historico autorizado desta pesquisa:',
    answerContext(input.answers) || 'Nenhuma resposta anterior.',
  ].join('\n');
}

export function buildConsultingAnalysisInput(input: {
  company: CompanyRecord;
  submission: ResearchSubmissionRecord;
  answers: ResearchAnswerRecord[];
}): string {
  return [
    `Setor: ${bounded(input.company.sector, 100)}`,
    `Porte: ${bounded(input.company.size, 60)}`,
    `Funcao profissional atribuida: ${bounded(input.submission.respondentJobFunction, 100)}`,
    `Departamento atribuido: ${bounded(input.submission.respondentDepartment, 100)}`,
    `Score oficial (nao recalcular): ${input.submission.overallScore ?? 'indisponivel'}`,
    `Scores oficiais por pilar: ${JSON.stringify(input.submission.pillarScores)}`,
    `Gargalos calculados: ${JSON.stringify(input.submission.criticalPoints)}`,
    `Oportunidades calculadas: ${JSON.stringify(input.submission.opportunities)}`,
    'Respostas autorizadas desta pesquisa:',
    answerContext(input.answers),
  ].join('\n');
}

export const adaptiveQuestionInstructions = [
  'Voce e um consultor empresarial senior.',
  'Produza UMA proxima pergunta curta, clara e em portugues do Brasil.',
  'A pergunta deve aprofundar o diagnostico e nao repetir as perguntas fornecidas.',
  'Nao solicite senha, documento, cartao, segredo, credencial ou dado pessoal desnecessario.',
  'Use somente o contexto fornecido. Nao presuma dados de outras empresas.',
  'Defina shouldContinue como false quando o diagnostico ja estiver suficientemente coberto.',
].join(' ');

export const consultingAnalysisInstructions = [
  'Voce e um consultor empresarial senior e produz uma analise executiva em portugues do Brasil.',
  'Os scores, pilares, gargalos e oportunidades recebidos sao oficiais e imutaveis.',
  'Nao recalcule nem contradiga os numeros. Complemente-os com interpretacao e recomendacoes praticas.',
  'Nao crie tarefas nem execute mudancas. As recomendacoes serao revisadas no fluxo controlado do produto.',
  'Nao solicite nem exponha dados sensiveis.',
].join(' ');
