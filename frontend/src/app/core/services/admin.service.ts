import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, EMPTY, Observable, catchError, expand, map, of, reduce, switchMap, tap, throwError } from 'rxjs';
import { ApiPageResponse, buildApiUrl, extractPageContent } from '../config/backend-api.config';
import { AuthService } from './auth.service';
import {
  User,
  AuditLog,
  SystemConfig,
  UserStatistics,
  AdminRole,
  RolePermission,
  RolePermissionMatrix,
  Department,
  PermissionDefinition,
  UserPermissionMatrix,
} from '../models';
import { toBackendRoles, toFrontendRoles } from '../utils/role-mapper.util';

interface BackendDepartmentResponse {
  id: string;
  code: string;
  name: string;
  description?: string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface BackendRoleResponse {
  id: string;
  name: string;
  description?: string;
  systemRole?: boolean;
}

interface BackendUserResponse {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  enabled: boolean;
  permissionsCustomized?: boolean;
  permissions?: string[];
  department?: BackendDepartmentResponse;
  roles: string[];
  createdAt?: string;
  updatedAt?: string;
}

interface BackendPermissionDefinitionResponse {
  code: string;
  module: string;
  action: string;
  label: string;
  description: string;
}

interface BackendUserPermissionsResponse {
  userId: string;
  customized: boolean;
  assignedPermissions: string[];
  roleDerivedPermissions: string[];
  effectivePermissions: string[];
}

interface BackendRolePermissionsResponse {
  roleId: string;
  roleName: string;
  assignedPermissions: string[];
  usersInRole: number;
  usersUsingRoleDefaults: number;
  usersCustomized: number;
}

interface BackendUserCreateRequest {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  departmentId: string;
  roles: string[];
  enabled: boolean;
  initialPassword: string;
}

interface BackendUserUpdateRequest {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  departmentId: string;
  enabled: boolean;
}

interface BackendAssignRolesRequest {
  roles: string[];
}

interface BackendDepartmentCreateRequest {
  code: string;
  name: string;
  description?: string;
  active: boolean;
}

interface BackendDepartmentUpdateRequest {
  name: string;
  description?: string;
  active: boolean;
}

export interface UserQueryOptions {
  page?: number;
  size?: number;
  sort?: string;
  search?: string;
  enabled?: boolean;
  departmentId?: string;
  role?: string;
}

export interface DepartmentQueryOptions {
  page?: number;
  size?: number;
  sort?: string;
  search?: string;
  active?: boolean;
}

export interface AdminPageState {
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private usersSubject = new BehaviorSubject<User[]>([]);
  public users$ = this.usersSubject.asObservable();

  private auditLogsSubject = new BehaviorSubject<AuditLog[]>([]);
  public auditLogs$ = this.auditLogsSubject.asObservable();

  private systemConfigSubject = new BehaviorSubject<SystemConfig[]>([]);
  public systemConfig$ = this.systemConfigSubject.asObservable();

  private rolePermissionsSubject = new BehaviorSubject<RolePermission[]>([]);

  private departmentsSubject = new BehaviorSubject<Department[]>([]);
  public departments$ = this.departmentsSubject.asObservable();
  private usersPageStateSubject = new BehaviorSubject<AdminPageState>({
    page: 0,
    size: 200,
    totalElements: 0,
    totalPages: 0,
  });
  public usersPageState$ = this.usersPageStateSubject.asObservable();

  private departmentsPageStateSubject = new BehaviorSubject<AdminPageState>({
    page: 0,
    size: 200,
    totalElements: 0,
    totalPages: 0,
  });
  public departmentsPageState$ = this.departmentsPageStateSubject.asObservable();

  constructor(private http: HttpClient, private authService: AuthService) {}

