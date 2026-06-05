import { AppRole } from '../models';

export type BackendRole =
  | 'ADMIN'
  | 'EMPLOYE'
  | 'CHEF_HIERARCHIQUE'
  | 'RESPONSABLE_SALLE'
  | 'RESPONSABLE_SECURITE'
  | 'RESPONSABLE_IT'
  | 'DIRECTEUR_DSN'
  | 'RESPONSABLE_QUALITE';

const FRONT_TO_BACK_ROLE: Record<AppRole, BackendRole> = {
  ADMIN: 'ADMIN',
  EMPLOYEE: 'EMPLOYE',
  MANAGER: 'CHEF_HIERARCHIQUE',
  ROOM_MANAGER: 'RESPONSABLE_SALLE',
  IT_MANAGER: 'RESPONSABLE_IT',
  SECURITY_MANAGER: 'RESPONSABLE_SECURITE',
  DSN_DIRECTOR: 'DIRECTEUR_DSN',
  QUALITY_MANAGER: 'RESPONSABLE_QUALITE',
};

const BACK_TO_FRONT_ROLE: Record<BackendRole, AppRole> = {
  ADMIN: 'ADMIN',
  EMPLOYE: 'EMPLOYEE',
  CHEF_HIERARCHIQUE: 'MANAGER',
  RESPONSABLE_SALLE: 'ROOM_MANAGER',
  RESPONSABLE_SECURITE: 'SECURITY_MANAGER',
  RESPONSABLE_IT: 'IT_MANAGER',
  DIRECTEUR_DSN: 'DSN_DIRECTOR',
  RESPONSABLE_QUALITE: 'QUALITY_MANAGER',
};

export function toBackendRole(role: string): BackendRole {
  const normalized = role as AppRole;
  return FRONT_TO_BACK_ROLE[normalized] ?? 'EMPLOYE';
}

export function toFrontendRole(role: string): AppRole {
  const normalized = role as BackendRole;
  return BACK_TO_FRONT_ROLE[normalized] ?? 'EMPLOYEE';
}

export function toBackendRoles(roles: string[]): BackendRole[] {
  return Array.from(new Set((roles ?? []).map(toBackendRole)));
}

export function toFrontendRoles(roles: string[]): AppRole[] {
  return Array.from(new Set((roles ?? []).map(toFrontendRole)));
}
