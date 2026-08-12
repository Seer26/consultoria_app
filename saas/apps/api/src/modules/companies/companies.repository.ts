import { dataSource } from '../../database/data-source';
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
  department: string | null;
  job_function: string | null;
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
    department: row.department,
    jobFunction: row.job_function,
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
  async listCompanies(): Promise<Array<CompanyRecord & { userCount: number }>> {
    const rows = await dataSource.many<CompanyRow>(`
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
    `);

    return rows.map((row) => ({
      ...mapCompany(row),
      userCount: Number(row.user_count ?? 0),
    }));
  }

  async findCompanyById(
    id: string,
  ): Promise<(CompanyRecord & { userCount: number }) | null> {
    const row = await dataSource.one<CompanyRow>(`
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
    `, [id]);

    if (!row) {
      return null;
    }

    return {
      ...mapCompany(row),
      userCount: Number(row.user_count ?? 0),
    };
  }

  async findCompanyBySlug(slug: string): Promise<CompanyRecord | null> {
    const row = await dataSource.one<CompanyRow>(`
      SELECT id, name, slug, status, sector, size, phone, responsible_name, notes, created_at, updated_at
      FROM companies
      WHERE slug = ?
    `, [slug]);

    return row ? mapCompany(row) : null;
  }

  async createCompany(input: CompanyRecord): Promise<CompanyRecord> {
    await dataSource.transaction(async () => {
      await this.insertCompany(input);
      await this.createDefaultSubscription(input.id);
    });
    return input;
  }

  async createCompanyWithOwner(input: {
    company: CompanyRecord;
    owner: ManagedUserRecord;
  }): Promise<{
    company: CompanyRecord;
    owner: ManagedUserRecord;
  }> {
    await dataSource.transaction(async () => {
      await this.insertCompany(input.company);
      await this.createDefaultSubscription(input.company.id);
      await this.createUser(input.owner);
    });
    return input;
  }

  async updateCompany(input: CompanyRecord): Promise<CompanyRecord> {
    await dataSource.execute(`
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
    `, input);

    return input;
  }

  async updateCompanySettings(input: CompanyRecord): Promise<CompanyRecord> {
    await dataSource.execute(`
      UPDATE companies
      SET name = @name,
          sector = @sector,
          size = @size,
          phone = @phone,
          responsible_name = @responsibleName,
          notes = @notes,
          updated_at = @updatedAt
      WHERE id = @id
    `, input);

    return input;
  }

  async updateCompanyStatus(
    id: string,
    status: EntityStatus,
    updatedAt: string,
  ): Promise<void> {
    await dataSource.execute(`
      UPDATE companies
      SET status = ?, updated_at = ?
      WHERE id = ?
    `, [status, updatedAt, id]);
  }

  async listUsersByCompany(companyId: string): Promise<ManagedUserRecord[]> {
    const rows = await dataSource.many<UserRow>(`
      SELECT id, name, email, password_hash, role, company_id, status, department, job_function, created_at, updated_at
      FROM users
      WHERE company_id = ?
      ORDER BY created_at DESC
    `, [companyId]);

    return rows.map(mapUser);
  }

  async findUserById(id: string): Promise<ManagedUserRecord | null> {
    const row = await dataSource.one<UserRow>(`
      SELECT id, name, email, password_hash, role, company_id, status, department, job_function, created_at, updated_at
      FROM users
      WHERE id = ?
    `, [id]);

    return row ? mapUser(row) : null;
  }

  async findUserByEmail(email: string): Promise<ManagedUserRecord | null> {
    const row = await dataSource.one<UserRow>(`
      SELECT id, name, email, password_hash, role, company_id, status, department, job_function, created_at, updated_at
      FROM users
      WHERE email = ?
    `, [email]);

    return row ? mapUser(row) : null;
  }

  async createUser(input: ManagedUserRecord): Promise<ManagedUserRecord> {
    await dataSource.execute(`
      INSERT INTO users (
        id,
        name,
        email,
        password_hash,
        role,
        company_id,
        status,
        department,
        job_function,
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
        @department,
        @jobFunction,
        @createdAt,
        @updatedAt
      )
    `, input);

    return input;
  }

  async updateUser(input: ManagedUserRecord): Promise<ManagedUserRecord> {
    await dataSource.execute(`
      UPDATE users
      SET name = @name,
          email = @email,
          password_hash = @passwordHash,
          role = @role,
          company_id = @companyId,
          status = @status,
          department = @department,
          job_function = @jobFunction,
          updated_at = @updatedAt
      WHERE id = @id
    `, input);

    return input;
  }

  async updateUserStatus(
    id: string,
    status: EntityStatus,
    updatedAt: string,
  ): Promise<void> {
    await dataSource.execute(`
      UPDATE users
      SET status = ?, updated_at = ?
      WHERE id = ?
    `, [status, updatedAt, id]);
  }

  private async insertCompany(input: CompanyRecord): Promise<void> {
    await dataSource.execute(`
      INSERT INTO companies (
        id, name, slug, status, sector, size, phone, responsible_name, notes,
        created_at, updated_at
      )
      VALUES (
        @id, @name, @slug, @status, @sector, @size, @phone, @responsibleName, @notes,
        @createdAt, @updatedAt
      )
    `, input);
  }

  private async createDefaultSubscription(companyId: string): Promise<void> {
    const period = getCurrentPeriodRange();
    const now = new Date().toISOString();

    await dataSource.execute(`
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
    `, {
      id: `subscription-${companyId}`,
      companyId,
      periodStart: period.start,
      periodEnd: period.end,
      createdAt: now,
      updatedAt: now,
    });
  }
}
