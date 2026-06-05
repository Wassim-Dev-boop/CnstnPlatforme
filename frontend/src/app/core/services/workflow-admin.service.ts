import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';
import { buildApiUrl } from '../config/backend-api.config';
import {
  WorkflowAuditActionType,
  WorkflowAuditLog,
  WorkflowCatalog,
  WorkflowDetail,
  WorkflowGeneralUpdateRequest,
  WorkflowPreviewRequest,
  WorkflowPreviewResponse,
  WorkflowStepCreatePayload,
  WorkflowStepReorderPayload,
  WorkflowStepUpdatePayload,
  WorkflowSummary,
  WorkflowToggleRequest,
  WorkflowType,
  WorkflowUpdatePayload,
} from '../models/workflow.model';

interface BackendWorkflowSummary {
  workflowId: string;
  workflowType: WorkflowType;
  workflowLabel: string;
  moduleName: string;
  description: string;
  active: boolean;
  stepCount: number;
  activeStepCount: number;
  involvedRoles: string[];
  configurationValid: boolean;
  configurationStatus: string;
  updatedBy?: string;
  createdAt?: string;
  lastModifiedAt?: string;
}

interface BackendWorkflowStep {
  id: string | null;
  stepCode: string;
  stepLabel: string;
  stepOrder: number;
  responsibleRole: string;
  responsibleRoleLabel: string;
  required: boolean;
  refusalReasonRequired: boolean;
  active: boolean;
  critical: boolean;
  conditionType: string;
  allowedActions: string[];
}

interface BackendWorkflowDetail {
  workflowId: string;
  workflowType: WorkflowType;
  workflowLabel: string;
  moduleName: string;
  description: string;
  active: boolean;
  configurationValid: boolean;
  configurationIssues: string[];
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
  steps: BackendWorkflowStep[];
}

interface BackendWorkflowCatalog {
  stepTemplates: Array<{
    stepCode: string;
    label: string;
    description: string;
    defaultRole: string;
    defaultCondition: string;
    defaultActions: string[];
    required: boolean;
    refusalReasonRequired: boolean;
    critical: boolean;
  }>;
  roles: Array<{ code: string; label: string }>;
  conditions: Array<{ code: string; label: string }>;
  actions: Array<{ code: string; label: string }>;
}

interface BackendWorkflowAuditLog {
  id: string;
  workflowType: WorkflowType;
  actionType: WorkflowAuditActionType;
  actorUsername: string;
  oldConfig?: string;
  newConfig?: string;
  comment?: string;
  createdAt?: string;
}

interface BackendWorkflowPreviewResponse {
  workflowLabel: string;
  scenarioLabel: string;
  previewPath: string;
  selectedSteps: Array<{
    stepId: string;
    stepCode: string;
    stepLabel: string;
    stepOrder: number;
    responsibleRoleLabel: string;
    conditionLabel: string;
  }>;
}

@Injectable({
  providedIn: 'root'
})
export class WorkflowAdminService {

  constructor(private http: HttpClient) {}

  listWorkflows(): Observable<WorkflowSummary[]> {
    return this.http
      .get<BackendWorkflowSummary[]>(buildApiUrl('/api/v1/admin/workflows'))
      .pipe(
        map((items) => (Array.isArray(items) ? items : []).map((item) => this.mapWorkflowSummary(item))),
        catchError((error) => throwError(() => new Error(this.toBackendErrorMessage(error, 'Chargement des workflows impossible.')))),
      );
  }

  getWorkflow(workflowId: string): Observable<WorkflowDetail> {
    return this.http
      .get<BackendWorkflowDetail>(buildApiUrl(`/api/v1/admin/workflows/${workflowId}`))
      .pipe(
        map((item) => this.mapWorkflowDetail(item)),
        catchError((error) => throwError(() => new Error(this.toBackendErrorMessage(error, 'Chargement du workflow impossible.')))),
      );
  }

