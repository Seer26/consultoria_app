import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import jwt from 'jsonwebtoken';

const dir = mkdtempSync(join(tmpdir(), 'monitoring-'));
process.env.DATABASE_PATH = join(dir, 'test.sqlite');
process.env.JWT_SECRET = 'phase1-test-only-configured-secret-32-characters';
const { app } = await import('../src/app');
const { initDatabase } = await import('../src/database/init');
const { database: db } = await import('../src/db/database');
await initDatabase();
const now = new Date().toISOString();
for (const company of ['A', 'B']) {
  db.prepare('INSERT INTO companies(id,name,slug,status,created_at,updated_at) VALUES(?,?,?,\'ACTIVE\',?,?)').run(company, 'Tenant '+company, company, now, now);
  for (const [role, suffix] of [['OWNER','owner'],['EMPLOYEE','employee'],['EMPLOYEE','other'],['ADMIN','admin']]) {
    db.prepare(`INSERT INTO users(id,name,email,password_hash,role,company_id,status,created_at,updated_at)
      VALUES(?,?,?,(SELECT password_hash FROM users LIMIT 1),?,?,'ACTIVE',?,?)`).run(`${company}-${suffix}`, `${company} ${suffix}`,`${company}-${suffix}@test.local`,role,company,now,now);
  }
}
const server = app.listen(0, '127.0.0.1');
await new Promise<void>(resolve => server.once('listening', resolve));
const address = server.address();
assert.ok(address && typeof address !== 'string');
const base = `http://127.0.0.1:${address.port}`;
const token = (id:string, companyId='spoofed', role='ADMIN') => jwt.sign({userId:id,companyId,role}, process.env.JWT_SECRET!);
async function request(path:string, actor='A-owner', method='GET', body?:unknown) {
  const response = await fetch(base+path, {method,headers:{'Content-Type':'application/json',...(actor ? {Authorization:`Bearer ${token(actor)}`} : {})},body:body===undefined?undefined:JSON.stringify(body)});
  return {status:response.status, data:await response.json()};
}
const api='/action-plan';
let planId:string, taskId:string, otherTask:string;

