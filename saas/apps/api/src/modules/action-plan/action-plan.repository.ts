import { database } from '../../db/database';
import type { Actor, ActionPlanTaskDetails, Evidence, History, Plan, Scope, TaskFilters, TaskRecord } from './action-plan.types';

const taskSelect = `SELECT t.id, t.company_id AS companyId, t.plan_id AS planId, t.submission_id AS submissionId,
 t.title,t.description,t.pillar,t.priority,t.status,t.start_date AS startDate,t.due_date AS dueDate,
 t.responsible_user_id AS responsibleUserId,t.progress,t.notes,t.source,t.created_at AS createdAt,
 t.updated_at AS updatedAt,t.completed_at AS completedAt,u.name AS responsibleUserName,c.name AS companyName
 FROM action_plan_tasks t JOIN companies c ON c.id=t.company_id
 LEFT JOIN users u ON u.id=t.responsible_user_id AND u.company_id=t.company_id`;
const planSelect = `SELECT p.id,p.company_id AS companyId,p.submission_id AS submissionId,p.title,p.description,p.status,
 p.start_date AS startDate,p.due_date AS dueDate,p.created_by AS createdBy,p.created_at AS createdAt,p.updated_at AS updatedAt,
 COALESCE((SELECT ROUND(AVG(t.progress),1) FROM action_plan_tasks t WHERE t.plan_id=p.id AND t.company_id=p.company_id AND t.status<>'CANCELADA'),0) AS progress
 FROM action_plans p`;
const decorate = (task: Omit<ActionPlanTaskDetails, 'overdue'>): ActionPlanTaskDetails => ({
  ...task, overdue: Boolean(task.dueDate && Date.parse(task.dueDate) < Date.now() && !['CONCLUIDA', 'CANCELADA'].includes(task.status)),
});

