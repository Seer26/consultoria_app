import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import jwt from 'jsonwebtoken';

const dir = mkdtempSync(join(tmpdir(), 'people-development-security-'));
process.env.DATABASE_PATH = join(dir, 'test.sqlite');
process.env.JWT_SECRET = 'people-development-security-test-secret-32';

const { app } = await import('../src/app');
const { initDatabase } = await import('../src/database/init');
const { database: db } = await import('../src/db/database');

let base = '';
let server: ReturnType<typeof app.listen>;
let jobA = '';
let behaviorA = '';
let competencyA = '';
let competencyCycleA = '';
let analysisA = '';
const employeeA = 'A-employee';
const employeeAOther = 'A-employee-other';

const token = (id: string) => jwt.sign({ userId: id, companyId: 'forged', role: 'OWNER' }, process.env.JWT_SECRET!);
async function request(path: string, actor: string, method = 'GET', body?: unknown) {
  const response = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token(actor)}` },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, data: await response.json().catch(() => null) };
}

before(async () => {
  await initDatabase();
  const now = new Date().toISOString();
  for (const company of ['A', 'B']) {
    db.prepare("INSERT INTO companies(id,name,slug,status,created_at,updated_at) VALUES(?,?,?,'ACTIVE',?,?)")
      .run(company, `Tenant ${company}`, company, now, now);
    for (const [role, suffix] of [['ADMIN', 'admin'], ['EMPLOYEE', 'employee'], ['EMPLOYEE', 'employee-other']] as const) {
      db.prepare(`INSERT INTO users(id,name,email,password_hash,role,company_id,status,created_at,updated_at)
        VALUES(?,?,?,(SELECT password_hash FROM users LIMIT 1),?,?,'ACTIVE',?,?)`)
        .run(`${company}-${suffix}`, `${company} ${suffix}`, `${company}-${suffix}@test.local`, role, company, now, now);
    }
  }
  server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  base = `http://127.0.0.1:${address.port}`;

  const job = await request('/people-development/jobs', 'A-admin', 'POST', { name: 'Cargo privado A' });
  assert.equal(job.status, 201);
  jobA = job.data.id;
  assert.equal((await request(`/people-development/jobs/${jobA}/assign`, 'A-admin', 'POST', { employeeId: employeeA })).status, 201);

  const behavioral = await request('/people-development/behavioral/cycles', 'A-admin', 'POST', { employeeId: employeeA, type: 'GESTOR' });
  assert.equal(behavioral.status, 201);
  behaviorA = behavioral.data.id;
  const questions = await request('/people-development/behavioral/questions', 'A-admin');
  for (const question of questions.data) {
    assert.equal((await request(`/people-development/behavioral/cycles/${behaviorA}/answers/${question.id}`, 'A-admin', 'PUT', { value: 4 })).status, 204);
  }
  assert.equal((await request(`/people-development/behavioral/cycles/${behaviorA}/finalize`, 'A-admin', 'POST')).status, 200);

  const competency = await request('/people-development/competencies', 'A-admin', 'POST', { name: 'Competência privada A', category: 'TECNICA' });
  assert.equal(competency.status, 201);
  competencyA = competency.data.id;
  const cycle = await request('/people-development/competency/cycles', 'A-admin', 'POST', { employeeId: employeeA, type: 'GESTOR' });
  assert.equal(cycle.status, 201);
  competencyCycleA = cycle.data.id;
  assert.equal((await request(`/people-development/competency/cycles/${competencyCycleA}/items/${competencyA}`, 'A-admin', 'PUT', { score: 4 })).status, 204);
  assert.equal((await request(`/people-development/competency/cycles/${competencyCycleA}/finalize`, 'A-admin', 'POST')).status, 200);
  const profile = await request(`/people-development/jobs/${jobA}/profile/versions`, 'A-admin', 'POST', { behavior:{EXECUTOR:70,COMUNICADOR:80,PLANEJADOR:60,ANALITICO:65}, behavioralWeight:40, competencyWeight:60, requirements:[{competencyId:competencyA,expectedLevel:4,weight:2}] });
  assert.equal(profile.status, 201);
  const analysis = await request(`/people-development/employees/${employeeA}/job-fit/analyses`, 'A-admin', 'POST');
  assert.equal(analysis.status, 201); analysisA = analysis.data.id;
});

test('tenant B cannot list employee A', async () => {
  const result = await request('/people-development/employees', 'B-admin');
  assert.equal(result.status, 200);
  assert.ok(!result.data.some((employee: { id: string }) => employee.id === employeeA));
});

test('tenant B cannot list job role A', async () => {
  const result = await request('/people-development/jobs', 'B-admin');
  assert.equal(result.status, 200);
  assert.ok(!result.data.some((job: { id: string }) => job.id === jobA));
});

