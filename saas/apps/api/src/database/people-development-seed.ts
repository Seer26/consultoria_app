import { database } from '../db/database';

const questions = [
  ['bq-01','EXECUTOR','Transformo prioridades em entregas concretas.',1,0],['bq-02','EXECUTOR','Evito começar tarefas mesmo quando são importantes.',1,1],['bq-03','EXECUTOR','Mantenho ritmo para concluir o que assumo.',1,0],['bq-04','EXECUTOR','Assumo responsabilidade por obstáculos do trabalho.',1,0],['bq-05','EXECUTOR','Deixo decisões simples para depois.',1,1],
  ['bq-06','COMUNICADOR','Expresso ideias de forma clara e respeitosa.',1,0],['bq-07','COMUNICADOR','Escuto antes de responder a uma preocupação.',1,0],['bq-08','COMUNICADOR','Evito compartilhar informações relevantes com a equipe.',1,1],['bq-09','COMUNICADOR','Adapto minha comunicação ao público.',1,0],['bq-10','COMUNICADOR','Peço esclarecimentos quando uma orientação não está clara.',1,0],
  ['bq-11','PLANEJADOR','Organizo etapas antes de iniciar atividades complexas.',1,0],['bq-12','PLANEJADOR','Acompanho prazos e ajusto o plano quando necessário.',1,0],['bq-13','PLANEJADOR','Prefiro trabalhar sem qualquer organização prévia.',1,1],['bq-14','PLANEJADOR','Defino prioridades considerando impacto e urgência.',1,0],['bq-15','PLANEJADOR','Registro informações que preciso recuperar depois.',1,0],
  ['bq-16','ANALITICO','Examino fatos antes de tirar conclusões.',1,0],['bq-17','ANALITICO','Verifico causas antes de propor uma solução.',1,0],['bq-18','ANALITICO','Tomo decisões importantes apenas por impulso.',1,1],['bq-19','ANALITICO','Comparo alternativas antes de escolher um caminho.',1,0],['bq-20','ANALITICO','Uso dados disponíveis para acompanhar resultados.',1,0],
] as const;
const competencies = [
  ['Comunicação','COMPORTAMENTAL'],['Organização','COMPORTAMENTAL'],['Proatividade','COMPORTAMENTAL'],['Trabalho em equipe','COMPORTAMENTAL'],['Adaptabilidade','COMPORTAMENTAL'],['Resolução de problemas','COMPORTAMENTAL'],['Gestão do tempo','COMPORTAMENTAL'],
  ['Liderança','GESTAO'],['Delegação','GESTAO'],['Tomada de decisão','GESTAO'],['Planejamento','GESTAO'],['Feedback','GESTAO'],
  ['Prospecção','COMERCIAL'],['Negociação','COMERCIAL'],['Atendimento','COMERCIAL'],['Follow-up','COMERCIAL'],['Fechamento','COMERCIAL'],['Relacionamento com cliente','COMERCIAL'],
] as const;
export function seedPeopleDevelopment(): void {
  const now = new Date().toISOString();
  const question = database.prepare('INSERT OR IGNORE INTO behavioral_questions(id,dimension,prompt,weight,reversed,position,active) VALUES(?,?,?,?,?,?,1)');
  questions.forEach(([id,dimension,prompt,weight,reversed], index) => question.run(id,dimension,prompt,weight,reversed,index + 1));
  const competency = database.prepare('INSERT OR IGNORE INTO competencies(id,company_id,name,description,category,active,is_default,created_at,updated_at) VALUES(?,?,?,?,?,1,1,?,?)');
  competencies.forEach(([name,category], index) => competency.run(`default-${index + 1}`,null,name,null,category,now,now));
}
