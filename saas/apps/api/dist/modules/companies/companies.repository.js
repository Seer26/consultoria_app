import { database } from '../../db/database';
function mapCompany(row) {
    return {
        id: row.id,
        name: row.name,
        slug: row.slug,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}
function mapUser(row) {
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
export class CompaniesRepository {
    listCompanies() {
        const rows = database.prepare(`
      SELECT
        c.id,
        c.name,
        c.slug,
        c.status,
        c.created_at,
        c.updated_at,
        COUNT(u.id) as user_count
      FROM companies c
      LEFT JOIN users u ON u.company_id = c.id
      GROUP BY c.id, c.name, c.slug, c.status, c.created_at, c.updated_at
      ORDER BY c.created_at DESC
    `).all();
        return rows.map((row) => ({
            ...mapCompany(row),
            userCount: Number(row.user_count ?? 0),
        }));
    }
    findCompanyById(id) {
        const row = database.prepare(`
      SELECT
        c.id,
        c.name,
        c.slug,
        c.status,
        c.created_at,
        c.updated_at,
        COUNT(u.id) as user_count
      FROM companies c
      LEFT JOIN users u ON u.company_id = c.id
      WHERE c.id = ?
      GROUP BY c.id, c.name, c.slug, c.status, c.created_at, c.updated_at
    `).get(id);
        if (!row) {
            return null;
        }
        return {
            ...mapCompany(row),
            userCount: Number(row.user_count ?? 0),
        };
    }
    findCompanyBySlug(slug) {
        const row = database.prepare(`
      SELECT id, name, slug, status, created_at, updated_at
      FROM companies
      WHERE slug = ?
    `).get(slug);
        return row ? mapCompany(row) : null;
    }
    createCompany(input) {
        database.prepare(`
      INSERT INTO companies (id, name, slug, status, created_at, updated_at)
      VALUES (@id, @name, @slug, @status, @createdAt, @updatedAt)
    `).run(input);
        return input;
    }
    updateCompany(input) {
        database.prepare(`
      UPDATE companies
      SET name = @name,
          slug = @slug,
          status = @status,
          updated_at = @updatedAt
      WHERE id = @id
    `).run(input);
        return input;
    }
    updateCompanyStatus(id, status, updatedAt) {
        database.prepare(`
      UPDATE companies
      SET status = ?, updated_at = ?
      WHERE id = ?
    `).run(status, updatedAt, id);
    }
    listUsersByCompany(companyId) {
        const rows = database.prepare(`
      SELECT id, name, email, password_hash, role, company_id, status, created_at, updated_at
      FROM users
      WHERE company_id = ?
      ORDER BY created_at DESC
    `).all(companyId);
        return rows.map(mapUser);
    }
    findUserById(id) {
        const row = database.prepare(`
      SELECT id, name, email, password_hash, role, company_id, status, created_at, updated_at
      FROM users
      WHERE id = ?
    `).get(id);
        return row ? mapUser(row) : null;
    }
    findUserByEmail(email) {
        const row = database.prepare(`
      SELECT id, name, email, password_hash, role, company_id, status, created_at, updated_at
      FROM users
      WHERE email = ?
    `).get(email);
        return row ? mapUser(row) : null;
    }
    createUser(input) {
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
    updateUser(input) {
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
    updateUserStatus(id, status, updatedAt) {
        database.prepare(`
      UPDATE users
      SET status = ?, updated_at = ?
      WHERE id = ?
    `).run(status, updatedAt, id);
    }
}