test('tenant B cannot edit job role A', async () => assert.equal((await request(`/people-development/jobs/${jobA}`, 'B-admin', 'PATCH', { name: 'Invadido' })).status, 404));
test('tenant B cannot assign employee A to job role A', async () => assert.equal((await request(`/people-development/jobs/${jobA}/assign`, 'B-admin', 'POST', { employeeId: employeeA })).status, 404));
test('tenant B cannot start behavioral assessment for employee A', async () => assert.equal((await request('/people-development/behavioral/cycles', 'B-admin', 'POST', { employeeId: employeeA, type: 'GESTOR' })).status, 400));
test('tenant B cannot answer behavioral assessment A', async () => assert.equal((await request(`/people-development/behavioral/cycles/${behaviorA}/answers/no-question`, 'B-admin', 'PUT', { value: 4 })).status, 404));
test('tenant B cannot finalize behavioral assessment A', async () => assert.equal((await request(`/people-development/behavioral/cycles/${behaviorA}/finalize`, 'B-admin', 'POST')).status, 404));
test('tenant B cannot read behavioral result A', async () => assert.equal((await request(`/people-development/behavioral/cycles/${behaviorA}/result`, 'B-admin')).status, 404));
test('tenant B cannot read behavioral history A', async () => {
  const result = await request(`/people-development/behavioral/history/${employeeA}`, 'B-admin');
  assert.equal(result.status, 404);
});
test('tenant B cannot access private competency A', async () => {
  const result = await request('/people-development/competencies', 'B-admin');
  assert.equal(result.status, 200); assert.ok(!result.data.some((item: { id: string }) => item.id === competencyA));
});
test('tenant B cannot edit private competency A', async () => assert.equal((await request(`/people-development/competencies/${competencyA}`, 'B-admin', 'PATCH', { name: 'Invadida' })).status, 404));
test('tenant B cannot start competency assessment for employee A', async () => assert.equal((await request('/people-development/competency/cycles', 'B-admin', 'POST', { employeeId: employeeA, type: 'GESTOR' })).status, 400));
test('tenant B cannot change competency item A', async () => assert.equal((await request(`/people-development/competency/cycles/${competencyCycleA}/items/${competencyA}`, 'B-admin', 'PUT', { score: 5 })).status, 404));
test('tenant B cannot finalize competency cycle A', async () => assert.equal((await request(`/people-development/competency/cycles/${competencyCycleA}/finalize`, 'B-admin', 'POST')).status, 404));
test('tenant B cannot read competency result A', async () => assert.equal((await request(`/people-development/competency/cycles/${competencyCycleA}/result`, 'B-admin')).status, 404));
test('tenant B cannot read competency history A', async () => {
  const result = await request(`/people-development/competency/history/${employeeA}`, 'B-admin');
  assert.equal(result.status, 404);
});

test('employee cannot create a job role', async () => assert.equal((await request('/people-development/jobs', employeeA, 'POST', { name: 'Sem poder' })).status, 403));
test('employee cannot edit a job role', async () => assert.equal((await request(`/people-development/jobs/${jobA}`, employeeA, 'PATCH', { name: 'Sem poder' })).status, 403));
test('employee cannot assign job role to another employee', async () => assert.equal((await request(`/people-development/jobs/${jobA}/assign`, employeeA, 'POST', { employeeId: employeeAOther })).status, 403));
test('employee cannot create private competency', async () => assert.equal((await request('/people-development/competencies', employeeA, 'POST', { name: 'Sem poder', category: 'TECNICA' })).status, 403));
test('employee cannot edit private competency', async () => assert.equal((await request(`/people-development/competencies/${competencyA}`, employeeA, 'PATCH', { name: 'Sem poder' })).status, 403));
test('employee cannot access another employee private behavioral assessment', async () => assert.equal((await request(`/people-development/behavioral/cycles/${behaviorA}/result`, employeeAOther)).status, 403));
test('employee cannot alter another employee behavioral assessment', async () => assert.equal((await request(`/people-development/behavioral/cycles/${behaviorA}/answers/no-question`, employeeAOther, 'PUT', { value: 4 })).status, 403));
test('employee cannot access another employee private behavioral history', async () => {
  const result = await request(`/people-development/behavioral/history/${employeeA}`, employeeAOther);
  assert.equal(result.status, 403);
});

