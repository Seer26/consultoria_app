import { dataSource } from '../../database/data-source';
import type {
  StrategicGoal,
  StrategicObjective,
  StrategyActor,
  StrategyProfile,
  SwotItem,
} from './strategy.types';

type Row = Record<string, any>;

const profile = (r: Row): StrategyProfile => ({
  companyId: r.company_id, mission: r.mission, vision: r.vision,
  values: r.values_text, createdAt: r.created_at, updatedAt: r.updated_at,
});
const goal = (r: Row): StrategicGoal => ({
  id: r.id, companyId: r.company_id, objectiveId: r.objective_id,
  title: r.title, description: r.description,
  initialValue: r.initial_value == null ? null : Number(r.initial_value),
  targetValue: r.target_value == null ? null : Number(r.target_value),
  unit: r.unit, currentValue: r.current_value == null ? null : Number(r.current_value),
  dueDate: r.due_date, status: r.status, createdAt: r.created_at, updatedAt: r.updated_at,
});
const objective = (r: Row, goals: StrategicGoal[] = []): StrategicObjective => ({
  id: r.id, companyId: r.company_id, title: r.title, description: r.description,
  status: r.status, priority: r.priority, startDate: r.start_date, dueDate: r.due_date,
  responsibleUserId: r.responsible_user_id, responsibleUserName: r.responsible_user_name,
  notes: r.notes, createdAt: r.created_at, updatedAt: r.updated_at, goals,
});
const swot = (r: Row): SwotItem => ({
  id: r.id, companyId: r.company_id, category: r.category, title: r.title,
  description: r.description, createdAt: r.created_at, updatedAt: r.updated_at,
});

export class StrategyRepository {
  async findActor(id: string): Promise<StrategyActor | null> {
    const r = await dataSource.one<Row>('SELECT id, role, company_id, status FROM users WHERE id = ?', [id]);
    return r ? { id: r.id, role: r.role, companyId: r.company_id, status: r.status } : null;
  }

  async companyExists(id: string): Promise<boolean> {
    return Boolean(await dataSource.one<Row>('SELECT id FROM companies WHERE id = ?', [id]));
  }

  async getProfile(companyId: string): Promise<StrategyProfile | null> {
    const r = await dataSource.one<Row>('SELECT * FROM company_strategy WHERE company_id = ?', [companyId]);
    return r ? profile(r) : null;
  }

  async saveProfile(value: StrategyProfile): Promise<void> {
    if (await this.getProfile(value.companyId)) {
      await dataSource.execute(`UPDATE company_strategy SET mission=@mission, vision=@vision, values_text=@values, updated_at=@updatedAt WHERE company_id=@companyId`, value);
    } else {
      await dataSource.execute(`INSERT INTO company_strategy (company_id, mission, vision, values_text, created_at, updated_at) VALUES (@companyId,@mission,@vision,@values,@createdAt,@updatedAt)`, value);
    }
  }

  async listObjectives(companyId: string): Promise<StrategicObjective[]> {
    const rows = await dataSource.many<Row>(`SELECT o.*, u.name AS responsible_user_name FROM strategic_objectives o LEFT JOIN users u ON u.id=o.responsible_user_id WHERE o.company_id=? ORDER BY o.created_at DESC`, [companyId]);
    const goals = await this.listGoals(companyId);
    return rows.map((r) => objective(r, goals.filter((g) => g.objectiveId === r.id)));
  }

  async findObjective(id: string): Promise<StrategicObjective | null> {
    const r = await dataSource.one<Row>(`SELECT o.*, u.name AS responsible_user_name FROM strategic_objectives o LEFT JOIN users u ON u.id=o.responsible_user_id WHERE o.id=?`, [id]);
    return r ? objective(r, await this.listGoals(r.company_id, id)) : null;
  }

  async saveObjective(value: StrategicObjective, insert: boolean): Promise<void> {
    if (insert) await dataSource.execute(`INSERT INTO strategic_objectives (id,company_id,title,description,status,priority,start_date,due_date,responsible_user_id,notes,created_at,updated_at) VALUES (@id,@companyId,@title,@description,@status,@priority,@startDate,@dueDate,@responsibleUserId,@notes,@createdAt,@updatedAt)`, value);
    else await dataSource.execute(`UPDATE strategic_objectives SET title=@title,description=@description,status=@status,priority=@priority,start_date=@startDate,due_date=@dueDate,responsible_user_id=@responsibleUserId,notes=@notes,updated_at=@updatedAt WHERE id=@id AND company_id=@companyId`, value);
  }

  async listGoals(companyId: string, objectiveId?: string): Promise<StrategicGoal[]> {
    const rows = await dataSource.many<Row>(`SELECT * FROM strategic_goals WHERE company_id=? ${objectiveId ? 'AND objective_id=?' : ''} ORDER BY created_at ASC`, objectiveId ? [companyId, objectiveId] : [companyId]);
    return rows.map(goal);
  }

  async findGoal(id: string): Promise<StrategicGoal | null> {
    const r = await dataSource.one<Row>('SELECT * FROM strategic_goals WHERE id=?', [id]);
    return r ? goal(r) : null;
  }

  async saveGoal(value: StrategicGoal, insert: boolean): Promise<void> {
    if (insert) await dataSource.execute(`INSERT INTO strategic_goals (id,company_id,objective_id,title,description,initial_value,target_value,unit,current_value,due_date,status,created_at,updated_at) VALUES (@id,@companyId,@objectiveId,@title,@description,@initialValue,@targetValue,@unit,@currentValue,@dueDate,@status,@createdAt,@updatedAt)`, value);
    else await dataSource.execute(`UPDATE strategic_goals SET title=@title,description=@description,initial_value=@initialValue,target_value=@targetValue,unit=@unit,current_value=@currentValue,due_date=@dueDate,status=@status,updated_at=@updatedAt WHERE id=@id AND company_id=@companyId`, value);
  }

  async listSwot(companyId: string): Promise<SwotItem[]> {
    return (await dataSource.many<Row>('SELECT * FROM swot_items WHERE company_id=? ORDER BY created_at ASC', [companyId])).map(swot);
  }
  async findSwot(id: string): Promise<SwotItem | null> {
    const r = await dataSource.one<Row>('SELECT * FROM swot_items WHERE id=?', [id]);
    return r ? swot(r) : null;
  }
  async saveSwot(value: SwotItem, insert: boolean): Promise<void> {
    if (insert) await dataSource.execute(`INSERT INTO swot_items (id,company_id,category,title,description,created_at,updated_at) VALUES (@id,@companyId,@category,@title,@description,@createdAt,@updatedAt)`, value);
    else await dataSource.execute(`UPDATE swot_items SET category=@category,title=@title,description=@description,updated_at=@updatedAt WHERE id=@id AND company_id=@companyId`, value);
  }
  async deleteSwot(id: string, companyId: string): Promise<void> {
    await dataSource.execute('DELETE FROM swot_items WHERE id=? AND company_id=?', [id, companyId]);
  }

  async findEmployee(id: string): Promise<StrategyActor | null> { return this.findActor(id); }
  async listAssignees(companyId: string): Promise<Array<{id:string; name:string}>> {
    return dataSource.many('SELECT id, name FROM users WHERE company_id=? AND role=\'EMPLOYEE\' AND status=\'ACTIVE\' ORDER BY name', [companyId]);
  }
}
