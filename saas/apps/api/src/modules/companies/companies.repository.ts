import { database } from '../../db/database';
import type {
  CompanyRecord,
  EntityStatus,
  ManagedUserRecord,
  ManagedUserRole,
} from './companies.types';

interface CompanyRow {
  id: string;
  name: string;
  slug: string;
  status: EntityStatus;
  sector: string | null;
  size: string | null;
  phone: string | null;
  responsible_name: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  user_count?: number;
}

interface UserRow {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: ManagedUserRole;
  company_id: string | null;
  status: EntityStatus;
  created_at: string;
  updated_at: string;
}

function mapCompany(row: CompanyRow): CompanyRecord {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    status: row.status,
    sector: row.sector,
    size: row.size,
    phone: row.phone,
    responsibleName: row.responsible_name,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapUser(row: UserRow): ManagedUserRecord {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    passwordHash: row.password_hash,
    role: row.role,
    companyId: row.company_id,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function getCurrentPeriodRange(now = new Date()): { start: string; end: string } {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

export class CompaniesRepository {
  listCompanies(): Array<CompanyRecord & { userCount: number }> {
    const rows = database.prepare(`
      SELECT
        c.id,
        c.name,
        c.slug,
        c.status,
        c.sector,
        c.size,
        c.phone,
        c.responsible_name,
        c.notes,
        c.created_at,
        c.updated_at,
        COUNT(u.id) as user_count
      FROM companies c
      LEFT JOIN users u ON u.company_id = c.id
      GROUP BY c.id, c.name, c.slug, c.status, c.sector, c.size, c.phone, c.responsible_name, c.notes, c.created_at, c.updated_at
      ORDER BY c.created_at DESC
    `).all() as CompanyRow[];

    return rows.map((row) => ({
      ...mapCompany(row),
      userCount: Number(row.user_count ?? 0),
    }));
  }

  findCompanyById(id: string): (CompanyRecord & { userCount: number }) | null {
    const row = database.prepare(`
      SELECT
        c.id,
        c.name,
        c.slug,
        c.status,
        c.sector,
        c.size,
        c.phone,
        c.responsible_name,
        c.notes,
        c.created_at,
        c.updated_at,
        COUNT(u.id) as user_count
      FROM companies c
      LEFT JOIN users u ON u.company_id = c.id
      WHERE c.id = ?
      GROUP BY c.id, c.name, c.slug, c.status, c.sector, c.size, c.phone, c.responsible_name, c.notes, c.created_at, c.updated_at
    `).get(id) as CompanyRow | undefined;

    if (!row) {
      return null;
    }

    return {
      ...mapCompany(row),
      userCount: Number(row.user_count ?? 0),
    };
  }

  findCompanyBySlug(slug: string): CompanyRecord | null {
    const row = database.prepare(`
      SELECT id, name, slug, status, sector, size, phone, responsible_name, notes, created_at, updated_at
      FROM companies
      WHERE slug = ?
    `).get(slug) as CompanyRow | undefined;

    return row ? mapCompany(row) : null;
  }

  createCompany(input: CompanyRecord): CompanyRecord {
    const insert = database.transaction(() => {
      this.insertCompany(input);
      this.createDefaultSubscription(input.id);
    });

    insert();

    return input;
  }

  createCompanyWithOwner(input: {
    company: CompanyRecord;
    owner: ManagedUserRecord;
  }): {
    company: CompanyRecord;
    owner: ManagedUserRecord;
  } {
    const insert = database.transaction(() => {
      this.insertCompany(input.company);
      this.createDefaultSubscription(input.company.id);
      this.createUser(input.owner);
    });

    insert();
    return input;
  }

  updateCompany(input: CompanyRecord): CompanyRecord {
    database.prepare(`
      UPDATE companies
      SET name = @name,
          slug = @slug,
          status = @status,
          sector = @sector,
          size = @size,
          phone = @phone,
          responsible_name = @responsibleName,
          notes = @notes,
          updated_at = @updatedAt
      WHERE id = @id
    `).run(input);

    return input;
  }

  updateCompanySettings(input: CompanyRecord): CompanyRecord {
    database.prepare(`
      UPDATE companies
      SET name = @name,
          sector = @sector,
          size = @size,
          phone = @phone,
          responsible_name = @responsibleName,
          notes = @notes,
          updated_at = @updatedAt
      WHERE id = @id
    `).run(input);

    return input;
  }

  updateCompanyStatus(id: string, status: EntityStatus, updatedAt: string): void {
    database.prepare(`
      UPDATE companies
      SET status = ?, updated_at = ?
      WHERE id = ?
    `).run(status, updatedAt, id);
  }

  listUsersByCompany(companyId: string): ManagedUserRecord[] {
    const rows = database.prepare(`
      SELECT id, name, email, password_hash, role, company_id, status, created_at, updated_at
      FROM users
      WHERE company_id = ?
      ORDER BY created_at DESC
    `).all(companyId) as UserRow[];

    return rows.map(mapUser);
  }

  findUserById(id: string): ManagedUserRecord | null {
    const row = database.prepare(`
      SELECT id, name, email, password_hash, role, company_id, status, created_at, updated_at
      FROM users
      WHERE id = ?
    `).get(id) as UserRow | undefined;

    return row ? mapUser(row) : null;
  }

  findUserByEmail(email: string): ManagedUserRecord | null {
    const row = database.prepare(`
      SELECT id, name, email, password_hash, role, company_id, status, created_at, updated_at
      FROM users
      WHERE email = ?
    `).get(email) as UserRow | undefined;

    return row ? mapUser(row) : null;
  }

  createUser(input: ManagedUserRecord): ManagedUserRecord {
    database.prepare(`
      INSERT INTO users (
        id,
        name,
        email,
        password_hash,
        role,
        company_id,
        status,
        created_at,
        updated_at
      )
      VALUES (
        @id,
        @name,
        @email,
        @passwordHash,
        @role,
        @companyId,
        @status,
        @createdAt,
        @updatedAt
      )
    `).run(input);

    return input;
  }

  updateUser(input: ManagedUserRecord): ManagedUserRecord {
    database.prepare(`
      UPDATE users
      SET name = @name,
          email = @email,
          password_hash = @passwordHash,
          role = @role,
          company_id = @companyId,
          status = @status,
          updated_at = @updatedAt
      WHERE id = @id
    `).run(input);

    return input;
  }

  updateUserStatus(id: string, status: EntityStatus, updatedAt: string): void {
    database.prepare(`
      UPDATE users
      SET status = ?, updated_at = ?
      WHERE id = ?
    `).run(status, updatedAt, id);
  }

  private insertCompany(input: CompanyRecord): void {
    database.prepare(`
      INSERT INTO companies (
        id, name, slug, status, sector, size, phone, responsible_name, notes,
        created_at, updated_at
      )
      VALUES (
        @id, @name, @slug, @status, @sector, @size, @phone, @responsibleName, @notes,
        @createdAt, @updatedAt
      )
    `).run(input);
  }

  private createDefaultSubscription(companyId: string): void {
    const period = getCurrentPeriodRange();
    const now = new Date().toISOString();

    database.prepare(`
      INSERT OR IGNORE INTO company_subscriptions (
        id, company_id, plan_id, status,
        current_period_start, current_period_end,
        created_at, updated_at
      )
      VALUES (
        @id, @companyId, 'plan-starter', 'ACTIVE',
        @periodStart, @periodEnd,
        @createdAt, @updatedAt
      )
    `).run({
      id: `subscription-${companyId}`,
      companyId,
      periodStart: period.start,
      periodEnd: period.end,
      createdAt: now,
      updatedAt: now,
    });
  }
}
