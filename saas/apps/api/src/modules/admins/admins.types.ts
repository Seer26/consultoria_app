export const ADMIN_CREATE_PERMISSION = 'admin:create' as const;

export interface AdminUserSummary {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN';
  status: 'ACTIVE' | 'INACTIVE';
  permissions: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateAdminInput {
  name: string;
  email: string;
  password?: string;
  grantAdminCreate?: boolean;
}

export interface UpdateAdminStatusInput {
  status: 'ACTIVE' | 'INACTIVE';
}

export interface UpdateAdminPermissionsInput {
  grantAdminCreate: boolean;
}
