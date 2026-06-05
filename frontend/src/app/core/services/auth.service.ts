import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, catchError, finalize, map, of, switchMap, tap, throwError } from 'rxjs';
import { Router } from '@angular/router';
import {
  buildApiUrl,
} from '../config/backend-api.config';
import { AppRole, AppUserProfile } from '../models/auth.model';
import { toFrontendRoles } from '../utils/role-mapper.util';

interface BackendDepartmentResponse {
  name?: string;
}

interface BackendProfileResponse {
  id?: string;
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  department?: BackendDepartmentResponse;
  roles?: string[];
}

interface BackendMyPermissionsResponse {
  customized?: boolean;
  effectivePermissions?: string[];
}

interface KeycloakTokenResponse {
  access_token?: string;
  refresh_token?: string;
}

interface KeycloakJwtPayload {
  sub?: string;
  email?: string;
  given_name?: string;
  family_name?: string;
  preferred_username?: string;
  realm_access?: {
    roles?: string[];
  };
}

interface PasswordRecoveryResponse {
  message?: string;
}

interface LogoutRequest {
  refresh_token: string;
}

interface ProfileUpdatePayload {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

interface SignupRequestPayload {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  departmentId?: string;
  password: string;
  confirmPassword: string;
}

interface SignupResponsePayload {
  message?: string;
}

interface PublicDepartmentResponse {
  id: string;
  code: string;
  name: string;
  description?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly storageKey = 'enterprise-auth-user';
  private readonly permissionStorageKey = 'enterprise-auth-permissions';
  private readonly appRoles: AppRole[] = [
    'ADMIN',
    'MANAGER',
    'ROOM_MANAGER',
    'IT_MANAGER',
    'SECURITY_MANAGER',
    'DSN_DIRECTOR',
    'QUALITY_MANAGER',
    'EMPLOYEE',
  ];

  private readonly roleLabelsMap: Record<AppRole, string> = {
    ADMIN: 'Administrateur',
    EMPLOYEE: 'Employe',
    MANAGER: 'Chef hierarchique',
    ROOM_MANAGER: 'Responsable salle',
    IT_MANAGER: 'Responsable IT',
    SECURITY_MANAGER: 'Responsable securite',
    DSN_DIRECTOR: 'Directeur DSN',
    QUALITY_MANAGER: 'Responsable qualite'
  };

  private readonly defaultPermissionsByRole: Record<AppRole, string[]> = {
    ADMIN: [
      'VIEW_USERS_MODULE',
      'VIEW_EVENTS_MODULE',
      'VIEW_GED_MODULE',
      'VIEW_INTERVENTIONS_MODULE',
      'CREATE_USER',
      'UPDATE_USER',
      'CREATE_EVENT',
      'VALIDATE_EVENT',
      'PUBLISH_DOCUMENT',
      'CHANGE_INTERVENTION_STATUS',
    ],
    EMPLOYEE: [
      'VIEW_EVENTS_MODULE',
      'VIEW_GED_MODULE',
      'VIEW_INTERVENTIONS_MODULE',
      'CREATE_EVENT',
    ],
    MANAGER: [
      'VIEW_EVENTS_MODULE',
      'VIEW_GED_MODULE',
      'VIEW_INTERVENTIONS_MODULE',
      'CREATE_EVENT',
      'VALIDATE_EVENT',
    ],
    ROOM_MANAGER: [
      'VIEW_INTERVENTIONS_MODULE',
      'CHANGE_INTERVENTION_STATUS',
    ],
    IT_MANAGER: [
      'VIEW_INTERVENTIONS_MODULE',
    ],
    SECURITY_MANAGER: [],
    DSN_DIRECTOR: [
      'VIEW_EVENTS_MODULE',
      'VIEW_INTERVENTIONS_MODULE',
      'VALIDATE_EVENT',
    ],
    QUALITY_MANAGER: [
      'VIEW_EVENTS_MODULE',
      'VIEW_GED_MODULE',
      'CREATE_EVENT',
      'PUBLISH_DOCUMENT',
    ],
  };

