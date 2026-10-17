import { readFileSync } from 'node:fs';
import type Database from 'better-sqlite3';

export function migrateActionPlanMonitoring(db: Database.Database): void {
  db.exec('CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY, applied_at TEXT NOT NULL)');
  const version = '011_action_plan_monitoring_phase1';
  db.transaction(() => {
    if (db.prepare('SELECT 1 FROM schema_migrations WHERE version = ?').get(version)) return;
    db.exec(readFileSync(new URL('../../migrations/011_action_plan_monitoring_phase1.sql', import.meta.url), 'utf8'));
    db.prepare('INSERT INTO schema_migrations(version,applied_at) VALUES(?,?)').run(version, new Date().toISOString());
    if ((db.pragma('foreign_key_check') as unknown[]).length) throw new Error('MONITORING_MIGRATION_FOREIGN_KEY_FAILURE');
  })();
}