test('tenant B cannot read or version job profile A', async () => {
  assert.equal((await request(`/people-development/jobs/${jobA}/profile`, 'B-admin')).status, 404);
  assert.equal((await request(`/people-development/jobs/${jobA}/profile/versions`, 'B-admin', 'POST', { behavior:{EXECUTOR:0,COMUNICADOR:0,PLANEJADOR:0,ANALITICO:0},behavioralWeight:50,competencyWeight:50,requirements:[] })).status, 404);
});
test('tenant B cannot access or calculate analysis A', async () => {
  assert.equal((await request(`/people-development/employees/${employeeA}/job-fit/analyses`, 'B-admin')).status, 404);
  assert.equal((await request(`/people-development/employees/${employeeA}/job-fit/analyses`, 'B-admin', 'POST')).status, 404);
  assert.equal((await request(`/people-development/employees/${employeeA}/job-fit/analyses/${analysisA}`, 'B-admin')).status, 404);
});
test('employee cannot configure profile or calculate another employee job fit', async () => {
  assert.equal((await request(`/people-development/jobs/${jobA}/profile/versions`, employeeA, 'POST', { behavior:{EXECUTOR:0,COMUNICADOR:0,PLANEJADOR:0,ANALITICO:0},behavioralWeight:50,competencyWeight:50,requirements:[] })).status, 403);
  assert.equal((await request(`/people-development/employees/${employeeAOther}/job-fit/analyses`, employeeA, 'POST')).status, 403);
});

test('job-fit snapshot persists immutable links, scores, classification, gaps and strengths', async () => {
  const snapshot = await request(`/people-development/employees/${employeeA}/job-fit/analyses/${analysisA}`, 'A-admin');
  assert.equal(snapshot.status, 200);
  assert.equal(snapshot.data.employee_id, employeeA);
  assert.equal(snapshot.data.job_role_id, jobA);
  assert.ok(snapshot.data.profile_version_id);
  assert.equal(snapshot.data.behavioral_cycle_id, behaviorA);
  assert.equal(snapshot.data.competency_cycle_id, competencyCycleA);
  const result = JSON.parse(snapshot.data.snapshot_json);
  assert.equal(result.overallScore, snapshot.data.overall_score);
  assert.equal(result.behavioralScore, snapshot.data.behavioral_score);
  assert.equal(result.competencyScore, snapshot.data.competency_score);
  assert.equal(result.classification, snapshot.data.classification);
  assert.ok(Array.isArray(result.gaps));
  assert.ok(Array.isArray(result.strengths));
});

test('job-fit dashboard aggregates only the latest analysis per employee and remains tenant-safe', async () => {
  const secondProfile = await request(`/people-development/jobs/${jobA}/profile/versions`, 'A-admin', 'POST', {
    behavior:{EXECUTOR:70,COMUNICADOR:80,PLANEJADOR:60,ANALITICO:65},
    behavioralWeight:40,
    competencyWeight:60,
    requirements:[{competencyId:competencyA,expectedLevel:5,weight:2}],
  });
  assert.equal(secondProfile.status, 201);
  assert.equal((await request(`/people-development/employees/${employeeA}/job-fit/analyses`, 'A-admin', 'POST')).status, 201);
  const versions = await request(`/people-development/jobs/${jobA}/profile/versions`, 'A-admin');
  assert.equal(versions.status, 200);
  assert.equal(versions.data[0].status, 'ACTIVE');
  assert.equal(versions.data[0].version_number, 2);
  assert.equal(versions.data[1].status, 'SUPERSEDED');
  const historical = await request(`/people-development/jobs/${jobA}/profile/versions/${versions.data[1].id}`, 'A-admin');
  assert.equal(historical.status, 200);
  assert.equal(historical.data.version_number, 1);

  const dashboard = await request('/people-development/job-fit/dashboard', 'A-admin');
  assert.equal(dashboard.status, 200);
  assert.equal(dashboard.data.totalEmployees, 2);
  assert.equal(dashboard.data.analyzedEmployees, 1);
  assert.equal(dashboard.data.insufficientDataEmployees, 1);
  assert.equal(dashboard.data.classificationDistribution.reduce((total: number, item: { count: number }) => total + item.count, 0), 1);
  assert.equal(dashboard.data.jobCoverage.total, 1);
  assert.equal(dashboard.data.jobCoverage.withActiveProfile, 1);
  assert.equal(dashboard.data.jobCoverage.withoutActiveProfile, 0);
  const latest = db.prepare('SELECT overall_score FROM job_fit_analyses WHERE company_id=? AND employee_id=? ORDER BY created_at DESC, rowid DESC LIMIT 1').get('A', employeeA) as { overall_score:number };
  assert.equal(dashboard.data.averageFit, latest.overall_score);

  const tenantB = await request('/people-development/job-fit/dashboard', 'B-admin');
  assert.equal(tenantB.status, 200);
  assert.deepEqual(tenantB.data, { totalEmployees:2, analyzedEmployees:0, insufficientDataEmployees:2, averageFit:null, classificationDistribution:[], jobCoverage:{total:0,withActiveProfile:0,withoutActiveProfile:0}, frequentGaps:[] });
  assert.equal((await request('/people-development/job-fit/dashboard', employeeA)).status, 403);
});

after(async () => {
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  db.close();
  rmSync(dir, { recursive: true, force: true });
});
