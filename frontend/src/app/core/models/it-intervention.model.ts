export type ItWorkflowStatus =
  | 'SUBMITTED'
  | 'MANAGER_APPROVAL_PENDING'
  | 'MANAGER_APPROVED'
  | 'MANAGER_REJECTED'
  | 'DSN_APPROVAL_PENDING'
  | 'DSN_APPROVED'
  | 'DSN_REJECTED'
  | 'IT_PROCESSING_PENDING'
  | 'IT_IN_CHARGE'
  | 'IT_IN_PROGRESS'
  | 'IT_RESOLVED'
  | 'IT_CLOSED';

export type ItInterventionPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface ItIntervention {
  id: string;
  title: string;
  description: string;
  equipmentId: string;
  equipmentName?: string;
  equipmentSerialNumber?: string;
  equipmentCategory?: string;
  priority: ItInterventionPriority;
  requestedBy: string;
  requesterName?: string;
  itWorkflowStatus: ItWorkflowStatus;
  managerApproved?: boolean;
  managerApprovalNote?: string;
  managerId?: string;
  dsnApproved?: boolean;
  dsnApprovalNote?: string;
  dsnId?: string;
  itResponsibleId?: string;
  itDiagnosticComment?: string;
  equipmentAssignedAt?: Date;
  managerApprovedAt?: Date;
  dsnApprovedAt?: Date;
  itProcessingStartedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ItInterventionTransition {
  id: string;
  fromStatus?: string;
  toStatus: string;
  actorId: string;
  actorRole?: string;
  note?: string;
  createdAt: Date;
}