  // User Management
  getUsers(options: UserQueryOptions = {}): Observable<User[]> {
    const params: Record<string, string> = {
      page: String(options.page ?? 0),
      size: String(options.size ?? 200),
      sort: options.sort || 'createdAt,desc',
    };
    if (options.search?.trim()) {
      params['search'] = options.search.trim();
    }
    if (typeof options.enabled === 'boolean') {
      params['enabled'] = String(options.enabled);
    }
    if (options.departmentId) {
      params['departmentId'] = options.departmentId;
    }
    if (options.role) {
      params['role'] = options.role;
    }

    return this.http
      .get<ApiPageResponse<BackendUserResponse>>(buildApiUrl('/api/v1/admin/users'), { params })
      .pipe(
        map((response) => {
          this.usersPageStateSubject.next({
            page: response.page ?? options.page ?? 0,
            size: response.size ?? options.size ?? 200,
            totalElements: response.totalElements ?? 0,
            totalPages: response.totalPages ?? 0,
          });
          return extractPageContent(response).map((item) => this.mapUser(item));
        }),
        tap((users) => this.usersSubject.next(users)),
        catchError((error) => throwError(() => new Error(this.toBackendErrorMessage(error, 'Chargement des utilisateurs impossible.')))),
      );
  }

  getUserById(id: string): Observable<User | undefined> {
    return this.http
      .get<BackendUserResponse>(buildApiUrl(`/api/v1/admin/users/${id}`))
      .pipe(
        map((response) => this.mapUser(response)),
        catchError((error: HttpErrorResponse) => {
          if (error.status === 404) {
            return of(undefined);
          }
          return throwError(() => new Error(this.toBackendErrorMessage(error, 'Chargement utilisateur impossible.')));
        }),
      );
  }