test('creates a plan using database tenant and actor, ignoring forged user claims', async()=>{
  const r=await request(api+'/plans','A-owner','POST',{title:'Plano operacional',status:'ATIVO',createdBy:'B-owner',userId:'B-owner'});
  assert.equal(r.status,201);assert.equal(r.data.companyId,'A');assert.equal(r.data.createdBy,'A-owner');planId=r.data.id;
});
test('creates task and assigns same-tenant responsible', async()=>{
  const r=await request(api+'/tasks','A-owner','POST',{planId,title:'Revisar fluxo',responsibleUserId:'A-employee',priority:'ALTA',dueDate:'2020-01-01'});
  assert.equal(r.status,201);taskId=r.data.id;assert.equal(r.data.progress,0);assert.equal(r.data.overdue,true);
  const other=await request(api+'/tasks','A-owner','POST',{planId,title:'Outra tarefa',responsibleUserId:'A-other'});assert.equal(other.status,201);otherTask=other.data.id;
});
test('rejects foreign responsible and forged companyId',async()=>{
  assert.equal((await request(api+'/tasks','A-owner','POST',{planId,title:'Invasão',responsibleUserId:'B-employee'})).status,400);
  assert.equal((await request(api+'/plans','A-owner','POST',{title:'Invasão',companyId:'B'})).status,403);
});
test('rejects progress outside 0..100, strings, null, objects and missing status',async()=>{
  for(const progress of [-1,101,'50',null,{},1.5]) assert.equal((await request(api+'/tasks/'+taskId,'A-employee','PUT',{progress})).status,400);
  assert.equal((await request(api+'/tasks/'+taskId+'/status','A-owner','PATCH',{})).status,400);
});
test('employee starts task and updates progress and notes',async()=>{
  const r=await request(api+'/tasks/'+taskId,'A-employee','PUT',{status:'EM_ANDAMENTO',progress:40,notes:'Executando'});
  assert.equal(r.status,200);assert.equal(r.data.progress,40);assert.equal(r.data.status,'EM_ANDAMENTO');
});
test('employee cannot edit responsibility, deadline, priority or complete/reopen',async()=>{
  for(const body of [{responsibleUserId:'A-other'},{dueDate:'2030-01-01'},{priority:'CRITICA'},{status:'CONCLUIDA'},{title:'Troca'},{companyId:'B'},{planId:'forged'}]) {
    assert.equal((await request(api+'/tasks/'+taskId,'A-employee','PUT',body)).status,403);
  }
  assert.equal((await request(api+'/plans','A-employee','POST',{title:'Proibido'})).status,403);
  assert.equal((await request(api+'/tasks','A-employee','POST',{planId,title:'Proibido'})).status,403);
});
test('employee cannot read or change another employee task in same tenant',async()=>{
  assert.equal((await request(api+'/tasks/'+otherTask,'A-employee')).status,404);
  assert.equal((await request(api+'/tasks/'+otherTask,'A-employee','PUT',{progress:50})).status,404);
  const r=await request(api+'/tasks','A-employee');assert.deepEqual(r.data.map((x:{id:string})=>x.id),[taskId]);
});
test('adds comment and HTTPS link, rejects dangerous URLs and empty evidence',async()=>{
  for(const body of [{type:'COMENTARIO',content:'Entrega revisada'},{type:'LINK',content:'https://example.com/entrega'}]) {
    const r=await request(api+'/tasks/'+taskId+'/evidence','A-employee','POST',body);assert.equal(r.status,201);assert.equal(r.data.createdBy,'A-employee');
  }
  for(const content of ['javascript:alert(1)','file:///etc/passwd','http://user:pass@example.com','']) {
    assert.equal((await request(api+'/tasks/'+taskId+'/evidence','A-employee','POST',{type:'LINK',content})).status,400);
  }
  assert.equal((await request(api+'/tasks/'+taskId+'/evidence','A-employee')).data.length,2);
});
test('sends for validation, manager completes and reopens with coherent progress',async()=>{
  assert.equal((await request(api+'/tasks/'+taskId+'/status','A-employee','PATCH',{status:'AGUARDANDO_VALIDACAO'})).status,200);
  let r=await request(api+'/tasks/'+taskId+'/status','A-owner','PATCH',{status:'CONCLUIDA'});
  assert.equal(r.status,200);assert.equal(r.data.progress,100);assert.ok(r.data.completedAt);assert.equal(r.data.overdue,false);
  assert.equal((await request(api+'/tasks/'+taskId,'A-employee','PUT',{progress:70})).status,403);
  r=await request(api+'/tasks/'+taskId+'/status','A-owner','PATCH',{status:'EM_ANDAMENTO'});
  assert.equal(r.status,200);assert.equal(r.data.progress,0);assert.equal(r.data.completedAt,null);assert.equal(r.data.overdue,true);
});
test('records actor, old/new values, creation, evidence, completion and reopening',async()=>{
  const r=await request(api+'/tasks/'+taskId+'/history');assert.equal(r.status,200);
  const events=r.data as Array<{event:string;actorId:string;oldValue:unknown;newValue:unknown;createdAt:string}>;
  for(const event of ['CRIACAO','PROGRESSO','STATUS','EVIDENCIA_ADICIONADA','CONCLUSAO','REABERTURA']) assert.ok(events.some(x=>x.event===event),event);
  const progress=events.find(x=>x.event==='PROGRESSO'&&x.newValue===40)!;assert.equal(progress.oldValue,0);assert.equal(progress.actorId,'A-employee');assert.ok(progress.createdAt);
});
test('tracks responsible, deadline and priority changes',async()=>{
  const r=await request(api+'/tasks/'+taskId,'A-owner','PUT',{responsibleUserId:'A-other',dueDate:'2021-01-01',priority:'CRITICA'});assert.equal(r.status,200);
  const events=(await request(api+'/tasks/'+taskId+'/history')).data;
  for(const event of ['RESPONSAVEL','PRAZO','PRIORIDADE']) assert.ok(events.some((x:{event:string})=>x.event===event));
});
test('dashboard, plan progress, filters and employee operational summary use real tasks',async()=>{
  await request(api+'/tasks/'+taskId,'A-owner','PUT',{progress:50});
  const d=await request(api+'/dashboard');assert.equal(d.status,200);assert.equal(d.data.total,2);assert.equal(d.data.overdue,1);assert.equal(d.data.progress,25);
  const p=await request(api+'/plans/'+planId);assert.equal(p.data.progress,25);
  const f=await request(api+'/tasks?overdue=true&priority=CRITICA&responsibleUserId=A-other&status=EM_ANDAMENTO');assert.equal(f.data.length,1);
  const employees=await request(api+'/employees');assert.equal(employees.status,200);assert.equal(employees.data.find((x:{id:string})=>x.id==='A-other').total,2);
});
test('tenant B explicitly cannot read A plan, task, evidence, history, dashboards or mutate them',async()=>{
  for(const actor of ['B-owner','B-employee','B-admin']) {
    for(const path of ['/plans/'+planId,'/tasks/'+taskId,'/tasks/'+taskId+'/evidence','/tasks/'+taskId+'/history']) assert.equal((await request(api+path,actor)).status,404,actor+path);
    for(const [path,method,body] of [
      ['/plans/'+planId,'PUT',{title:'Invasão'}],['/tasks/'+taskId,'PUT',{progress:99}],['/tasks/'+taskId+'/status','PATCH',{status:'CONCLUIDA'}],['/tasks/'+taskId+'/evidence','POST',{type:'COMENTARIO',content:'Invasão'}],['/tasks','POST',{planId,title:'Invasão'}],
    ] as const) assert.equal((await request(api+path,actor,method,body)).status,actor==='B-employee'&&path==='/tasks'?403:404,actor+path);
    for(const path of ['/plans','/tasks']) assert.equal((await request(api+path,actor)).data.length,0);
    assert.equal((await request(api+'/dashboard',actor)).data.total,0);
    assert.equal((await request(api+'/tasks?companyId=A',actor)).status,403);
  }
});
test('evidence IDs cannot be used as another tenant resource',async()=>{
  const evidence=(await request(api+'/tasks/'+taskId+'/evidence')).data[0];
  assert.equal((await request(api+'/tasks/'+evidence.id+'/evidence','B-owner')).status,404);
});
test('only active database identities authorize; public privileged registration is blocked',async()=>{
  assert.equal((await request(api+'/plans','','GET')).status,401);
  assert.equal((await request('/auth/register','','POST',{name:'Attacker',email:'evil@test.local',password:'123456',role:'ADMIN'})).status,401);
  assert.equal((await request('/auth/register','A-employee','POST',{name:'Attacker',email:'evil@test.local',password:'123456',role:'ADMIN'})).status,403);
  db.prepare("UPDATE users SET status='INACTIVE' WHERE id='A-employee'").run();
  assert.equal((await request(api+'/tasks','A-employee')).status,403);
  db.prepare("UPDATE users SET status='ACTIVE' WHERE id='A-employee'").run();
});
test('plan completion requires finished tasks and task reopening reactivates plan',async()=>{
  assert.equal((await request(api+'/plans/'+planId,'A-owner','PUT',{status:'CONCLUIDO'})).status,409);
  for(const id of [taskId,otherTask]) assert.equal((await request(api+'/tasks/'+id+'/status','A-owner','PATCH',{status:'CONCLUIDA'})).status,200);
  assert.equal((await request(api+'/plans/'+planId,'A-owner','PUT',{status:'CONCLUIDO'})).status,200);
  assert.equal((await request(api+'/plans/'+planId)).data.progress,100);
  assert.equal((await request(api+'/tasks/'+taskId+'/status','A-owner','PATCH',{status:'EM_ANDAMENTO'})).status,200);
  assert.equal((await request(api+'/plans/'+planId)).data.status,'ATIVO');
});
test('foreign diagnosis and invalid enums/dates are rejected without mutation',async()=>{
  for(const body of [{title:''},{title:'X',status:'INVALID'},{title:'X',startDate:'2030-02-31'},{title:'X',startDate:'2030-02-02',dueDate:'2030-01-01'},{title:'X',submissionId:'foreign'}]) {
    assert.ok([400,404].includes((await request(api+'/plans','A-owner','POST',body)).status));
  }
  for(const body of [{priority:'LOW'},{status:'TODO'},{progress:100, status:'EM_ANDAMENTO',dueDate:'bad'}, {title:42}]) assert.equal((await request(api+'/tasks/'+taskId,'A-owner','PUT',body)).status,400);
});
after(async()=>{await new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve())); db.close();rmSync(dir,{recursive:true,force:true});});

