import type { Request, Response } from 'express';
import { ActionPlanError, ActionPlanService } from './action-plan.service';

export class ActionPlanController {
  constructor(private readonly service: ActionPlanService) {}
  private id(req: Request): string { const value = req.params.id; return Array.isArray(value) ? value[0] : value; }
  private run(res: Response, status: number, work: () => unknown): void {
    try { res.status(status).json(work()); }
    catch (error) {
      if (error instanceof ActionPlanError) res.status(error.status).json({ error: error.message });
      else { console.error('Action plan operation failed', error); res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' }); }
    }
  }
  listPlans = (r: Request, s: Response): void => this.run(s, 200, () => this.service.listPlans(r.auth!, r.query.companyId));
  getPlan = (r: Request, s: Response): void => this.run(s, 200, () => this.service.getPlan(r.auth!, this.id(r), r.query.companyId));
  createPlan = (r: Request, s: Response): void => this.run(s, 201, () => this.service.createPlan(r.auth!, r.body, r.query.companyId));
  updatePlan = (r: Request, s: Response): void => this.run(s, 200, () => this.service.updatePlan(r.auth!, this.id(r), r.body, r.query.companyId));
  listTasks = (r: Request, s: Response): void => this.run(s, 200, () => this.service.listTasks(r.auth!, r.query));
  getTaskById = (r: Request, s: Response): void => this.run(s, 200, () => this.service.getTaskById(r.auth!, this.id(r), r.query.companyId));
  createTask = (r: Request, s: Response): void => this.run(s, 201, () => this.service.createTask(r.auth!, r.body, r.query.companyId));
  updateTask = (r: Request, s: Response): void => this.run(s, 200, () => this.service.updateTask(r.auth!, this.id(r), r.body, r.query.companyId));
  updateTaskStatus = (r: Request, s: Response): void => this.run(s, 200, () => this.service.updateTaskStatus(r.auth!, this.id(r), r.body, r.query.companyId));
  getEvidence = (r: Request, s: Response): void => this.run(s, 200, () => this.service.getEvidence(r.auth!, this.id(r), r.query.companyId));
  addEvidence = (r: Request, s: Response): void => this.run(s, 201, () => this.service.addEvidence(r.auth!, this.id(r), r.body, r.query.companyId));
  getHistory = (r: Request, s: Response): void => this.run(s, 200, () => this.service.getHistory(r.auth!, this.id(r), r.query.companyId));
  dashboard = (r: Request, s: Response): void => this.run(s, 200, () => this.service.dashboard(r.auth!, r.query));
  members = (r: Request, s: Response): void => this.run(s, 200, () => this.service.members(r.auth!, r.query.companyId));
  employees = (r: Request, s: Response): void => this.run(s, 200, () => this.service.employees(r.auth!, r.query));
}
