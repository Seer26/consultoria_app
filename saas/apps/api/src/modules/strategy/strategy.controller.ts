import type { Request, Response } from 'express';
import { StrategyService } from './strategy.service';

export class StrategyController {
  constructor(private readonly service: StrategyService) {}
  private queryCompany(r: Request) { const v = r.query.companyId; return typeof v === 'string' ? v : undefined; }
  private param(r: Request, key: string) { const v = r.params[key]; return Array.isArray(v) ? v[0] : v; }
  get = async (r: Request, s: Response) => this.run(s, () => this.service.getSnapshot(r.auth!, this.queryCompany(r)));
  assignees = async (r: Request, s: Response) => this.run(s, () => this.service.listAssignees(r.auth!, this.queryCompany(r)));
  profile = async (r: Request, s: Response) => this.run(s, () => this.service.updateProfile(r.auth!, r.body ?? {}));
  createObjective = async (r: Request, s: Response) => this.run(s, () => this.service.createObjective(r.auth!, r.body ?? {}), 201);
  updateObjective = async (r: Request, s: Response) => this.run(s, () => this.service.updateObjective(r.auth!, this.param(r, 'id'), r.body ?? {}));
  createGoal = async (r: Request, s: Response) => this.run(s, () => this.service.createGoal(r.auth!, this.param(r, 'objectiveId'), r.body ?? {}), 201);
  updateGoal = async (r: Request, s: Response) => this.run(s, () => this.service.updateGoal(r.auth!, this.param(r, 'id'), r.body ?? {}));
  createSwot = async (r: Request, s: Response) => this.run(s, () => this.service.createSwot(r.auth!, r.body ?? {}), 201);
  updateSwot = async (r: Request, s: Response) => this.run(s, () => this.service.updateSwot(r.auth!, this.param(r, 'id'), r.body ?? {}));
  deleteSwot = async (r: Request, s: Response) => {
    try { await this.service.deleteSwot(r.auth!, this.param(r, 'id'), this.queryCompany(r)); s.status(204).send(); }
    catch (e) { this.error(e, s); }
  };
  private async run(s: Response, operation: () => Promise<unknown>, status = 200) { try { s.status(status).json(await operation()); } catch (e) { this.error(e, s); } }
  private error(error: unknown, response: Response) {
    const code = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
    const status = code === 'FORBIDDEN' || code === 'STRATEGY_READ_ONLY' ? 403
      : code.endsWith('_NOT_FOUND') || code === 'USER_NOT_FOUND' || code === 'COMPANY_NOT_FOUND' ? 404
      : code === 'INACTIVE_USER' ? 409
      : code === 'UNKNOWN_ERROR' ? 500 : 400;
    response.status(status).json({ error: code });
  }
}
