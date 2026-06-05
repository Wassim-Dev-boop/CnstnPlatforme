export type WorkflowType =
  | 'EVENT_WORKFLOW'
  | 'ROOM_RESERVATION_WORKFLOW'
  | 'EQUIPMENT_RESERVATION_WORKFLOW'
  | 'EXTERNAL_PARTNER_WORKFLOW'
  | 'INTERVENTION_WORKFLOW'
  | 'GED_DOCUMENT_WORKFLOW';

export type WorkflowConditionType =
  | 'TOUJOURS'
  | 'RESERVATION_PHYSIQUE'
  | 'EVENEMENT_PRESENTIEL'
  | 'EVENEMENT_HYBRIDE'
  | 'PARTENAIRE_EXTERNE'
  | 'DOCUMENT_CONFIDENTIEL'
  | 'INTERVENTION_IT'
  | 'INTERVENTION_CRITIQUE';

export type WorkflowActionType =
  | 'SUBMIT'
  | 'VALIDATE'
  | 'REJECT'
  | 'APPROVE'
  | 'ASSIGN'
  | 'PROCESS'
  | 'REQUEST_CHANGES'
  | 'PUBLISH'
  | 'CANCEL'
  | 'ARCHIVE'
  | 'CLOSE';

export type WorkflowAuditActionType =
  | 'CREATE_WORKFLOW'
  | 'UPDATE_WORKFLOW'
  | 'CREATE_STEP'
  | 'UPDATE_STEP'
  | 'ENABLE_STEP'
  | 'DISABLE_STEP'
  | 'REORDER_STEP'
  | 'CHANGE_ROLE'
  | 'CHANGE_CONDITION'
  | 'ACTIVATE_WORKFLOW';

export interface WorkflowSummary {
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
  createdAt?: Date;
  lastModifiedAt: Date;
}

export interface WorkflowStep {
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
  conditionType: WorkflowConditionType;
  allowedActions: WorkflowActionType[];
}

export interface WorkflowDetail {
  workflowId: string;
  workflowType: WorkflowType;
  workflowLabel: string;
  moduleName: string;
  description: string;
  active: boolean;
  configurationValid: boolean;
  configurationIssues: string[];
  updatedBy?: string;
  createdAt?: Date;
  updatedAt: Date;
  steps: WorkflowStep[];
}

export interface WorkflowOption {
  code: string;
  label: string;
}

export interface WorkflowStepTemplate {
  stepCode: string;
  label: string;
  description: string;
  defaultRole: string;
  defaultCondition: WorkflowConditionType;
  defaultActions: WorkflowActionType[];
  required: boolean;
  refusalReasonRequired: boolean;
  critical: boolean;
}

export interface WorkflowCatalog {
  stepTemplates: WorkflowStepTemplate[];
  roles: WorkflowOption[];
  conditions: WorkflowOption[];
  actions: WorkflowOption[];
}

export interface WorkflowAuditLog {
  id: string;
  workflowType: WorkflowType;
  actionType: WorkflowAuditActionType;
  actorUsername: string;
  oldConfig?: string;
  newConfig?: string;
  comment?: string;
  createdAt: Date;
}

export interface WorkflowStepUpsertPayload {
  stepCode: string;
  stepLabel: string;
  stepOrder: number;
  responsibleRole: string;
  required: boolean;
  refusalReasonRequired: boolean;
  active: boolean;
  conditionType: WorkflowConditionType;
  allowedActions: WorkflowActionType[];
}

export interface WorkflowUpdatePayload {
  description: string;
  active: boolean;
  steps: WorkflowStepUpsertPayload[];
  confirmCriticalChange?: boolean;
}

export interface WorkflowToggleRequest {
  active: boolean;
  confirmCriticalChange?: boolean;
}

export interface WorkflowGeneralUpdateRequest {
  workflowLabel?: string;
  description?: string;
  active?: boolean;
  comment?: string;
}

export interface WorkflowStepUpdatePayload {
  stepLabel: string;
  responsibleRole: string;
  required: boolean;
  refusalReasonRequired: boolean;
  active: boolean;
  conditionType: WorkflowConditionType;
  allowedActions: WorkflowActionType[];
  confirmCriticalChange?: boolean;
  comment?: string;
}

export interface WorkflowStepCreatePayload extends WorkflowStepUpdatePayload {
  stepCode: string;
  stepOrder?: number;
}

export interface WorkflowStepReorderPayload {
  stepIds: string[];
  comment?: string;
}

export interface WorkflowPreviewRequest {
  scenarioLabel?: string;
  reservationPhysique?: boolean;
  evenementPresentiel?: boolean;
  evenementHybride?: boolean;
  partenaireExterne?: boolean;
  documentConfidentiel?: boolean;
  interventionIt?: boolean;
  interventionCritique?: boolean;
}

export interface WorkflowPreviewStep {
  stepId: string;
  stepCode: string;
  stepLabel: string;
  stepOrder: number;
  responsibleRoleLabel: string;
  conditionLabel: string;
}

export interface WorkflowPreviewResponse {
  workflowLabel: string;
  scenarioLabel: string;
  previewPath: string;
  selectedSteps: WorkflowPreviewStep[];
}
