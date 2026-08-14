import type { AuthTokenPayload } from '../auth/auth.types';

export type StrategyStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELED';
export type StrategyPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type SwotCategory = 'STRENGTH' | 'WEAKNESS' | 'OPPORTUNITY' | 'THREAT';

export interface StrategyActor {
  id: string;
  role: 'ADMIN' | 'OWNER' | 'EMPLOYEE';
  companyId: string | null;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface StrategyContext {
  auth: AuthTokenPayload;
  actor: StrategyActor;
  companyId: string;
}

export interface StrategyProfile {
  companyId: string;
  mission: string;
  vision: string;
  values: string;
  createdAt: string;
  updatedAt: string;
}

export interface StrategicGoal {
  id: string;
  companyId: string;
  objectiveId: string;
  title: string;
  description: string;
  initialValue: number | null;
  targetValue: number | null;
  unit: string | null;
  currentValue: number | null;
  dueDate: string | null;
  status: StrategyStatus;
  createdAt: string;
  updatedAt: string;
}

export interface StrategicObjective {
  id: string;
  companyId: string;
  title: string;
  description: string;
  status: StrategyStatus;
  priority: StrategyPriority;
  startDate: string | null;
  dueDate: string | null;
  responsibleUserId: string | null;
  responsibleUserName: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
  goals: StrategicGoal[];
}

export interface SwotItem {
  id: string;
  companyId: string;
  category: SwotCategory;
  title: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}