  createUser(user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Observable<User> {
    return this.getDepartments().pipe(
      map((departments) => this.resolveDepartmentId(user.department, departments)),
      switchMap((departmentId) => {
        const payload: BackendUserCreateRequest = {
          username: user.username || user.email.split('@')[0],
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName || '',
          phone: user.phone || '',
          departmentId,
          roles: toBackendRoles(user.roles),
          enabled: user.isActive,
          initialPassword: 'ChangeMe@123',
        };

        return this.http
          .post<BackendUserResponse>(buildApiUrl('/api/v1/admin/users'), payload)
          .pipe(
            map((response) => this.mapUser(response)),
            tap((created) => this.usersSubject.next([...this.usersSubject.value, created])),
            catchError((error) => throwError(() => new Error(this.toBackendErrorMessage(error, 'Creation utilisateur impossible.')))),
          );
      }),
    );
  }

  updateUser(id: string, updates: Partial<User>): Observable<User | null> {
    const current = this.usersSubject.value.find((user) => user.id === id);
    if (!current) {
      return of(null);
    }

    const merged = { ...current, ...updates };

    return this.getDepartments().pipe(
      map((departments) => this.resolveDepartmentId(merged.department, departments)),
      switchMap((departmentId) => {
        const payload: BackendUserUpdateRequest = {
          email: merged.email,
          firstName: merged.firstName,
          lastName: merged.lastName,
          phone: merged.phone || '',
          departmentId,
          enabled: merged.isActive,
        };

        return this.http
          .put<BackendUserResponse>(buildApiUrl(`/api/v1/admin/users/${id}`), payload)
          .pipe(
            map((response) => this.mapUser(response)),
            switchMap((updatedUser) => this.assignRoles(id, merged.roles).pipe(
              map((roleUpdated) => roleUpdated || updatedUser),
            )),
            tap((updated) => this.replaceUser(updated)),
            catchError((error) => throwError(() => new Error(this.toBackendErrorMessage(error, 'Mise a jour utilisateur impossible.')))),
          );
      }),
    );
  }

  assignRoles(userId: string, roles: string[]): Observable<User | null> {
    const payload: BackendAssignRolesRequest = {
      roles: toBackendRoles(roles),
    };

    return this.http
      .put<BackendUserResponse>(buildApiUrl(`/api/v1/admin/users/${userId}/roles`), payload)
      .pipe(
        map((response) => this.mapUser(response)),
        tap((updated) => this.replaceUser(updated)),
        catchError((error: HttpErrorResponse) => {
          if (error.status === 404) {
            return of(null);
          }
          return throwError(() => new Error(this.toBackendErrorMessage(error, 'Affectation des roles impossible.')));
        }),
      );
  }

  deactivateUser(id: string): Observable<User | null> {
    return this.updateUser(id, { isActive: false });
  }

  activateUser(id: string): Observable<User | null> {
    return this.updateUser(id, { isActive: true });
  }

  deleteUser(id: string): Observable<boolean> {
    return this.http
      .delete<void>(buildApiUrl(`/api/v1/admin/users/${id}`))
      .pipe(
        map(() => true),
        tap(() => this.usersSubject.next(this.usersSubject.value.filter((user) => user.id !== id))),
        catchError((error) => throwError(() => new Error(this.toBackendErrorMessage(error, 'Suppression utilisateur impossible.')))),
      );
  }

  getUserStatistics(): Observable<UserStatistics> {
    return this.fetchAllUsersForStats().pipe(
      map((users) => {
        const activeUsers = users.filter((user) => user.isActive);
        const inactiveUsers = users.filter((user) => !user.isActive);

        return {
          totalUsers: users.length,
          activeUsers: activeUsers.length,
          inactiveUsers: inactiveUsers.length,
          usersByRole: this.getUsersByRole(users),
          newUsersThisMonth: users.filter((user) => user.createdAt >= new Date(Date.now() - 2592000000)).length,
          userActivityChart: this.generateActivityChart(users),
        } satisfies UserStatistics;
      }),
    );
  }

  // Audit Logs (no backend endpoint available yet)
  getAuditLogs(): Observable<AuditLog[]> {
    return this.auditLogs$;
  }

  getAuditLogsByUser(userId: string): Observable<AuditLog[]> {
    const logs = this.auditLogsSubject.value.filter((item) => item.userId === userId);
    return of(logs);
  }

  getAuditLogsByEntity(entityType: string, entityId: string): Observable<AuditLog[]> {
    const logs = this.auditLogsSubject.value.filter((item) =>
      item.entityType === entityType && item.entityId === entityId,
    );
    return of(logs);
  }

  // System Configuration (no backend endpoint available yet)
  getSystemConfig(): Observable<SystemConfig[]> {
    return this.systemConfig$;
  }

  getConfigByKey(key: string): Observable<SystemConfig | undefined> {
    return of(this.systemConfigSubject.value.find((config) => config.key === key));
  }

  updateSystemConfig(id: string, updates: Partial<SystemConfig>): Observable<SystemConfig | null> {
    return this.unsupportedOperation(
      'Configuration systeme non modifiee: aucun endpoint backend ne persiste cette ancienne methode.',
    );
  }

  // Role Permissions
  getAdminRoles(): Observable<AdminRole[]> {
    return this.http
      .get<ApiPageResponse<BackendRoleResponse>>(buildApiUrl('/api/v1/admin/roles'))
      .pipe(
        map((response) => extractPageContent(response).map((item) => this.mapAdminRole(item))),
        catchError((error) => throwError(() => new Error(this.toBackendErrorMessage(error, 'Chargement des roles impossible.')))),
      );
  }

  getRolePermissionMatrix(roleId: string): Observable<RolePermissionMatrix> {
    return this.http
      .get<BackendRolePermissionsResponse>(buildApiUrl(`/api/v1/admin/roles/${roleId}/permissions`))
      .pipe(
        map((response) => this.mapRolePermissionMatrix(response)),
        catchError((error) => throwError(() => new Error(this.toBackendErrorMessage(error, 'Chargement des permissions role impossible.')))),
      );
  }

  updateRolePermissionMatrix(roleId: string, permissionCodes: string[], applyToUsers: boolean): Observable<RolePermissionMatrix> {
    return this.http
      .put<BackendRolePermissionsResponse>(buildApiUrl(`/api/v1/admin/roles/${roleId}/permissions`), {
        permissionCodes,
        applyToUsers,
      })
      .pipe(
        map((response) => this.mapRolePermissionMatrix(response)),
        catchError((error) => throwError(() => new Error(this.toBackendErrorMessage(error, 'Mise a jour des permissions role impossible.')))),
      );
  }

  getRolePermissions(): Observable<RolePermission[]> {
    if (!this.authService.hasRole('ADMIN')) {
      this.rolePermissionsSubject.next([]);
      return of([]);
    }

    if (this.rolePermissionsSubject.value.length > 0) {
      return this.rolePermissionsSubject.asObservable();
    }

    return this.refreshRolePermissions();
  }

  getRolePermissionsByRole(role: string): Observable<RolePermission | undefined> {
    const perms = this.rolePermissionsSubject.value.find((item) => item.role === role);
    return of(perms);
  }

  updateRolePermissions(role: string, permissions: RolePermission['permissions']): Observable<RolePermission | null> {
    return this.unsupportedOperation(
      'Mise a jour locale des permissions role desactivee: utilisez updateRolePermissionMatrix avec le backend.',
    );
  }

  getPermissionCatalog(): Observable<PermissionDefinition[]> {
    return this.http
      .get<BackendPermissionDefinitionResponse[]>(buildApiUrl('/api/v1/admin/permissions/catalog'))
      .pipe(
        map((items) => (Array.isArray(items) ? items : []).map((item) => this.mapPermissionDefinition(item))),
        catchError((error) => throwError(() => new Error(this.toBackendErrorMessage(error, 'Chargement du catalogue permissions impossible.')))),
      );
  }

  getUserPermissionMatrix(userId: string): Observable<UserPermissionMatrix> {
    return this.http
      .get<BackendUserPermissionsResponse>(buildApiUrl(`/api/v1/admin/users/${userId}/permissions`))
      .pipe(
        map((response) => this.mapUserPermissionMatrix(response)),
        catchError((error) => throwError(() => new Error(this.toBackendErrorMessage(error, 'Chargement permissions utilisateur impossible.')))),
      );
  }

  updateUserPermissions(userId: string, permissionCodes: string[]): Observable<UserPermissionMatrix> {
    return this.http
      .put<BackendUserPermissionsResponse>(buildApiUrl(`/api/v1/admin/users/${userId}/permissions`), {
        permissionCodes,
      })
      .pipe(
        map((response) => this.mapUserPermissionMatrix(response)),
        catchError((error) => throwError(() => new Error(this.toBackendErrorMessage(error, 'Mise a jour permissions utilisateur impossible.')))),
      );
  }

  resetUserPermissions(userId: string): Observable<UserPermissionMatrix> {
    return this.http
      .delete<BackendUserPermissionsResponse>(buildApiUrl(`/api/v1/admin/users/${userId}/permissions`))
      .pipe(
        map((response) => this.mapUserPermissionMatrix(response)),
        catchError((error) => throwError(() => new Error(this.toBackendErrorMessage(error, 'Reinitialisation permissions utilisateur impossible.')))),
      );
  }

  // Departments / Services Management
  getDepartments(options: DepartmentQueryOptions = {}): Observable<Department[]> {
    const params: Record<string, string> = {
      page: String(options.page ?? 0),
      size: String(options.size ?? 200),
      sort: options.sort || 'name,asc',
    };
    if (options.search?.trim()) {
      params['search'] = options.search.trim();
    }
    if (typeof options.active === 'boolean') {
      params['active'] = String(options.active);
    }

    return this.http
      .get<ApiPageResponse<BackendDepartmentResponse>>(buildApiUrl('/api/v1/admin/departments'), { params })
      .pipe(
        map((response) => {
          this.departmentsPageStateSubject.next({
            page: response.page ?? options.page ?? 0,
            size: response.size ?? options.size ?? 200,
            totalElements: response.totalElements ?? 0,
            totalPages: response.totalPages ?? 0,
          });
          return extractPageContent(response).map((item) => this.mapDepartment(item));
        }),
        tap((departments) => this.departmentsSubject.next(departments)),
        catchError((error) => throwError(() => new Error(this.toBackendErrorMessage(error, 'Chargement des services impossible.')))),
      );
  }

  createDepartment(payload: Omit<Department, 'id' | 'createdAt' | 'updatedAt'>): Observable<Department> {
    const requestPayload: BackendDepartmentCreateRequest = {
      code: payload.code,
      name: payload.name,
      description: payload.description || '',
      active: payload.isActive,
    };

    return this.http
      .post<BackendDepartmentResponse>(buildApiUrl('/api/v1/admin/departments'), requestPayload)
      .pipe(
        map((response) => this.mapDepartment(response)),
        tap((created) => this.departmentsSubject.next([...this.departmentsSubject.value, created])),
        catchError((error) => throwError(() => new Error(this.toBackendErrorMessage(error, 'Creation service impossible.')))),
      );
  }

  updateDepartment(id: string, updates: Partial<Department>): Observable<Department | null> {
    const current = this.departmentsSubject.value.find((department) => department.id === id);
    if (!current) {
      return of(null);
    }

    const merged = { ...current, ...updates };
    const payload: BackendDepartmentUpdateRequest = {
      name: merged.name,
      description: merged.description || '',
      active: merged.isActive,
    };

    return this.http
      .put<BackendDepartmentResponse>(buildApiUrl(`/api/v1/admin/departments/${id}`), payload)
      .pipe(
        map((response) => this.mapDepartment(response)),
        tap((updated) => this.replaceDepartment(updated)),
        catchError((error) => throwError(() => new Error(this.toBackendErrorMessage(error, 'Mise a jour service impossible.')))),
      );
  }

  deleteDepartment(id: string): Observable<boolean> {
    return this.http
      .delete<void>(buildApiUrl(`/api/v1/admin/departments/${id}`))
      .pipe(
        map(() => true),
        tap(() => this.departmentsSubject.next(this.departmentsSubject.value.filter((department) => department.id !== id))),
        catchError((error) => throwError(() => new Error(this.toBackendErrorMessage(error, 'Suppression service impossible.')))),
      );
  }

  private refreshRolePermissions(): Observable<RolePermission[]> {
    return this.http
      .get<ApiPageResponse<BackendRoleResponse>>(buildApiUrl('/api/v1/admin/roles'))
      .pipe(
        map((response) => extractPageContent(response).map((role) => ({
          role: role.name,
          permissions: [],
        } satisfies RolePermission))),
        tap((permissions) => this.rolePermissionsSubject.next(permissions)),
        catchError((error: HttpErrorResponse) => {
          if (error.status === 403) {
            this.rolePermissionsSubject.next([]);
            return of([]);
          }
          return throwError(() => new Error(this.toBackendErrorMessage(error, 'Chargement des roles impossible.')));
        }),
      );
  }

  private mapAdminRole(response: BackendRoleResponse): AdminRole {
    return {
      id: response.id,
      name: response.name,
      description: response.description,
      systemRole: response.systemRole ?? true,
    };
  }

  private mapRolePermissionMatrix(response: BackendRolePermissionsResponse): RolePermissionMatrix {
    return {
      roleId: response.roleId,
      roleName: response.roleName,
      assignedPermissions: Array.from(new Set(response.assignedPermissions ?? [])),
      usersInRole: response.usersInRole ?? 0,
      usersUsingRoleDefaults: response.usersUsingRoleDefaults ?? 0,
      usersCustomized: response.usersCustomized ?? 0,
    };
  }

  private mapUser(response: BackendUserResponse): User {
    return {
      id: response.id,
      username: response.username,
      email: response.email,
      firstName: response.firstName,
      lastName: response.lastName,
      roles: toFrontendRoles(response.roles ?? []),
      isActive: response.enabled,
      createdAt: this.toDate(response.createdAt),
      updatedAt: this.toDate(response.updatedAt),
      permissionsCustomized: !!response.permissionsCustomized,
      permissions: Array.isArray(response.permissions) ? Array.from(new Set(response.permissions)) : [],
      department: response.department?.name,
      phone: response.phone,
    };
  }

  private mapPermissionDefinition(response: BackendPermissionDefinitionResponse): PermissionDefinition {
    return {
      code: response.code,
      module: response.module,
      action: response.action,
      label: response.label,
      description: response.description,
    };
  }

  private mapUserPermissionMatrix(response: BackendUserPermissionsResponse): UserPermissionMatrix {
    return {
      userId: response.userId,
      customized: !!response.customized,
      assignedPermissions: Array.from(new Set(response.assignedPermissions ?? [])),
      roleDerivedPermissions: Array.from(new Set(response.roleDerivedPermissions ?? [])),
      effectivePermissions: Array.from(new Set(response.effectivePermissions ?? [])),
    };
  }

  private mapDepartment(response: BackendDepartmentResponse): Department {
    return {
      id: response.id,
      name: response.name,
      code: response.code,
      description: response.description,
      isActive: response.active,
      createdAt: this.toDate(response.createdAt),
      updatedAt: this.toDate(response.updatedAt),
    };
  }

  private resolveDepartmentId(name?: string, departments?: Department[]): string {
    const available = departments ?? this.departmentsSubject.value;
    if (available.length === 0) {
      throw new Error('Aucun service disponible. Creez un service avant de creer un utilisateur.');
    }

    if (!name) {
      return available[0].id;
    }

    const normalized = name.trim().toLowerCase();
    const found = available.find((department) =>
      department.name.trim().toLowerCase() === normalized ||
      department.code.trim().toLowerCase() === normalized,
    );

    return found?.id || available[0].id;
  }

  private fetchAllUsersForStats(pageSize = 200): Observable<User[]> {
    const firstPage = 0;
    return this.requestUsersPageForStats(firstPage, pageSize).pipe(
      expand((response) => {
        const currentPage = response.page ?? 0;
        const isLastPage = currentPage + 1 >= (response.totalPages ?? 1);

        if (isLastPage) {
          return EMPTY;
        }

        return this.requestUsersPageForStats(currentPage + 1, pageSize);
      }),
      map((response) => extractPageContent(response).map((item) => this.mapUser(item))),
      reduce((allUsers, pageUsers) => [...allUsers, ...pageUsers], [] as User[]),
      catchError((error) => throwError(() => new Error(this.toBackendErrorMessage(error, 'Chargement statistiques utilisateurs impossible.')))),
    );
  }

  private requestUsersPageForStats(page: number, size: number): Observable<ApiPageResponse<BackendUserResponse>> {
    const params: Record<string, string> = {
      page: String(page),
      size: String(size),
      sort: 'createdAt,asc',
    };

    return this.http.get<ApiPageResponse<BackendUserResponse>>(buildApiUrl('/api/v1/admin/users'), { params });
  }

  private replaceUser(updated: User): void {
    const users = this.usersSubject.value;
    const index = users.findIndex((user) => user.id === updated.id);

    if (index < 0) {
      this.usersSubject.next([...users, updated]);
      return;
    }

    users[index] = updated;
    this.usersSubject.next([...users]);
  }

  private replaceDepartment(updated: Department): void {
    const departments = this.departmentsSubject.value;
    const index = departments.findIndex((department) => department.id === updated.id);

    if (index < 0) {
      this.departmentsSubject.next([...departments, updated]);
      return;
    }

    departments[index] = updated;
    this.departmentsSubject.next([...departments]);
  }

  private toDate(value?: string): Date {
    if (!value) {
      return new Date();
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  }

  private getUsersByRole(users: User[]): UserStatistics['usersByRole'] {
    const roleMap = new Map<string, number>();

    users.forEach((user) => {
      user.roles.forEach((role) => {
        roleMap.set(role, (roleMap.get(role) || 0) + 1);
      });
    });

    return Array.from(roleMap.entries()).map(([role, count]) => ({ role, count }));
  }

  private generateActivityChart(users: User[]): Array<{ date: string; count: number }> {
    const chart: Array<{ date: string; count: number }> = [];

    for (let offset = 6; offset >= 0; offset -= 1) {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - offset);

      const dateStr = date.toISOString().split('T')[0];
      const count = users.filter((user) => {
        const created = new Date(user.createdAt);
        created.setHours(0, 0, 0, 0);
        return created.getTime() === date.getTime();
      }).length;

      chart.push({ date: dateStr, count });
    }

    return chart;
  }

  private toBackendErrorMessage(error: unknown, fallbackMessage: string): string {
    if (error instanceof HttpErrorResponse) {
      const detail = typeof error.error === 'object' && typeof error.error?.detail === 'string'
        ? error.error.detail
        : '';

      if (detail) {
        return detail;
      }

      if (error.status === 0) {
        return 'Backend inaccessible. Verifiez que les services sont demarres.';
      }
    }

    if (error instanceof Error && error.message) {
      return error.message;
    }

    return fallbackMessage;
  }

  private unsupportedOperation<T>(message: string): Observable<T> {
    return throwError(() => new Error(message));
  }
}
