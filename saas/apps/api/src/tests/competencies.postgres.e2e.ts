import assert from 'node:assert/strict';
import http from 'node:http';

import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { Client } from 'pg';

import type { AdminCompetencyAssessmentDto, Competency, CompetencyAssessment, CompetencyItem } from '../modules/competencies/competencies.types';

// Real HTTP + PostgreSQL: missing route guards, tenant predicates, header locks or
// snapshot preservation must change a response or persisted row and fail this test.
dotenv.config({ path: '.env.local', quiet: true });
const source = process.env.DATABASE_URL?.trim();
assert(source, 'COMPETENCIES_HTTP_TEST_REQUIRES_LOCAL_POSTGRES');
const sourceUrl = new URL(source);
assert(['localhost', '127.0.0.1', '[::1]'].includes(sourceUrl.hostname)
  && sourceUrl.pathname === '/consultoria_local', 'COMPETENCIES_HTTP_TEST_REQUIRES_LOCAL_POSTGRES');
const database = `consultoria_competencies_http_${process.pid}_${Date.now()}_test`;
assert(/^consultoria_competencies_http_\d+_\d+_test$/.test(database));
function databaseUrl(name: string): string {
  const url = new URL(sourceUrl);
  url.pathname = `/${name}`;
  return url.toString();
}
const secret = 'competencies-http-test-signing-key-only';
Object.assign(process.env, {
  NODE_ENV: 'test', APP_ENV: 'test', DATABASE_URL: databaseUrl(database),
  JWT_SECRET: secret, REQUIRE_LEGAL_ACCEPTANCE: 'false', ENABLE_DEMO_SEED: 'false',
});

