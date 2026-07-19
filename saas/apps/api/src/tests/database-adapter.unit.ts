import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';
process.env.ENABLE_DEMO_SEED = 'false';
process.env.JWT_SECRET = 'consultoria-database-adapter-unit-secret';
delete process.env.DATABASE_URL;

const { postgresParameters, toPostgresSql } = await import('../database/data-source');

const positional = postgresParameters(
  'SELECT * FROM users WHERE company_id = ? AND status = ?',
  ['company-a', 'ACTIVE'],
);
assert.equal(
  positional.text,
  'SELECT * FROM users WHERE company_id = $1 AND status = $2',
);
assert.deepEqual(positional.values, ['company-a', 'ACTIVE']);

const named = postgresParameters(
  'UPDATE users SET status = @status WHERE id = @id OR company_id = @id',
  { status: 'ACTIVE', id: 'user-a' },
);
assert.equal(
  named.text,
  'UPDATE users SET status = $1 WHERE id = $2 OR company_id = $2',
);
assert.deepEqual(named.values, ['ACTIVE', 'user-a']);

assert.throws(
  () => postgresParameters('SELECT * FROM users WHERE id = ?', []),
  /DATABASE_PARAMETER_COUNT_MISMATCH/,
);
assert.throws(
  () => postgresParameters('SELECT * FROM users WHERE id = @id', {}),
  /DATABASE_PARAMETER_MISSING:id/,
);

assert.match(
  toPostgresSql(
    'INSERT OR IGNORE INTO company_subscriptions (id) VALUES (@id);',
  ),
  /INSERT INTO company_subscriptions[\s\S]+ON CONFLICT DO NOTHING$/,
);
assert.equal(
  toPostgresSql("date(due_date) < date('now')"),
  '(due_date)::date < CURRENT_DATE',
);
assert.equal(
  toPostgresSql(
    "date(due_date) BETWEEN date('now') AND date('now', '+7 days')",
  ),
  "(due_date)::date BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '7 days')::date",
);
assert.equal(
  toPostgresSql("julianday(due_date) < julianday('now')"),
  '(due_date)::timestamptz < NOW()',
);
assert.equal(
  toPostgresSql('SELECT COUNT(*) AS usersTotal FROM users'),
  'SELECT COUNT(*) AS "usersTotal" FROM users',
);

console.log(JSON.stringify({
  ok: true,
  positionalPlaceholders: true,
  namedPlaceholders: true,
  sqliteDialectTranslation: true,
}));