  getWorkflowByType(workflowType: WorkflowType): Observable<WorkflowDetail> {
    return this.http
      .get<BackendWorkflowDetail>(buildApiUrl(`/api/v1/admin/workflows/type/${workflowType}`))
      .pipe(
        map((item) => this.mapWorkflowDetail(item)),
        catchError((error) => throwError(() => new Error(this.toBackendErrorMessage(error, 'Chargement du workflow impossible.')))),
      );
  }

  getCatalog(workflowType: WorkflowType): Observable<WorkflowCatalog> {
    return this.http
      .get<BackendWorkflowCatalog>(buildApiUrl(`/api/v1/admin/workflows/type/${workflowType}/catalog`))
      .pipe(
        map((item) => ({
          stepTemplates: (item.stepTemplates ?? []).map((template) => ({
            stepCode: template.stepCode,
            label: template.label,
            description: template.description,
            defaultRole: template.defaultRole,
            defaultCondition: template.defaultCondition as any,
            defaultActions: Array.from(new Set(template.defaultActions ?? [])) as any,
            required: !!template.required,
            refusalReasonRequired: !!template.refusalReasonRequired,
            critical: !!template.critical,
          })),
          roles: item.roles ?? [],
          conditions: item.conditions ?? [],
          actions: item.actions ?? [],
        })),
        catchError((error) => throwError(() => new Error(this.toBackendErrorMessage(error, 'Chargement du catalogue workflow impossible.')))),
      );
  }

  getAudits(filters?: { workflowId?: string; actionType?: WorkflowAuditActionType | '' }): Observable<WorkflowAuditLog[]> {
    let params = new HttpParams();
    if (filters?.workflowId) {
      params = params.set('workflowId', filters.workflowId);
    }
    if (filters?.actionType) {
      params = params.set('action', filters.actionType);
    }

    return this.http
      .get<BackendWorkflowAuditLog[]>(buildApiUrl('/api/v1/admin/workflows/audit'), { params })
      .pipe(
        map((items) => (Array.isArray(items) ? items : []).map((item) => ({
          id: item.id,
          workflowType: item.workflowType,
          actionType: item.actionType,
          actorUsername: item.actorUsername,
          oldConfig: item.oldConfig,
          newConfig: item.newConfig,
          comment: item.comment,
          createdAt: this.toDate(item.createdAt),
        }))),
        catchError((error) => throwError(() => new Error(this.toBackendErrorMessage(error, 'Chargement des audits workflow impossible.')))),
      );
  }

  updateWorkflowGeneral(workflowId: string, payload: WorkflowGeneralUpdateRequest): Observable<WorkflowDetail> {
    return this.http
      .put<BackendWorkflowDetail>(buildApiUrl(`/api/v1/admin/workflows/${workflowId}`), payload)
      .pipe(
        map((item) => this.mapWorkflowDetail(item)),
        catchError((error) => throwError(() => new Error(this.toBackendErrorMessage(error, 'Mise a jour du workflow impossible.')))),
      );
  }

  updateStep(workflowId: string, stepId: string, payload: WorkflowStepUpdatePayload): Observable<WorkflowDetail> {
    return this.http
      .put<BackendWorkflowDetail>(buildApiUrl(`/api/v1/admin/workflows/${workflowId}/steps/${stepId}`), payload)
      .pipe(
        map((item) => this.mapWorkflowDetail(item)),
        catchError((error) => throwError(() => new Error(this.toBackendErrorMessage(error, 'Mise a jour de l etape impossible.')))),
      );
  }

  addStep(workflowId: string, payload: WorkflowStepCreatePayload): Observable<WorkflowDetail> {
    return this.http
      .post<BackendWorkflowDetail>(buildApiUrl(`/api/v1/admin/workflows/${workflowId}/steps`), payload)
      .pipe(
        map((item) => this.mapWorkflowDetail(item)),
        catchError((error) => throwError(() => new Error(this.toBackendErrorMessage(error, 'Ajout de l etape impossible.')))),
      );
  }

  reorderSteps(workflowId: string, payload: WorkflowStepReorderPayload): Observable<WorkflowDetail> {
    return this.http
      .put<BackendWorkflowDetail>(buildApiUrl(`/api/v1/admin/workflows/${workflowId}/steps/reorder`), payload)
      .pipe(
        map((item) => this.mapWorkflowDetail(item)),
        catchError((error) => throwError(() => new Error(this.toBackendErrorMessage(error, 'Reorganisation des etapes impossible.')))),
      );
  }