type Reply<T> = { status: number; body: T };
type Route = [method: string, pathname: string, body?: unknown];
const administrator = new Client({ connectionString: databaseUrl('postgres') });
let created = false;
let server: http.Server | undefined;
let client: Client | undefined;
let closeSource: (() => Promise<void>) | undefined;
let calls = 0;
await administrator.connect();
try {
  await administrator.query(`CREATE DATABASE "${database}"`);
  created = true;
  const { runPostgresMigrations } = await import('../database/migrate');
  await runPostgresMigrations();
  client = new Client({ connectionString: databaseUrl(database) });
  await client.connect();
  await client.query(`INSERT INTO companies (id, name, slug, created_at, updated_at)
    VALUES ('a', 'Company A', 'competencies-http-a', NOW()::text, NOW()::text),
           ('b', 'Company B', 'competencies-http-b', NOW()::text, NOW()::text)`);
  const actors = [
    ['admin-a', 'ADMIN', null], ['admin-b', 'ADMIN', null],
    ['owner-a', 'OWNER', 'a'], ['employee-a', 'EMPLOYEE', 'a'],
    ['owner-b', 'OWNER', 'b'], ['employee-b', 'EMPLOYEE', 'b'],
    ['race-a', 'EMPLOYEE', 'a'], ['catalog-race-a', 'EMPLOYEE', 'a'],
  ] as const;
  const tokens = new Map<string, string>();
  for (const [id, role, companyId] of actors) {
    await client.query(`INSERT INTO users (id, name, email, password_hash, role, company_id, status, created_at, updated_at)
      VALUES ($1, $1, $2, 'unused-test-hash', $3, $4, 'ACTIVE', NOW()::text, NOW()::text)`, [id, `${id}@example.invalid`, role, companyId]);
    tokens.set(id, jwt.sign({ userId: id, role, companyId, authVersion: 0 }, secret));
  }
  const { app } = await import('../app');
  const { dataSource } = await import('../database/data-source');
  closeSource = () => dataSource.close();
  server = http.createServer(app);
  await new Promise<void>((resolve) => server!.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}`;
  async function request<T = Record<string, unknown>>(route: Route, actor: string | null = 'admin-a'): Promise<Reply<T>> {
    const [method, pathname, body] = route;
    const response = await fetch(`${base}${pathname}`, {
      method,
      headers: { ...(actor ? { Authorization: `Bearer ${tokens.get(actor)}` } : {}),
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });
    calls++;
    return { status: response.status, body: await response.json() as T };
  }
  async function ok<T = Record<string, unknown>>(route: Route, status = 200, actor = 'admin-a'): Promise<T> {
    const reply = await request<T>(route, actor);
    assert.equal(reply.status, status, `${route[0]} ${route[1]}: ${JSON.stringify(reply.body)}`);
    return reply.body;
  }
  async function denied(route: Route, statuses: number[] = [403, 404], actor = 'admin-a'): Promise<void> {
    const reply = await request(route, actor);
    assert(statuses.includes(reply.status), `${route[0]} ${route[1]} expected ${statuses}, got ${reply.status}: ${JSON.stringify(reply.body)}`);
    assert.deepEqual(Object.keys(reply.body), ['error'], 'Denied response must not leak technical DTOs');
  }
  const catalogA = await ok<Competency[]>(['GET', '/companies/a/competencies']);
  assert.equal(catalogA.length, 12);
  assert(catalogA.every(c => c.scope === 'SYSTEM' && c.companyId === null && c.status === 'ACTIVE'));
  const catalogB = await ok<Competency[]>(['GET', '/companies/b/competencies?status=ACTIVE'], 200, 'admin-b');
  assert.deepEqual(catalogB, catalogA);
  const system = catalogA[0].id;
  const system2 = catalogA[1].id;
  const create = (company: string, name: string): Route => ['POST', `/companies/${company}/competencies`, { name, description: `${name} description`, category: 'Original category' }];
  const privateA = await ok<Competency>(create('a', 'Private A'), 201);
  const privateB = await ok<Competency>(create('b', 'Private B'), 201, 'admin-b');
  assert.equal(privateA.companyId, 'a');
  assert.equal(privateA.scope, 'COMPANY');
  assert(!(await ok<Competency[]>(['GET', '/companies/a/competencies'])).some(c => c.id === privateB.id));
  assert(!(await ok<Competency[]>(['GET', '/companies/b/competencies'], 200, 'admin-b')).some(c => c.id === privateA.id));
  await denied(create('a', '  PRIVATE A  '), [409]);
  const start = (company: string, user: string): Route => ['POST', `/companies/${company}/users/${user}/competency-assessments/current`];
  const draft = await ok<CompetencyAssessment>(start('a', 'employee-a'), 201);
  const draftB = await ok<CompetencyAssessment>(start('b', 'employee-b'), 201, 'admin-b');
  const ownerDraftA = await ok<CompetencyAssessment>(start('a', 'owner-a'), 201);
  const ownerDraftB = await ok<CompetencyAssessment>(start('b', 'owner-b'), 201, 'admin-b');
  assert.equal((await ok<CompetencyAssessment>(start('a', 'employee-a'), 201, 'admin-b')).id, draft.id);
  assert.equal(draft.startedByUserId, 'admin-a');
  const assessmentPath = (company: string, id: string) => `/companies/${company}/competency-assessments/${id}`;
  const itemPath = (company: string, id: string, competency: string) => `${assessmentPath(company, id)}/items/${competency}`;
  const rated = { evidenceStatus: 'RATED', level: 4, observation: 'Technical evidence' };
  const unobserved = { evidenceStatus: 'NOT_OBSERVED', level: null, observation: 'Insufficient evidence' };
  function routes(company: string, subject: string, id: string, competency: string): Route[] {
    return [
      ['GET', `/companies/${company}/competencies`], create(company, 'Unauthorized private'),
      ['PATCH', `/companies/${company}/competencies/${competency}`, { name: 'Unauthorized edit' }],
      ['POST', `/companies/${company}/competencies/${competency}/deactivate`], start(company, subject),
      ['GET', `/companies/${company}/competency-assessments?userId=${subject}&status=IN_PROGRESS`],
      ['GET', assessmentPath(company, id)], ['PUT', itemPath(company, id, competency), rated],
      ['DELETE', itemPath(company, id, competency)], ['POST', `${assessmentPath(company, id)}/complete`],
      ['GET', `${assessmentPath(company, id)}/result`],
      ['GET', `/companies/${company}/users/${subject}/competency-assessments/history`],
    ];
  }
  // Every technical endpoint: no token, own IDs, another person's IDs and another tenant.
  for (const route of routes('a', 'employee-a', draft.id, privateA.id)) {
    const unauthenticated = await request(route, null);
    assert.equal(unauthenticated.status, 401, `${route[0]} ${route[1]} without token`);
    assert.deepEqual(unauthenticated.body, { error: 'TOKEN_REQUIRED' });
  }
  for (const actor of ['owner-a', 'employee-a', 'owner-b', 'employee-b']) {
    const company = actor.endsWith('-a') ? 'a' : 'b';
    const ownId = actor === 'owner-a' ? ownerDraftA.id : actor === 'owner-b' ? ownerDraftB.id : company === 'a' ? draft.id : draftB.id;
    const ownCompetency = company === 'a' ? privateA.id : privateB.id;
    for (const route of [
      ...routes(company, actor, ownId, ownCompetency),
      ...routes('a', 'employee-a', draft.id, privateA.id),
      ...routes('b', 'employee-b', draftB.id, privateB.id),
    ]) await denied(route, [403], actor);
  }
  // A global ADMIN may select A or B, but resource IDs cannot override that selection.
  for (const route of routes('missing-company', 'employee-a', draft.id, privateA.id)) await denied(route, [404]);
  await denied(start('a', 'employee-b'));
  await denied(start('b', 'employee-a'), [403, 404], 'admin-b');
  for (const [company, foreignId, foreignCompetency, localId] of [
    ['a', draftB.id, privateB.id, draft.id], ['b', draft.id, privateA.id, draftB.id],
  ]) {
    const actor = company === 'a' ? 'admin-a' : 'admin-b';
    for (const route of [
      ['GET', assessmentPath(company, foreignId)], ['GET', `${assessmentPath(company, foreignId)}/result`],
      ['POST', `${assessmentPath(company, foreignId)}/complete`],
      ['PUT', itemPath(company, foreignId, system), rated], ['DELETE', itemPath(company, foreignId, system)],
      ['PUT', itemPath(company, localId, foreignCompetency), rated], ['DELETE', itemPath(company, localId, foreignCompetency)],
      ['PATCH', `/companies/${company}/competencies/${foreignCompetency}`, { name: 'Crossed' }],
      ['POST', `/companies/${company}/competencies/${foreignCompetency}/deactivate`],
    ] as Route[]) await denied(route, [403, 404], actor);
  }
  // A subject filter requires current membership or persisted history in that company.
  await denied(['GET', '/companies/a/competency-assessments?userId=employee-b'], [404]);
  await denied(['GET', '/companies/a/users/employee-b/competency-assessments/history'], [404]);
  await denied(['GET', '/companies/b/users/employee-a/competency-assessments/history'], [404], 'admin-b');
  await denied(['GET', '/companies/a/competency-assessments?userId=missing'], [404]);
  await denied(['GET', '/companies/a/users/missing/competency-assessments/history'], [404]);
  assert.deepEqual(await ok(['GET', '/companies/a/users/catalog-race-a/competency-assessments/history']), []);
  await denied(['PATCH', `/companies/a/competencies/${system}`, { name: 'System edit' }], [403]);
  await denied(['POST', `/companies/a/competencies/${system}/deactivate`], [403]);
  await denied(['GET', assessmentPath('a', 'missing')], [404]);
  await denied(['PUT', itemPath('a', draft.id, 'missing'), rated], [404]);
  await denied(start('a', 'missing'), [404]);
  // Invalid HTTP shapes and evidence cannot be coerced into a valid rating.
  for (const query of ['status=OTHER', 'status=ACTIVE&status=INACTIVE', 'status[x]=ACTIVE', 'status='])
    await denied(['GET', `/companies/a/competencies?${query}`], [400]);
  for (const query of ['status=OTHER', 'userId=', 'userId=employee-a&userId=employee-b', 'status[x]=COMPLETED'])
    await denied(['GET', `/companies/a/competency-assessments?${query}`], [400]);
  for (const body of [[], {}, { name: ' ' }, { name: 'X', description: 'Y', companyId: 'b' }, { name: 'X', description: 'Y', scope: 'SYSTEM' }])
    await denied(['POST', '/companies/a/competencies', body], [400]);
  for (const body of [[], {}, { evidenceStatus: 'RATED', level: null }, { evidenceStatus: 'RATED', level: 0 },
    { evidenceStatus: 'RATED', level: 6 }, { evidenceStatus: 'RATED', level: 2.5 }, { evidenceStatus: 'RATED', level: '3' },
    { evidenceStatus: 'NOT_OBSERVED', level: 0 }, { evidenceStatus: 'NOT_OBSERVED', level: 3 },
    { ...rated, observation: {} }, { ...rated, companyId: 'b' }, { ...rated, userId: 'employee-b' }, { ...rated, assessmentId: draftB.id }])
    await denied(['PUT', itemPath('a', draft.id, system), body], [400]);
  await denied(['POST', `${assessmentPath('a', draft.id)}/complete`], [400]);
  assert.equal((await ok<AdminCompetencyAssessmentDto>(['GET', assessmentPath('a', draft.id)])).assessment.status, 'IN_PROGRESS');
  assert.equal((await ok<AdminCompetencyAssessmentDto>(['GET', assessmentPath('a', draft.id)])).assessment.completedAt, null);
  const first = await ok<CompetencyItem>(['PUT', itemPath('a', draft.id, privateA.id), rated]);
  await ok(['PUT', itemPath('a', draft.id, system), unobserved]);
  await ok(['PUT', itemPath('b', draftB.id, system), rated], 200, 'admin-b');
  await ok(['PUT', itemPath('a', draft.id, system2), rated]);
  await ok(['DELETE', itemPath('a', draft.id, system2)]);
  assert.equal((await ok<AdminCompetencyAssessmentDto>(['GET', assessmentPath('a', draft.id)])).items.length, 2);
  // Catalog mutation during the draft must not recapture the first item snapshot.
  await ok(['PATCH', `/companies/a/competencies/${privateA.id}`, { name: 'Private A changed', description: 'Changed', category: 'Changed category' }]);
  await ok(['POST', `/companies/a/competencies/${privateA.id}/deactivate`]);
  assert(!(await ok<Competency[]>(['GET', '/companies/a/competencies'])).some(c => c.id === privateA.id));
  assert((await ok<Competency[]>(['GET', '/companies/a/competencies?status=INACTIVE'])).some(c => c.id === privateA.id));
  const updated = await ok<CompetencyItem>(['PUT', itemPath('a', draft.id, privateA.id), { ...rated, level: 5, observation: 'Updated evidence' }], 200, 'admin-b');
  assert.equal(updated.competencyNameSnapshot, 'Private A');
  assert.equal(updated.competencyDescriptionSnapshot, 'Private A description');
  assert.equal(updated.competencyCategorySnapshot, 'Original category');
  assert.equal(updated.createdAt, first.createdAt);
  await denied(['PUT', itemPath('a', ownerDraftA.id, privateA.id), rated], [409]);
  await ok(['DELETE', itemPath('a', draft.id, privateA.id)]);
  await denied(['PUT', itemPath('a', draft.id, privateA.id), rated], [409]);
  // Put the rated item back using another active competency; existing inactive items are tested above.
  const historical = await ok<Competency>(create('a', 'Historical private'), 201);
  await ok(['PUT', itemPath('a', draft.id, historical.id), rated]);
  await ok(['PATCH', `/companies/a/competencies/${historical.id}`, { name: 'Historical changed' }]);
  await ok(['POST', `/companies/a/competencies/${historical.id}/deactivate`]);
  await client.query("UPDATE users SET name = 'Renamed before complete' WHERE id IN ('employee-a', 'admin-a')");
  const completion = await ok<{ id: string; status: string; completedAt: string }>(['POST', `${assessmentPath('a', draft.id)}/complete`], 200, 'admin-b');
  assert.deepEqual(Object.keys(completion).sort(), ['completedAt', 'id', 'status']);
  assert.equal(completion.status, 'COMPLETED');
  const result = await ok<AdminCompetencyAssessmentDto>(['GET', `${assessmentPath('a', draft.id)}/result`]);
  assert.equal(result.assessment.subjectNameSnapshot, 'employee-a');
  assert.equal(result.assessment.startedByNameSnapshot, 'admin-a');
  assert.equal(result.assessment.completedByNameSnapshot, 'admin-b');
  assert.equal(result.assessment.completedByUserId, 'admin-b');
  assert.equal(result.insufficientEvidence, false);
  assert.equal(result.items.find(i => i.competencyId === historical.id)?.competencyNameSnapshot, 'Historical private');
  assert.equal(result.items.find(i => i.competencyId === historical.id)?.observation, 'Technical evidence');
  assert.equal(result.items.find(i => i.competencyId === system)?.level, null);
  const before = await client.query('SELECT * FROM competency_assessment_items WHERE assessment_id = $1 ORDER BY id', [draft.id]);
  for (const route of [
    ['PUT', itemPath('a', draft.id, system), rated], ['PUT', itemPath('a', draft.id, system2), rated],
    ['DELETE', itemPath('a', draft.id, system)], ['POST', `${assessmentPath('a', draft.id)}/complete`],
  ] as Route[]) await denied(route, [409]);
  assert.deepEqual((await client.query('SELECT * FROM competency_assessment_items WHERE assessment_id = $1 ORDER BY id', [draft.id])).rows, before.rows);
  await client.query("UPDATE users SET name = 'Renamed after complete' WHERE id IN ('employee-a', 'admin-a', 'admin-b')");
  assert.deepEqual(await ok(['GET', `${assessmentPath('a', draft.id)}/result`]), result);
  const next = await ok<CompetencyAssessment>(start('a', 'employee-a'), 201);
  assert.notEqual(next.id, draft.id);
  await ok(['PUT', itemPath('a', next.id, system), unobserved]);
  await ok(['POST', `${assessmentPath('a', next.id)}/complete`]);
  const insufficient = await ok<AdminCompetencyAssessmentDto>(['GET', `${assessmentPath('a', next.id)}/result`]);
  assert.equal(insufficient.insufficientEvidence, true);
  assert(insufficient.items.every(i => i.evidenceStatus === 'NOT_OBSERVED' && i.level === null));
  assert.deepEqual(Object.keys(insufficient).sort(), ['assessment', 'insufficientEvidence', 'items']);
  const forbiddenMetrics = /^(average|mean|score|gap|ranking|performanceConclusion|chart)$/i;
  function noMetrics(value: unknown): void {
    if (!value || typeof value !== 'object') return;
    for (const [key, nested] of Object.entries(value)) { assert(!forbiddenMetrics.test(key)); noMetrics(nested); }
  }
  noMetrics(insufficient);
  const history = await ok<AdminCompetencyAssessmentDto[]>(['GET', '/companies/a/users/employee-a/competency-assessments/history']);
  assert.deepEqual(new Set(history.map(h => h.assessment.id)), new Set([draft.id, next.id]));
  assert.deepEqual(history.find(h => h.assessment.id === draft.id), result);
  const filtered = await ok<CompetencyAssessment[]>(['GET', '/companies/a/competency-assessments?userId=employee-a&status=COMPLETED']);
  assert.equal(filtered.length, 2);
  assert(filtered.every(a => a.companyId === 'a' && a.subjectUserId === 'employee-a' && a.status === 'COMPLETED'));
  // Persisted company authorizes history even after transfer; new writes still require current membership.
  await client.query("UPDATE users SET company_id = 'b' WHERE id = 'employee-a'");
  assert.deepEqual(await ok(['GET', `${assessmentPath('a', draft.id)}/result`]), result);
  assert.deepEqual(await ok(['GET', '/companies/a/users/employee-a/competency-assessments/history']), history);
  assert.deepEqual(await ok(['GET', '/companies/a/competency-assessments?userId=employee-a&status=COMPLETED']), filtered);
  assert.deepEqual(await ok(['GET', '/companies/b/users/employee-a/competency-assessments/history']), []);
  await denied(start('a', 'employee-a'));
  await client.query("UPDATE users SET company_id = 'b' WHERE id = 'owner-a'");
  await denied(['PUT', itemPath('a', ownerDraftA.id, system), rated]);
  await denied(['DELETE', itemPath('a', ownerDraftA.id, system)]);
  await denied(['POST', `${assessmentPath('a', ownerDraftA.id)}/complete`]);
  // Concurrent ADMIN starts converge on the same persisted draft.
  const starts = await Promise.all([ok<CompetencyAssessment>(start('a', 'race-a'), 201), ok<CompetencyAssessment>(start('a', 'race-a'), 201, 'admin-b')]);
  assert.equal(starts[0].id, starts[1].id);
  const race = starts[0].id;
  assert.equal((await client.query("SELECT count(*)::int AS n FROM competency_assessments WHERE company_id = 'a' AND subject_user_id = 'race-a' AND status = 'IN_PROGRESS'")).rows[0].n, 1);
  await ok(['PUT', itemPath('a', race, system), rated]);
  const [saveRace, completeRace] = await Promise.all([
    request<CompetencyItem>(['PUT', itemPath('a', race, system), { ...rated, level: 5 }]),
    request(['POST', `${assessmentPath('a', race)}/complete`], 'admin-b'),
  ]);
  assert.equal(completeRace.status, 200);
  assert([200, 409].includes(saveRace.status));
  const frozenRace = await ok<AdminCompetencyAssessmentDto>(['GET', `${assessmentPath('a', race)}/result`]);
  assert.equal(frozenRace.assessment.status, 'COMPLETED');
  assert.equal(frozenRace.items[0].level, saveRace.status === 200 ? 5 : 4);
  await denied(['PUT', itemPath('a', race, system), rated], [409]);
  assert.deepEqual(await ok(['GET', `${assessmentPath('a', race)}/result`]), frozenRace);
  // Removing the only item and completing cannot produce a completed empty assessment.
  const removeDraft = await ok<CompetencyAssessment>(start('a', 'race-a'), 201);
  await ok(['PUT', itemPath('a', removeDraft.id, system), rated]);
  const [removeRace, finishRemoveRace] = await Promise.all([
    request(['DELETE', itemPath('a', removeDraft.id, system)]),
    request(['POST', `${assessmentPath('a', removeDraft.id)}/complete`], 'admin-b'),
  ]);
  const afterRemove = await ok<AdminCompetencyAssessmentDto>(['GET', assessmentPath('a', removeDraft.id)]);
  if (finishRemoveRace.status === 200) {
    assert.equal(removeRace.status, 409);
    assert.equal(afterRemove.assessment.status, 'COMPLETED');
    assert.equal(afterRemove.items.length, 1);
  } else {
    assert.equal(removeRace.status, 200);
    assert.equal(finishRemoveRace.status, 400);
    assert.equal(afterRemove.assessment.status, 'IN_PROGRESS');
    assert.equal(afterRemove.assessment.completedAt, null);
    assert.equal(afterRemove.items.length, 0);
  }
  // First inclusion races a catalog edit: the snapshot is entirely before or after the edit.
  const catalogDraft = await ok<CompetencyAssessment>(start('a', 'catalog-race-a'), 201);
  const catalogSkill = await ok<Competency>(create('a', 'Catalog concurrent'), 201);
  const [captured] = await Promise.all([
    ok<CompetencyItem>(['PUT', itemPath('a', catalogDraft.id, catalogSkill.id), rated]),
    ok(['PATCH', `/companies/a/competencies/${catalogSkill.id}`, { name: 'Catalog concurrent changed', description: 'Changed together', category: 'Changed together' }], 200, 'admin-b'),
  ]);
  assert([
    ['Catalog concurrent', 'Catalog concurrent description', 'Original category'],
    ['Catalog concurrent changed', 'Changed together', 'Changed together'],
  ].some(tuple => JSON.stringify(tuple) === JSON.stringify([captured.competencyNameSnapshot, captured.competencyDescriptionSnapshot, captured.competencyCategorySnapshot])));
  await ok(['POST', `/companies/a/competencies/${catalogSkill.id}/deactivate`]);
  const stableCapture = await ok<CompetencyItem>(['PUT', itemPath('a', catalogDraft.id, catalogSkill.id), unobserved]);
  assert.equal(stableCapture.competencyNameSnapshot, captured.competencyNameSnapshot);
  assert.equal(stableCapture.competencyDescriptionSnapshot, captured.competencyDescriptionSnapshot);
  assert.equal(stableCapture.competencyCategorySnapshot, captured.competencyCategorySnapshot);
  // Per-route ADMIN middleware must not intercept preexisting OWNER/EMPLOYEE routes.
  await ok(['GET', '/company/settings'], 200, 'owner-b');
  await ok(['GET', '/legal/documents/pending'], 200, 'employee-b');
  console.log(JSON.stringify({ ok: true, provider: 'postgres', temporaryDatabase: true, routes: 12, calls,
    admins: 2, companies: 2, rolesDeniedPerRoute: ['OWNER', 'EMPLOYEE'], unauthenticated: true,
    crossedIds: true, privateCatalog: true, evidenceValidation: true, allNotObserved: true,
    snapshotsAndHistory: true, completedImmutability: true, concurrentStarts: true,
    concurrentSaveComplete: true, concurrentRemoveComplete: true, concurrentCatalogMutation: true,
    membershipAndTransfers: true, existingOwnerEmployeeRoutes: true }));
} finally {
  if (server) {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server!.close(error => error ? reject(error) : resolve()));
  }
  if (client) await client.end();
  if (closeSource) await closeSource();
  if (created) await administrator.query(`DROP DATABASE "${database}"`);
  await administrator.end();
}