export class ActionPlanRepository {
  atomic<T>(work: () => T): T { return database.transaction(work)(); }
  actor(id: string): Actor | undefined {
    return database.prepare('SELECT id,name,role,company_id AS companyId,status FROM users WHERE id=?').get(id) as Actor | undefined;
  }
  company(id: string) { return database.prepare("SELECT id FROM companies WHERE id=? AND status='ACTIVE'").get(id); }
  submission(id: string, companyId: string) { return database.prepare('SELECT id FROM diagnosis_submissions WHERE id=? AND company_id=?').get(id, companyId); }
  plans(scope: Scope): Plan[] {
    return database.prepare(`${planSelect} WHERE p.company_id=? ${scope.employeeId ? 'AND EXISTS(SELECT 1 FROM action_plan_tasks t WHERE t.plan_id=p.id AND t.company_id=p.company_id AND t.responsible_user_id=?)' : ''} ORDER BY p.created_at DESC,p.id`).all(...[scope.companyId, ...(scope.employeeId ? [scope.employeeId] : [])]) as Plan[];
  }
  plan(scope: Scope, id: string): Plan | undefined { return this.plans(scope).find(plan => plan.id === id); }
  insertPlan(p: Plan): void {
    database.prepare(`INSERT INTO action_plans(id,company_id,submission_id,title,description,status,start_date,due_date,created_by,created_at,updated_at)
      VALUES(@id,@companyId,@submissionId,@title,@description,@status,@startDate,@dueDate,@createdBy,@createdAt,@updatedAt)`).run(p);
  }
  updatePlan(p: Plan): void {
    database.prepare(`UPDATE action_plans SET title=@title,description=@description,status=@status,start_date=@startDate,due_date=@dueDate,updated_at=@updatedAt
      WHERE id=@id AND company_id=@companyId`).run(p);
  }
  tasks(scope: Scope, filters: TaskFilters = {}): ActionPlanTaskDetails[] {
    const conditions = ['t.company_id=?'];
    const params: string[] = [scope.companyId];
    if (scope.employeeId) { conditions.push('t.responsible_user_id=?'); params.push(scope.employeeId); }
    for (const [column, value] of [['t.plan_id', filters.planId], ['t.submission_id', filters.submissionId], ['t.status', filters.status], ['t.responsible_user_id', filters.responsibleUserId], ['t.priority', filters.priority]]) {
      if (value) { conditions.push(`${column}=?`); params.push(value); }
    }
    const rows = database.prepare(`${taskSelect} WHERE ${conditions.join(' AND ')} ORDER BY CASE t.priority WHEN 'CRITICA' THEN 0 WHEN 'ALTA' THEN 1 WHEN 'MEDIA' THEN 2 ELSE 3 END, t.due_date IS NULL,t.due_date,t.created_at,t.id`).all(...params) as Omit<ActionPlanTaskDetails, 'overdue'>[];
    return rows.map(decorate).filter(task => (filters.overdue === undefined || task.overdue === filters.overdue) && (filters.completed === undefined || (task.status === 'CONCLUIDA') === filters.completed));
  }
  task(scope: Scope, id: string): ActionPlanTaskDetails | undefined {
    const row = database.prepare(`${taskSelect} WHERE t.company_id=? AND t.id=? ${scope.employeeId ? 'AND t.responsible_user_id=?' : ''}`).get(scope.companyId, id, ...(scope.employeeId ? [scope.employeeId] : [])) as Omit<ActionPlanTaskDetails, 'overdue'> | undefined;
    return row ? decorate(row) : undefined;
  }
  insertTask(t: TaskRecord): void {
    database.prepare(`INSERT INTO action_plan_tasks(id,company_id,plan_id,submission_id,title,description,pillar,priority,status,start_date,due_date,responsible_user_id,progress,notes,source,created_at,updated_at,completed_at)
      VALUES(@id,@companyId,@planId,@submissionId,@title,@description,@pillar,@priority,@status,@startDate,@dueDate,@responsibleUserId,@progress,@notes,@source,@createdAt,@updatedAt,@completedAt)`).run(t);
  }
  updateTask(t: TaskRecord): void {
    database.prepare(`UPDATE action_plan_tasks SET title=@title,description=@description,pillar=@pillar,priority=@priority,status=@status,start_date=@startDate,due_date=@dueDate,
      responsible_user_id=@responsibleUserId,progress=@progress,notes=@notes,source=@source,updated_at=@updatedAt,completed_at=@completedAt WHERE id=@id AND company_id=@companyId`).run(t);
  }
  addHistory(h: History): void {
    database.prepare(`INSERT INTO action_plan_history(id,task_id,company_id,event,actor_id,actor_name,old_value,new_value,created_at)
      VALUES(@id,@taskId,@companyId,@event,@actorId,@actorName,@oldValue,@newValue,@createdAt)`).run({ ...h, oldValue: JSON.stringify(h.oldValue), newValue: JSON.stringify(h.newValue) });
  }
  history(scope: Scope, taskId: string): History[] {
    const rows = database.prepare(`SELECT id,task_id AS taskId,company_id AS companyId,event,actor_id AS actorId,actor_name AS actorName,old_value AS oldValue,new_value AS newValue,created_at AS createdAt
      FROM action_plan_history WHERE company_id=? AND task_id=? ORDER BY created_at,rowid`).all(scope.companyId, taskId) as (Omit<History, 'oldValue' | 'newValue'> & { oldValue: string | null; newValue: string | null })[];
    return rows.map(row => ({ ...row, oldValue: row.oldValue === null ? null : JSON.parse(row.oldValue), newValue: row.newValue === null ? null : JSON.parse(row.newValue) }));
  }
  addEvidence(e: Evidence): void {
    database.prepare(`INSERT INTO action_plan_evidence(id,task_id,company_id,type,content,created_by,created_at)
      VALUES(@id,@taskId,@companyId,@type,@content,@createdBy,@createdAt)`).run(e);
  }
  evidence(scope: Scope, taskId: string): Evidence[] {
    return database.prepare(`SELECT e.id,e.task_id AS taskId,e.company_id AS companyId,e.type,e.content,e.created_by AS createdBy,e.created_at AS createdAt,u.name AS actorName
      FROM action_plan_evidence e JOIN users u ON u.id=e.created_by WHERE e.company_id=? AND e.task_id=? ORDER BY e.created_at,e.rowid`).all(scope.companyId, taskId) as Evidence[];
  }
  members(scope: Scope): { id: string; name: string; role: string }[] {
    return database.prepare("SELECT id,name,role FROM users WHERE company_id=? AND status='ACTIVE' ORDER BY name,id").all(scope.companyId) as { id: string; name: string; role: string }[];
  }
}