  previewWorkflow(workflowId: string, payload: WorkflowPreviewRequest): Observable<WorkflowPreviewResponse> {
    return this.http
      .post<BackendWorkflowPreviewResponse>(buildApiUrl(`/api/v1/admin/workflows/${workflowId}/preview`), payload)
      .pipe(
        map((item) => ({
          workflowLabel: item.workflowLabel,
          scenarioLabel: item.scenarioLabel,
          previewPath: item.previewPath,
          selectedSteps: item.selectedSteps ?? [],
        })),
        catchError((error) => throwError(() => new Error(this.toBackendErrorMessage(error, 'Previsualisation workflow impossible.')))),
      );
  }

  // Compatibility methods kept for full-update flow.
  updateWorkflow(workflowType: WorkflowType, payload: WorkflowUpdatePayload): Observable<WorkflowDetail> {
    return this.http
      .put<BackendWorkflowDetail>(buildApiUrl(`/api/v1/admin/workflows/type/${workflowType}`), payload)
      .pipe(
        map((item) => this.mapWorkflowDetail(item)),
        catchError((error) => throwError(() => new Error(this.toBackendErrorMessage(error, 'Mise a jour du workflow impossible.')))),
      );
  }

  toggleWorkflow(workflowType: WorkflowType, payload: WorkflowToggleRequest): Observable<WorkflowDetail> {
    return this.http
      .patch<BackendWorkflowDetail>(buildApiUrl(`/api/v1/admin/workflows/type/${workflowType}/active`), payload)
      .pipe(
        map((item) => this.mapWorkflowDetail(item)),
        catchError((error) => throwError(() => new Error(this.toBackendErrorMessage(error, 'Changement du statut workflow impossible.')))),
      );
  }

  private mapWorkflowSummary(item: BackendWorkflowSummary): WorkflowSummary {
    return {
      workflowId: item.workflowId,
      workflowType: item.workflowType,
      workflowLabel: item.workflowLabel,
      moduleName: item.moduleName,
      description: item.description,
      active: !!item.active,
      stepCount: item.stepCount ?? 0,
      activeStepCount: item.activeStepCount ?? 0,
      involvedRoles: item.involvedRoles ?? [],
      configurationValid: !!item.configurationValid,
      configurationStatus: item.configurationStatus ?? (item.configurationValid ? 'Configuration valide' : 'A verifier'),
      updatedBy: item.updatedBy,
      createdAt: this.toDate(item.createdAt),
      lastModifiedAt: this.toDate(item.lastModifiedAt),
    };
  }

  private mapWorkflowDetail(item: BackendWorkflowDetail): WorkflowDetail {
    const steps = (item.steps ?? [])
      .map((step) => ({
        id: step.id,
        stepCode: step.stepCode,
        stepLabel: step.stepLabel,
        stepOrder: step.stepOrder,
        responsibleRole: step.responsibleRole,
        responsibleRoleLabel: step.responsibleRoleLabel,
        required: !!step.required,
        refusalReasonRequired: !!step.refusalReasonRequired,
        active: !!step.active,
        critical: !!step.critical,
        conditionType: step.conditionType as any,
        allowedActions: Array.from(new Set(step.allowedActions ?? [])) as any,
      }))
      .sort((left, right) => left.stepOrder - right.stepOrder);

    return {
      workflowId: item.workflowId,
      workflowType: item.workflowType,
      workflowLabel: item.workflowLabel,
      moduleName: item.moduleName,
      description: item.description,
      active: !!item.active,
      configurationValid: !!item.configurationValid,
      configurationIssues: item.configurationIssues ?? [],
      updatedBy: item.updatedBy,
      createdAt: this.toDate(item.createdAt),
      updatedAt: this.toDate(item.updatedAt),
      steps,
    };
  }

  private toDate(value?: string): Date {
    if (!value) {
      return new Date();
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
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
}