  private currentUserSubject = new BehaviorSubject<AppUserProfile | null>(this.restoreUser());
  currentUser$ = this.currentUserSubject.asObservable();

  private currentRoleSubject = new BehaviorSubject<AppRole>(
    this.currentUserSubject.value?.role ?? 'EMPLOYEE'
  );
  currentRole$ = this.currentRoleSubject.asObservable();

  private currentPermissionsSubject = new BehaviorSubject<string[]>(this.restorePermissions());
  currentPermissions$ = this.currentPermissionsSubject.asObservable();

  constructor(private router: Router, private http: HttpClient) {
    this.refreshUserFromBackend();
    this.refreshPermissionsFromBackend();
  }

  get currentUser(): AppUserProfile | null {
    return this.currentUserSubject.value;
  }

  get currentRole(): AppRole {
    return this.currentRoleSubject.value;
  }

  get availableRoles(): AppRole[] {
    const current = this.currentUserSubject.value;
    if (!current) {
      return [];
    }

    const userRoles = current.roles?.length ? current.roles : [current.role];
    return Array.from(new Set(userRoles));
  }

  get roleLabels(): Record<AppRole, string> {
    return this.roleLabelsMap;
  }

  isAuthenticated(): boolean {
    return !!this.currentUserSubject.value;
  }

  signIn(identifier: string, password: string): Observable<AppUserProfile> {
    const normalizedIdentifier = identifier.trim();
    const normalizedPassword = password.trim();

    if (!normalizedIdentifier || !normalizedPassword) {
      return throwError(() => new Error('Identifiant et mot de passe obligatoires.'));
    }

    return this.http.post<KeycloakTokenResponse>(
      buildApiUrl('/api/v1/auth/login'),
      {
        identifier: normalizedIdentifier,
        password: normalizedPassword,
      },
    ).pipe(
      map((response) => ({
        accessToken: response.access_token?.trim() ?? '',
        refreshToken: response.refresh_token?.trim() ?? '',
      })),
      switchMap(({ accessToken, refreshToken }) => {
        if (!accessToken || !refreshToken) {
          return throwError(() => new Error('Token Keycloak introuvable dans la reponse.'));
        }

        this.persistBackendSession(accessToken, refreshToken);

        const fallbackUser = this.buildFallbackUserFromToken(accessToken, normalizedIdentifier);
        return this.syncWithBackendProfile(fallbackUser);
      }),
      catchError((error) => {
        this.clearBackendSession();
        return throwError(() => new Error(this.toSignInErrorMessage(error)));
      }),
    );
  }

  forgotPassword(email: string): Observable<string> {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      return throwError(() => new Error('Email obligatoire.'));
    }

    const payload = { email: normalizedEmail };
    return this.http.post<PasswordRecoveryResponse>(
      buildApiUrl('/api/v1/auth/forgot-password'),
      payload,
    ).pipe(
      catchError((error) => {
        if (error instanceof HttpErrorResponse && error.status === 404) {
          return this.http.post<PasswordRecoveryResponse>(
            buildApiUrl('/api/v1/password/forgot'),
            payload,
          );
        }
        return throwError(() => error);
      }),
      map((response) => response.message?.trim() || 'Si cette adresse existe, un email de reinitialisation sera envoye.'),
      catchError((error) => throwError(() => new Error(this.toPasswordRecoveryErrorMessage(error)))),
    );
  }

