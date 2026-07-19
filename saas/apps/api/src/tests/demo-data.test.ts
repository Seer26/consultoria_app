import fs from 'node:fs';
import path from 'node:path';

import Database from 'better-sqlite3';

import {
  cleanupDemoData,
  DEMO_DATA_IDS,
  readDemoDataConfig,
  seedDemoData,
} from '../database/demo-data';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const databasePath = path.resolve(
  process.cwd(),
  './data/consultoria-demo-data-test.sqlite',
);

async function main(): Promise<void> {
  if (fs.existsSync(databasePath)) fs.rmSync(databasePath, { force: true });

  const rawEnv = {
    APP_ENV: 'demo',
    NODE_ENV: 'development',
    ENABLE_DEMO_SEED: 'false',
    DATABASE_PATH: databasePath,
    DATABASE_URL: '',
    DEMO_SEED_CONFIRMATION: 'create-consultoria-demo-presentation-data',
    DEMO_SEED_ADMIN_EMAIL: 'admin.demo@example.test',
    DEMO_SEED_ADMIN_PASSWORD: 'Strong!Admin2026',
    DEMO_SEED_OWNER_EMAIL: 'owner.demo@example.test',
    DEMO_SEED_OWNER_PASSWORD: 'Strong!Owner2026',
    DEMO_SEED_EMPLOYEE_EMAIL: 'employee.demo@example.test',
    DEMO_SEED_EMPLOYEE_PASSWORD: 'Strong!Employee2026',
    DEMO_SEED_EMPLOYEE_TWO_EMAIL: 'employee.two.demo@example.test',
    DEMO_SEED_EMPLOYEE_TWO_PASSWORD: 'Strong!EmployeeTwo2026',
  } as NodeJS.ProcessEnv;
  const config = readDemoDataConfig('seed', rawEnv);

  try {
    await seedDemoData(config);
    await seedDemoData(config);

    const database = new Database(databasePath, { readonly: true });
    try {
      const company = database
        .prepare('SELECT name FROM companies WHERE id = ?')
        .get(DEMO_DATA_IDS.company) as { name: string } | undefined;
      assert(
        company?.name === 'Empresa Horizonte Consultoria Demo',
        'Demo company was not created',
      );
      const counts = database
        .prepare(
          `
          SELECT
            (SELECT COUNT(*) FROM users WHERE id LIKE 'demo-presentation-%') AS users,
            (SELECT COUNT(*) FROM diagnosis_answers WHERE submission_id = ?) AS answers,
            (SELECT COUNT(*) FROM action_plan_tasks WHERE company_id = ?) AS tasks
          `,
        )
        .get(DEMO_DATA_IDS.submission, DEMO_DATA_IDS.company) as {
        users: number;
        answers: number;
        tasks: number;
      };
      assert(counts.users === 4, 'Demo seed must remain idempotent for users');
      assert(counts.answers === 6, 'Demo seed must create six coherent answers');
      assert(counts.tasks === 4, 'Demo seed must create four coherent tasks');
    } finally {
      database.close();
    }

    cleanupDemoData({
      databasePath,
    });
    const cleanedDatabase = new Database(databasePath, { readonly: true });
    try {
      const remaining = cleanedDatabase
        .prepare('SELECT COUNT(*) AS total FROM companies WHERE id = ?')
        .get(DEMO_DATA_IDS.company) as { total: number };
      assert(remaining.total === 0, 'Demo cleanup did not remove fixed synthetic IDs');
    } finally {
      cleanedDatabase.close();
    }

    let weakPasswordRejected = false;
    try {
      readDemoDataConfig('seed', {
        ...rawEnv,
        DEMO_SEED_OWNER_PASSWORD: '123456',
      });
    } catch {
      weakPasswordRejected = true;
    }
    assert(weakPasswordRejected, 'Weak demo password must be rejected');

    console.log(
      JSON.stringify({
        ok: true,
        explicitDemoProfileChecked: true,
        idempotencyChecked: true,
        coherentScenarioChecked: true,
        cleanupChecked: true,
        weakPasswordRejected: true,
      }),
    );
  } finally {
    if (fs.existsSync(databasePath)) fs.rmSync(databasePath, { force: true });
    for (const suffix of ['-wal', '-shm']) {
      const sidecar = `${databasePath}${suffix}`;
      if (fs.existsSync(sidecar)) fs.rmSync(sidecar, { force: true });
    }
  }
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