test('global administrator must select tenant and can manage only that selected context',async()=>{
  assert.equal((await request(api+'/plans','user-admin-teste')).status,400);
  const r=await request(api+'/plans?companyId=B','user-admin-teste','POST',{title:'Plano B',status:'ATIVO'});
  assert.equal(r.status,201);assert.equal(r.data.companyId,'B');assert.equal(r.data.createdBy,'user-admin-teste');
  assert.equal((await request(api+'/plans/'+r.data.id+'?companyId=A','user-admin-teste')).status,404);
  assert.equal((await request(api+'/plans/'+r.data.id,'A-owner')).status,404);
});
test('employee without assignments cannot see tenant plans or other employee summaries',async()=>{
  const list=await request(api+'/plans','A-employee');assert.equal(list.status,200);assert.equal(list.data.length,0);
  const users=await request(api+'/employees','A-employee');assert.equal(users.data.length,1);assert.equal(users.data[0].id,'A-employee');
  assert.equal((await request(api+'/members','A-employee')).status,403);
});
test('task and evidence writes rollback if history insertion fails',async()=>{
  const before=(await request(api+'/tasks/'+taskId)).data;
  db.exec("CREATE TRIGGER fail_history BEFORE INSERT ON action_plan_history BEGIN SELECT RAISE(ABORT,'test rollback'); END");
  assert.equal((await request(api+'/tasks/'+taskId,'A-owner','PUT',{progress:before.progress===33?34:33})).status,500);
  assert.equal((await request(api+'/tasks/'+taskId)).data.progress,before.progress);
  const count=(await request(api+'/tasks/'+taskId+'/evidence')).data.length;
  assert.equal((await request(api+'/tasks/'+taskId+'/evidence','A-owner','POST',{type:'COMENTARIO',content:'Rollback'})).status,500);
  assert.equal((await request(api+'/tasks/'+taskId+'/evidence')).data.length,count);
  db.exec('DROP TRIGGER fail_history');
});
test('migration preserves legacy tasks, converts enums and is repeatable on fresh and upgraded DBs',async()=>{
  const { default: Database }=await import('better-sqlite3');
  const { schemaStatements }=await import('../src/db/schema');
  const { migrateActionPlanMonitoring }=await import('../src/database/monitoring-migration');
  for(const legacy of [false,true]) {
    const memory=new Database(':memory:');memory.pragma('foreign_keys=ON');
    schemaStatements.forEach(sql=>memory.exec(sql));
    if(legacy) {
      memory.prepare("INSERT INTO companies(id,name,slug,created_at,updated_at) VALUES('legacy','Legacy','legacy',?,?)").run(now,now);
      memory.prepare("INSERT INTO action_plan_tasks(id,company_id,title,description,priority,status,created_at,updated_at) VALUES('old','legacy','Preservada','','HIGH','DONE',?,?)").run(now,now);
    }
    migrateActionPlanMonitoring(memory);migrateActionPlanMonitoring(memory);
    assert.equal((memory.prepare('SELECT count(*) AS n FROM schema_migrations').get() as {n:number}).n,1);
    assert.deepEqual(memory.pragma('foreign_key_check'),[]);
    if(legacy) {
      const row=memory.prepare('SELECT title,priority,status,progress,plan_id AS planId FROM action_plan_tasks').get() as {title:string;priority:string;status:string;progress:number;planId:string};
      assert.equal(row.title,'Preservada');assert.equal(row.priority,'ALTA');assert.equal(row.status,'CONCLUIDA');assert.equal(row.progress,100);assert.ok(row.planId);
      assert.equal((memory.prepare('SELECT count(*) AS n FROM action_plan_history').get() as {n:number}).n,1);
      assert.throws(()=>memory.prepare('UPDATE action_plan_tasks SET progress=101').run());
    }
    memory.close();
  }
});
test('initialization can run repeatedly without resetting monitoring data',async()=>{
  const before=(await request(api+'/tasks/'+taskId)).data;
  await initDatabase();
  const result=(await request(api+'/tasks/'+taskId)).data;
  assert.equal(result.progress,before.progress);assert.equal(result.status,before.status);
});
test('tenant-bound admin cannot use global company administration to take over another tenant',async()=>{
  assert.equal((await request('/companies','B-admin')).status,403);
  assert.equal((await request('/users/A-owner/status','B-admin','PATCH',{status:'INACTIVE'})).status,403);
});
test('rejects real cross-tenant diagnosis references and invalid calendar timestamps',async()=>{
  db.prepare("INSERT INTO diagnosis_submissions(id,company_id,questionnaire_id,created_at,updated_at) VALUES('B-diagnosis','B','q',?,?)").run(now,now);
  assert.equal((await request(api+'/plans','A-owner','POST',{title:'Plano inválido',submissionId:'B-diagnosis'})).status,404);
  assert.equal((await request(api+'/plans','A-owner','POST',{title:'Data inválida',dueDate:'2030-02-31T12:00:00Z'})).status,400);
});
test('foreign keys enforce tenant isolation even if a service validation is accidentally removed',()=>{
  assert.throws(()=>db.prepare("UPDATE action_plan_tasks SET responsible_user_id='B-employee' WHERE id=?").run(taskId));
  const bPlan=(db.prepare("SELECT id FROM action_plans WHERE company_id='B' LIMIT 1").get() as {id:string}).id;
  assert.throws(()=>db.prepare('UPDATE action_plan_tasks SET plan_id=? WHERE id=?').run(bPlan,taskId));
  assert.deepEqual(db.pragma('foreign_key_check'),[]);
});
test('validates and migrates the actual versioned SQLite fixture without changing it',async()=>{
  const { default: Database }=await import('better-sqlite3');
  const { copyFileSync }=await import('node:fs');
  const fixture=join(dir,'versioned-copy.sqlite');
  copyFileSync(new URL('../data/consultoria.sqlite',import.meta.url),fixture);
  const copy=new Database(fixture);copy.pragma('foreign_keys=ON');
  const before=(copy.prepare('SELECT count(*) AS n FROM action_plan_tasks').get() as {n:number}).n;
  const { migrateActionPlanMonitoring }=await import('../src/database/monitoring-migration');
  migrateActionPlanMonitoring(copy);migrateActionPlanMonitoring(copy);
  assert.equal((copy.prepare('SELECT count(*) AS n FROM action_plan_tasks').get() as {n:number}).n,before);
  assert.deepEqual(copy.pragma('foreign_key_check'),[]);copy.close();
});
test('research generation preserves pillar priorities and deadlines and is idempotent',async()=>{
  db.prepare(`INSERT INTO diagnosis_submissions(id,company_id,user_id,submission_type,questionnaire_id,status,critical_points,recommendations,pillar_scores,created_at,updated_at)
    VALUES('A-research','A','A-owner','RESEARCH','q','COMPLETED',?,?,?, ?,?)`).run(JSON.stringify(['financial gargalo']),JSON.stringify(['financial rotina']),JSON.stringify([{pillar:'financial',score:20,answersCount:1,maturity:'critical'}]),now,now);
  const endpoint='/research/submissions/A-research/generate-action-plan';
  let r=await request(endpoint,'A-owner','POST',{});assert.equal(r.status,200);
  const first=r.data;assert.equal(first.alreadyGenerated,false);assert.ok(first.planId);assert.ok(first.createdCount>0);
  assert.ok(first.tasks.some((task:{priority:string;pillar:string})=>task.priority==='CRITICA'&&task.pillar==='financial'));
  assert.ok(first.tasks.every((task:{dueDate:string;source:string})=>task.dueDate&&task.source==='RESEARCH_RECOMMENDATION'));
  r=await request(endpoint,'A-owner','POST',{});assert.equal(r.status,200);assert.equal(r.data.alreadyGenerated,true);assert.equal(r.data.createdCount,0);assert.equal(r.data.planId,first.planId);assert.equal(r.data.tasks.length,first.tasks.length);
  assert.equal((await request(endpoint,'A-employee','POST',{})).status,403);
  assert.equal((await request(endpoint,'B-owner','POST',{})).status,403);
});
