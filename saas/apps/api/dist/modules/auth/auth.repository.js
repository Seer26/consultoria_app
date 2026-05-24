import { database } from '../../db/database';
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
function mapCompany(row) {
    return {
        id: row.id,
        name: row.name,
        slug: row.slug,
        status: row.status,
        sector: row.sector,
        size: row.size,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}
export class AuthRepository {
    findUserByEmail(email) {
        const statement = database.prepare(`
      SELECT id, name, email, password_hash, role, company_id, created_at
           , status, updated_at
      FROM users
      WHERE email = ?
    `);
        const row = statement.get(email);
        return row ? mapUser(row) : null;
    }
    findUserById(id) {
        const statement = database.prepare(`
      SELECT id, name, email, password_hash, role, company_id, created_at
           , status, updated_at
      FROM users
      WHERE id = ?
    `);
        const row = statement.get(id);
        return row ? mapUser(row) : null;
    }
    findCompanyById(id) {
        const statement = database.prepare(`
      SELECT id, name, slug, status, sector, size, created_at, updated_at
      FROM companies
      WHERE id = ?
    `);
        const row = statement.get(id);
        return row ? mapCompany(row) : null;
    }
    createUser(input) {
        const statement = database.prepare(`
      INSERT INTO users (
        id,
        name,
        email,
        password_hash,
        role,
        company_id,
        created_at,
        updated_at,
        status
      )
      VALUES (
        @id,
        @name,
        @email,
        @passwordHash,
        @role,
        @companyId,
        @createdAt,
        @updatedAt,
        @status
      )
    `);
        const createdAt = new Date().toISOString();
        statement.run({
            id: input.id,
            name: input.name,
            email: input.email,
            passwordHash: input.passwordHash,
            role: input.role,
            companyId: input.companyId ?? null,
            status: 'ACTIVE',
            createdAt,
            updatedAt: createdAt,
        });
        return {
            id: input.id,
            name: input.name,
            email: input.email,
            passwordHash: input.passwordHash,
            role: input.role,
            companyId: input.companyId ?? null,
            status: 'ACTIVE',
            createdAt,
            updatedAt: createdAt,
        };
    }
}
