export type AppRole =
  | 'ADMIN'
  | 'EMPLOYEE'
  | 'MANAGER'
  | 'ROOM_MANAGER'
  | 'IT_MANAGER'
  | 'SECURITY_MANAGER'
  | 'DSN_DIRECTOR'
  | 'QUALITY_MANAGER';

export interface AppUserProfile {
  id: string;
  username?: string;
  firstName: string;
  lastName: string;
  email: string;
  role: AppRole;
  roles: AppRole[];
  permissionsCustomized?: boolean;
  permissions?: string[];
  department?: string;
  phone?: string;
}