  resetPassword(token: string, newPassword: string, confirmPassword: string): Observable<string> {
    const normalizedToken = token.trim();
    const normalizedNewPassword = newPassword.trim();
    const normalizedConfirmPassword = confirmPassword.trim();

    if (!normalizedToken || !normalizedNewPassword || !normalizedConfirmPassword) {
      return throwError(() => new Error('Token, mot de passe et confirmation sont obligatoires.'));
    }

    if (normalizedNewPassword.length < 8 || normalizedConfirmPassword.length < 8) {
      return throwError(() => new Error('Le mot de passe doit contenir au moins 8 caracteres.'));
    }

    if (normalizedNewPassword !== normalizedConfirmPassword) {
      return throwError(() => new Error('Les mots de passe ne correspondent pas.'));
    }

    const payload = {
      token: normalizedToken,
      newPassword: normalizedNewPassword,
      confirmPassword: normalizedConfirmPassword,
    };

    return this.http.post<PasswordRecoveryResponse>(
      buildApiUrl('/api/v1/auth/reset-password'),
      payload,
    ).pipe(
      catchError((error) => {
        if (error instanceof HttpErrorResponse && error.status === 404) {
          return this.http.post<PasswordRecoveryResponse>(
            buildApiUrl('/api/v1/password/reset'),
            payload,
          );
        }
        return throwError(() => error);
      }),
      map((response) => response.message?.trim() || 'Mot de passe reinitialise avec succes.'),
      catchError((error) => throwError(() => new Error(this.toPasswordRecoveryErrorMessage(error)))),
    );
  }

