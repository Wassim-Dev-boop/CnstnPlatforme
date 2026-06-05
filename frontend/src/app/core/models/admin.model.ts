// Administration Panel Models
export interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  isActive: boolean;
  permissionsCustomized?: boolean;
  permissions?: string[];
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
  department?: string;
  phone?: string;
  avatar?: string;
}

export interface SystemConfig {
  id: string;
  key: string;
  value: string;
  description: string;
  type: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'JSON';
  isActive: boolean;
  updatedBy: string;
  updatedAt: Date;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValue?: string;
  newValue?: string;
  ipAddress: string;
  userAgent: string;
  status: 'SUCCESS' | 'FAILURE';
  timestamp: Date;
  description: string;
}

export interface RolePermission {
  role: string;
  permissions: {
    module: string;
    actions: string[];
  }[];
}

export interface AdminRole {
  id: string;
  name: string;
  description?: string;
  systemRole: boolean;
}

export interface UserStatistics {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  usersByRole: {
    role: string;
    count: number;
  }[];
  newUsersThisMonth: number;
  userActivityChart: {
    date: string;
    count: number;
  }[];
}

export interface Department {
  id: string;
  name: string;
  code: string;
  description?: string;
  managerName?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PermissionDefinition {
  code: string;
  module: string;
  action: string;
  label: string;
  description: string;
}

export interface UserPermissionMatrix {
  userId: string;
  customized: boolean;
  assignedPermissions: string[];
  roleDerivedPermissions: string[];
  effectivePermissions: string[];
}

export interface RolePermissionMatrix {
  roleId: string;
  roleName: string;
  assignedPermissions: string[];
  usersInRole: number;
  usersUsingRoleDefaults: number;
  usersCustomized: number;
}
