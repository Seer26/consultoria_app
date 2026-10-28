import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

const dir=mkdtempSync(join(tmpdir(),'people-development-migration-'));
process.env.DATABASE_PATH=join(dir,'phase1.sqlite');
process.env.JWT_SECRET='people-development-migration-test-secret-32';
const { initDatabase }=await import('../src/database/init');
const { database }=await import('../src/db/database');
test('migration 013 creates job-fit tables on a new database and keeps phase 2A tables',async()=>{
  await initDatabase();
  const tables=database.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as Array<{name:string}>;
  for(const name of ['companies','users','action_plans','action_plan_tasks','job_roles','assessment_cycles','behavioral_questions','competencies','job_profile_versions','job_profile_requirements','job_fit_analyses']) assert.ok(tables.some(t=>t.name===name),name);
  assert.equal((database.prepare('SELECT count(*) AS total FROM behavioral_questions').get() as {total:number}).total,20);
  assert.equal((database.prepare('SELECT count(*) AS total FROM competencies WHERE is_default=1').get() as {total:number}).total,18);
  assert.equal((database.prepare("SELECT count(*) AS total FROM schema_migrations WHERE version='012_people_development_phase2a'").get() as {total:number}).total,1);
  assert.equal((database.prepare("SELECT count(*) AS total FROM schema_migrations WHERE version='013_job_fit_phase2b'").get() as {total:number}).total,1);
});
test('migration 013 upgrades a phase-2A-shaped database with existing data',async()=>{
  const company=database.prepare('SELECT id FROM companies LIMIT 1').get() as {id:string};
  const at=new Date().toISOString();
  database.prepare('INSERT INTO job_roles(id,company_id,name,description,active,created_at,updated_at) VALUES(?,?,?,?,?,?,?)').run('migration-job',company.id,'Cargo preservado',null,1,at,at);
  database.exec("DROP TABLE job_fit_analyses; DROP TABLE job_profile_requirements; DROP TABLE job_profile_versions; DELETE FROM schema_migrations WHERE version='013_job_fit_phase2b';");
  await initDatabase();
  assert.equal((database.prepare("SELECT count(*) AS total FROM schema_migrations WHERE version='013_job_fit_phase2b'").get() as {total:number}).total,1);
  assert.equal((database.prepare('SELECT name FROM job_roles WHERE id=?').get('migration-job') as {name:string}).name,'Cargo preservado');
  assert.ok(database.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='job_fit_analyses'").get());
});
test.after(()=>{database.close();rmSync(dir,{recursive:true,force:true});});