  signUp(payload: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    departmentId?: string;
    password: string;
    confirmPassword: string;
  }): Observable<string> {
    const requestPayload: SignupRequestPayload = {
      firstName: payload.firstName.trim(),
      lastName: payload.lastName.trim(),
      email: payload.email.trim().toLowerCase(),
      phone: (payload.phone || '').trim() || undefined,
      departmentId: payload.departmentId?.trim() || undefined,
      password: payload.password.trim(),
      confirmPassword: payload.confirmPassword.trim(),
    };

    if (!requestPayload.firstName || !requestPayload.lastName || !requestPayload.email || !requestPayload.password || !requestPayload.confirmPassword) {
      return throwError(() => new Error('Tous les champs obligatoires doivent etre renseignes.'));
    }

    if (requestPayload.password !== requestPayload.confirmPassword) {
      return throwError(() => new Error('La confirmation du mot de passe ne correspond pas.'));
    }

    return this.http.post<SignupResponsePayload>(
      buildApiUrl('/api/v1/auth/signup'),
      requestPayload,
    ).pipe(
      map((response) => response.message?.trim() || 'Votre demande de compte a ete envoyee. Elle doit etre validee par un administrateur.'),
      catchError((error) => throwError(() => new Error(this.toSignupErrorMessage(error)))),
    );
  }

  getPublicDepartments(): Observable<Array<{ id: string; code: string; name: string }>> {
    return this.http.get<PublicDepartmentResponse[]>(
      buildApiUrl('/api/v1/public/departments'),
    ).pipe(
      map((departments) => Array.isArray(departments)
        ? departments.map((department) => ({
            id: department.id,
            code: department.code,
            name: department.name,
          }))
        : []),
      catchError(() => of([])),
    );
  }

  signOut(): void {
    const refreshToken = this.readRefreshToken();
    const accessToken = this.readBackendToken();

    if (!refreshToken || !accessToken) {
      this.clearBackendSession();
      void this.router.navigate(['/login']);
      return;
    }

    const payload: LogoutRequest = {
      refresh_token: refreshToken,
    };

    this.http.post<void>(buildApiUrl('/api/v1/auth/logout'), payload).pipe(
      catchError(() => of(undefined)),
      finalize(() => {
        this.clearBackendSession();
        void this.router.navigate(['/login']);
      }),
    ).subscribe();
  }

  switchRole(role: AppRole): void {
    const current = this.currentUserSubject.value;
    if (!current) {
      return;
    }

    const allowedRoles = current.roles?.length ? current.roles : [current.role];
    if (!allowedRoles.includes(role)) {
      return;
    }

    const updatedUser: AppUserProfile = {
      ...current,
      role,
      roles: allowedRoles
    };

    this.persistUser(updatedUser);
    this.currentUserSubject.next(updatedUser);
    this.currentRoleSubject.next(role);
  }

  hasRole(...roles: AppRole[]): boolean {
    const current = this.currentUserSubject.value;
    if (!current) {
      return false;
    }

    return roles.some(role => current.roles.includes(role) || current.role === role);
  }

  canAccess(requiredRoles: AppRole[]): boolean {
    if (requiredRoles.length === 0) {
      return this.isAuthenticated();
    }

    return this.hasRole(...requiredRoles);
  }

  hasPermission(permissionCode: string): boolean {
    const normalizedCode = permissionCode.trim();
    if (!normalizedCode) {
      return true;
    }

    const effectivePermissions = this.getEffectivePermissions();
    return effectivePermissions.includes(normalizedCode);
  }

  hasAllPermissions(permissionCodes: string[] | undefined): boolean {
    if (!permissionCodes || permissionCodes.length === 0) {
      return true;
    }

    return permissionCodes.every((permissionCode) => this.hasPermission(permissionCode));
  }

  reloadPermissions(): void {
    this.refreshPermissionsFromBackend();
  }

  updateProfile(changes: Partial<Pick<AppUserProfile, 'firstName' | 'lastName' | 'email' | 'phone'>>): Observable<AppUserProfile> {
    const current = this.currentUserSubject.value;
    if (!current) {
      return throwError(() => new Error('Utilisateur non authentifie.'));
    }

    const payload: ProfileUpdatePayload = {
      email: (changes.email ?? current.email).trim(),
      firstName: (changes.firstName ?? current.firstName).trim(),
      lastName: (changes.lastName ?? current.lastName).trim(),
      phone: (changes.phone ?? current.phone ?? '').trim(),
    };

    if (!payload.email || !payload.firstName || !payload.lastName) {
      return throwError(() => new Error('Nom, prenom et email sont obligatoires.'));
    }

    return this.http.patch<BackendProfileResponse>(
      buildApiUrl('/api/v1/me/profile'),
      payload,
    ).pipe(
      map((response) => this.mapBackendProfile(response, current)),
      map((updatedUser) => ({
        ...updatedUser,
        permissionsCustomized: current.permissionsCustomized,
        permissions: current.permissions ?? this.resolveDefaultPermissionsForRoles(updatedUser.roles),
      })),
      tap((updatedUser) => {
        this.persistUser(updatedUser);
        this.currentUserSubject.next(updatedUser);
        this.currentRoleSubject.next(updatedUser.role);
      }),
      catchError((error) => throwError(() => new Error(this.toProfileUpdateErrorMessage(error)))),
    );
  }

  private persistUser(user: AppUserProfile): void {
    localStorage.setItem(this.storageKey, JSON.stringify(user));
  }

  private persistBackendSession(accessToken: string, refreshToken: string): void {
    localStorage.setItem('backend_access_token', accessToken);
    localStorage.setItem('backend_refresh_token', refreshToken);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('access_token');
  }

  private clearBackendSession(): void {
    this.currentUserSubject.next(null);
    this.currentRoleSubject.next('EMPLOYEE');
    this.currentPermissionsSubject.next([]);
    localStorage.removeItem(this.storageKey);
    localStorage.removeItem(this.permissionStorageKey);
    localStorage.removeItem('backend_access_token');
    localStorage.removeItem('backend_refresh_token');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('access_token');
  }

  private syncWithBackendProfile(fallbackUser: AppUserProfile): Observable<AppUserProfile> {
    if (!this.readBackendToken()) {
      const fallbackWithPermissions = this.attachRoleDefaultPermissions(fallbackUser);
      this.persistUser(fallbackWithPermissions);
      this.currentUserSubject.next(fallbackWithPermissions);
      this.currentRoleSubject.next(fallbackWithPermissions.role);
      this.persistPermissions(fallbackWithPermissions.permissions ?? []);
      this.currentPermissionsSubject.next(fallbackWithPermissions.permissions ?? []);
      return of(fallbackWithPermissions);
    }

    return this.http.get<BackendProfileResponse>(buildApiUrl('/api/v1/me')).pipe(
      map((response) => this.mapBackendProfile(response, fallbackUser)),
      switchMap((profile) =>
        this.http.get<BackendMyPermissionsResponse>(buildApiUrl('/api/v1/me/permissions')).pipe(
          map((permissionsResponse) => this.attachEffectivePermissions(profile, permissionsResponse)),
          catchError(() => of(this.attachRoleDefaultPermissions(profile))),
        )
      ),
      tap((profileWithPermissions) => {
        this.persistUser(profileWithPermissions);
        this.currentUserSubject.next(profileWithPermissions);
        this.currentRoleSubject.next(profileWithPermissions.role);
        this.persistPermissions(profileWithPermissions.permissions ?? []);
        this.currentPermissionsSubject.next(profileWithPermissions.permissions ?? []);
      }),
      catchError(() => {
        const fallbackWithPermissions = this.attachRoleDefaultPermissions(fallbackUser);
        this.persistUser(fallbackWithPermissions);
        this.currentUserSubject.next(fallbackWithPermissions);
        this.currentRoleSubject.next(fallbackWithPermissions.role);
        this.persistPermissions(fallbackWithPermissions.permissions ?? []);
        this.currentPermissionsSubject.next(fallbackWithPermissions.permissions ?? []);
        return of(fallbackWithPermissions);
      }),
    );
  }

  private mapBackendProfile(
    response: BackendProfileResponse,
    fallbackUser: AppUserProfile,
  ): AppUserProfile {
    const backendRoles = toFrontendRoles(response.roles ?? []);
    const roles = backendRoles.length > 0 ? backendRoles : fallbackUser.roles;
    const role = this.resolvePrimaryRole(roles, fallbackUser.role);

    return {
      id: response.id || fallbackUser.id,
      username: response.username || fallbackUser.username,
      firstName: response.firstName || fallbackUser.firstName,
      lastName: response.lastName || fallbackUser.lastName,
      email: response.email || fallbackUser.email,
      phone: response.phone || fallbackUser.phone,
      department: response.department?.name || fallbackUser.department,
      roles,
      role,
    };
  }

  private attachEffectivePermissions(
    profile: AppUserProfile,
    permissionsResponse: BackendMyPermissionsResponse
  ): AppUserProfile {
    const effectivePermissions = Array.isArray(permissionsResponse.effectivePermissions)
      ? Array.from(new Set(permissionsResponse.effectivePermissions))
      : this.resolveDefaultPermissionsForRoles(profile.roles);

    return {
      ...profile,
      permissionsCustomized: !!permissionsResponse.customized,
      permissions: effectivePermissions,
    };
  }

  private buildFallbackUserFromToken(token: string, identifier: string): AppUserProfile {
    const payload = this.decodeJwtPayload(token);
    const username = payload?.preferred_username?.trim() || identifier;
    const roles = toFrontendRoles(payload?.realm_access?.roles ?? []);
    const firstName = payload?.given_name?.trim() || this.extractFirstName(username);
    const lastName = payload?.family_name?.trim() || '';
    const email = payload?.email?.trim() || this.extractEmail(identifier);

    return {
      id: payload?.sub || `user-${Date.now()}`,
      username,
      firstName,
      lastName,
      email,
      roles: roles.length > 0 ? roles : ['EMPLOYEE'],
      role: this.resolvePrimaryRole(roles, 'EMPLOYEE'),
    };
  }

  private resolvePrimaryRole(roles: AppRole[], fallback: AppRole = 'EMPLOYEE'): AppRole {
    if (!Array.isArray(roles) || roles.length === 0) {
      return fallback;
    }

    const normalizedRoles = Array.from(new Set(
      roles.filter((role): role is AppRole => this.appRoles.includes(role))
    ));

    if (normalizedRoles.length === 0) {
      return fallback;
    }

    const orderedRoles = [...this.appRoles];
    const firstByPriority = orderedRoles.find((role) => normalizedRoles.includes(role));
    return firstByPriority ?? fallback;
  }

  private decodeJwtPayload(token: string): KeycloakJwtPayload | null {
    const tokenParts = token.split('.');
    if (tokenParts.length < 2) {
      return null;
    }

    let payload = tokenParts[1].replace(/-/g, '+').replace(/_/g, '/');
    const remainder = payload.length % 4;
    if (remainder === 2) {
      payload += '==';
    } else if (remainder === 3) {
      payload += '=';
    } else if (remainder === 1) {
      return null;
    }

    try {
      return JSON.parse(atob(payload)) as KeycloakJwtPayload;
    } catch {
      return null;
    }
  }

  private extractFirstName(identifier: string): string {
    const safeIdentifier = identifier.trim();
    if (!safeIdentifier) {
      return 'Utilisateur';
    }

    const firstToken = safeIdentifier
      .replace('@', '.')
      .split(/[.\-_]/)
      .map((part) => part.trim())
      .find((part) => !!part);

    if (!firstToken) {
      return 'Utilisateur';
    }

    return firstToken.charAt(0).toUpperCase() + firstToken.slice(1);
  }

  private extractEmail(identifier: string): string {
    const normalized = identifier.trim();
    if (normalized.includes('@')) {
      return normalized;
    }

    return `${normalized}@cnstn.local`;
  }

  private toSignInErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) {
        return 'Connexion au backend impossible. Verifiez que les services sont demarres.';
      }

      if (error.status === 400 || error.status === 401) {
        return 'Identifiant ou mot de passe invalide.';
      }

      const detail = typeof error.error === 'object' && typeof error.error?.detail === 'string'
        ? error.error.detail
        : '';

      if (detail) {
        return detail;
      }

      if (typeof error.error === 'object' && typeof error.error?.error_description === 'string') {
        return error.error.error_description;
      }
    }

    if (error instanceof Error && error.message) {
      return error.message;
    }

    return 'Echec de connexion.';
  }

  private toProfileUpdateErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) {
        return 'Backend inaccessible. Verifiez que les services sont demarres.';
      }

      const detail = typeof error.error === 'object' && typeof error.error?.detail === 'string'
        ? error.error.detail
        : '';

      if (error.status === 400) {
        return detail || 'Donnees invalides. Verifiez les champs du profil.';
      }

      if (error.status === 401 || error.status === 403) {
        return 'Session invalide ou droits insuffisants pour modifier le profil.';
      }

      if (error.status === 502) {
        return 'Service externe indisponible. Reessayez dans quelques secondes.';
      }

      if (detail) {
        return detail;
      }
    }

    if (error instanceof Error && error.message) {
      return error.message;
    }

    return 'Echec de mise a jour du profil.';
  }

  private toPasswordRecoveryErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) {
        return 'Backend inaccessible. Verifiez que les services sont demarres.';
      }

      const detail = typeof error.error === 'object' && typeof error.error?.detail === 'string'
        ? error.error.detail
        : '';

      if (error.status === 400) {
        return detail || 'Donnees invalides. Verifiez les champs saisis.';
      }

      if (error.status === 404) {
        return detail || 'Lien de reinitialisation invalide.';
      }

      if (error.status === 502) {
        return 'Service externe indisponible. Reessayez dans quelques secondes.';
      }

      if (detail) {
        return detail;
      }
    }

    if (error instanceof Error && error.message) {
      return error.message;
    }

    return 'Operation impossible pour le moment.';
  }

  private toSignupErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) {
        return 'Backend inaccessible. Verifiez que les services sont demarres.';
      }

      const detail = typeof error.error === 'object' && typeof error.error?.detail === 'string'
        ? error.error.detail
        : '';

      if (error.status === 400) {
        return detail || 'Les donnees d inscription sont invalides.';
      }

      if (error.status === 409) {
        return detail || 'Un compte existe deja avec cet email.';
      }

      if (detail) {
        return detail;
      }
    }

    if (error instanceof Error && error.message) {
      return error.message;
    }

    return 'Inscription impossible pour le moment.';
  }

  private refreshPermissionsFromBackend(): void {
    const restoredUser = this.currentUserSubject.value;
    if (!restoredUser || !this.readBackendToken()) {
      return;
    }

    this.http.get<BackendMyPermissionsResponse>(buildApiUrl('/api/v1/me/permissions')).pipe(
      map((response) => {
        const effectivePermissions = Array.from(new Set(response.effectivePermissions ?? []));
        return {
          customized: !!response.customized,
          effectivePermissions,
        };
      }),
      catchError(() => of({
        customized: false,
        effectivePermissions: this.resolveDefaultPermissionsForRoles(restoredUser.roles),
      })),
    ).subscribe((permissions) => {
      const current = this.currentUserSubject.value;
      if (!current) {
        return;
      }

      const updatedUser: AppUserProfile = {
        ...current,
        permissionsCustomized: permissions.customized,
        permissions: permissions.effectivePermissions,
      };

      this.persistUser(updatedUser);
      this.persistPermissions(permissions.effectivePermissions);
      this.currentUserSubject.next(updatedUser);
      this.currentPermissionsSubject.next(permissions.effectivePermissions);
    });
  }

  private getEffectivePermissions(): string[] {
    const explicitPermissions = this.currentPermissionsSubject.value;
    if (explicitPermissions.length > 0) {
      return explicitPermissions;
    }

    const current = this.currentUserSubject.value;
    if (!current) {
      return [];
    }

    return this.resolveDefaultPermissionsForRoles(current.roles);
  }

  private attachRoleDefaultPermissions(user: AppUserProfile): AppUserProfile {
    const defaults = this.resolveDefaultPermissionsForRoles(user.roles);
    return {
      ...user,
      permissionsCustomized: false,
      permissions: defaults,
    };
  }

  private resolveDefaultPermissionsForRoles(roles: AppRole[]): string[] {
    const normalizedRoles = Array.from(new Set(roles));
    const merged = new Set<string>();

    normalizedRoles.forEach((role) => {
      (this.defaultPermissionsByRole[role] ?? []).forEach((permissionCode) => merged.add(permissionCode));
    });

    if (normalizedRoles.includes('QUALITY_MANAGER')) {
      (this.defaultPermissionsByRole.EMPLOYEE ?? []).forEach((permissionCode) => merged.add(permissionCode));
    }

    return Array.from(merged);
  }

  private persistPermissions(permissionCodes: string[]): void {
    localStorage.setItem(this.permissionStorageKey, JSON.stringify(permissionCodes));
  }

  private restorePermissions(): string[] {
    const raw = localStorage.getItem(this.permissionStorageKey);
    if (!raw) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw) as string[];
      return Array.isArray(parsed) ? Array.from(new Set(parsed)) : [];
    } catch {
      return [];
    }
  }

  private readBackendToken(): string {
    return localStorage.getItem('backend_access_token')?.trim()
      || localStorage.getItem('auth_token')?.trim()
      || localStorage.getItem('access_token')?.trim()
      || '';
  }

  private readRefreshToken(): string {
    return localStorage.getItem('backend_refresh_token')?.trim() || '';
  }

  private refreshUserFromBackend(): void {
    const restoredUser = this.currentUserSubject.value;
    if (!restoredUser || !this.readBackendToken()) {
      return;
    }

    this.syncWithBackendProfile(restoredUser).subscribe();
  }

  private extractRolesFromStoredToken(): AppRole[] {
    const token = this.readBackendToken();
    if (!token) {
      return [];
    }

    const payload = this.decodeJwtPayload(token);
    return toFrontendRoles(payload?.realm_access?.roles ?? []);
  }

  private restoreUser(): AppUserProfile | null {
    if (!this.readBackendToken()) {
      return null;
    }

    const raw = localStorage.getItem(this.storageKey);
    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw) as AppUserProfile;
      if (!parsed?.email || !parsed?.role) {
        return null;
      }

      const persistedRoles = Array.isArray(parsed.roles) ? parsed.roles : [];
      const normalizedStoredRoles = Array.from(new Set([parsed.role, ...persistedRoles]))
        .filter((role): role is AppRole => this.appRoles.includes(role as AppRole));
      const tokenRoles = this.extractRolesFromStoredToken();
      const normalizedRoles = tokenRoles.length > 0 ? tokenRoles : normalizedStoredRoles;
      const role = normalizedRoles.includes(parsed.role) ? parsed.role : normalizedRoles[0];

      if (!role) {
        return null;
      }

      return {
        ...parsed,
        role,
        roles: normalizedRoles,
        permissionsCustomized: !!parsed.permissionsCustomized,
        permissions: Array.isArray(parsed.permissions)
          ? Array.from(new Set(parsed.permissions))
          : this.resolveDefaultPermissionsForRoles(normalizedRoles),
      };
    } catch {
      return null;
    }
  }
}
