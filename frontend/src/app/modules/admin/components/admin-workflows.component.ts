import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import {
  WorkflowActionType,
  WorkflowAuditActionType,
  WorkflowAuditLog,
  WorkflowCatalog,
  WorkflowConditionType,
  WorkflowDetail,
  WorkflowPreviewRequest,
  WorkflowPreviewResponse,
  WorkflowStep,
  WorkflowStepCreatePayload,
  WorkflowStepUpdatePayload,
  WorkflowSummary,
} from '../../../core/models/workflow.model';
import { AuthService } from '../../../core/services/auth.service';
import { WorkflowAdminService } from '../../../core/services/workflow-admin.service';

interface StepModalModel {
  mode: 'create' | 'edit';
  stepId: string | null;
  stepCode: string;
  stepLabel: string;
  responsibleRole: string;
  required: boolean;
  refusalReasonRequired: boolean;
  active: boolean;
  conditionType: WorkflowConditionType;
  allowedActions: WorkflowActionType[];
}

interface PreviewScenario {
  key: string;
  label: string;
  request: WorkflowPreviewRequest;
}

@Component({
  selector: 'app-admin-workflows',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-workflows.component.html',
})
export class AdminWorkflowsComponent implements OnInit {
  workflows: WorkflowSummary[] = [];
  selectedWorkflowId: string | null = null;
  selectedWorkflow: WorkflowDetail | null = null;
  catalog: WorkflowCatalog | null = null;
  audits: WorkflowAuditLog[] = [];
  workflowSearchTerm = '';
  workflowStatusFilter: 'ALL' | 'ACTIVE' | 'INACTIVE' = 'ALL';

  loadingWorkflows = false;
  loadingDetail = false;
  loadingAudit = false;
  savingGeneral = false;
  savingStep = false;
  previewLoading = false;

  feedbackTone: 'success' | 'error' | 'info' = 'info';
  feedbackMessage = '';
  readonly workflowReadOnlyHint = 'Permission UPDATE_USER manquante : modifications workflows desactivees.';
  readonly auditUiEnabled = false;

  generalForm = {
    workflowLabel: '',
    description: '',
    active: true,
  };

  showStepModal = false;
  stepModalError = '';
  stepModal: StepModalModel = this.emptyStepModal();

  showAuditModal = false;
  auditWorkflowFilter = '';
  auditActionFilter: WorkflowAuditActionType | '' = '';

  previewResult: WorkflowPreviewResponse | null = null;
  previewScenarios: PreviewScenario[] = [
    {
      key: 'event-presentiel-sans-partenaire',
      label: 'Événement présentiel sans partenaire',
      request: {
        scenarioLabel: 'Événement présentiel sans partenaire',
        reservationPhysique: true,
        evenementPresentiel: true,
        partenaireExterne: false,
      },
    },
    {
      key: 'event-presentiel-avec-partenaire',
      label: 'Événement présentiel avec partenaire',
      request: {
        scenarioLabel: 'Événement présentiel avec partenaire',
        reservationPhysique: true,
        evenementPresentiel: true,
        partenaireExterne: true,
      },
    },
    {
      key: 'event-en-ligne-partenaire',
      label: 'Événement en ligne avec partenaire',
      request: {
        scenarioLabel: 'Événement en ligne avec partenaire',
        partenaireExterne: true,
      },
    },
    {
      key: 'intervention-it',
      label: 'Intervention IT',
      request: {
        scenarioLabel: 'Intervention IT',
        interventionIt: true,
        interventionCritique: true,
      },
    },
  ];

  readonly auditActionOptions: Array<{ value: WorkflowAuditActionType | ''; label: string }> = [
    { value: '', label: 'Toutes les actions' },
    { value: 'CREATE_WORKFLOW', label: 'CREATE_WORKFLOW' },
    { value: 'UPDATE_WORKFLOW', label: 'UPDATE_WORKFLOW' },
    { value: 'CREATE_STEP', label: 'CREATE_STEP' },
    { value: 'UPDATE_STEP', label: 'UPDATE_STEP' },
    { value: 'REORDER_STEP', label: 'REORDER_STEP' },
    { value: 'ENABLE_STEP', label: 'ENABLE_STEP' },
    { value: 'DISABLE_STEP', label: 'DISABLE_STEP' },
    { value: 'CHANGE_ROLE', label: 'CHANGE_ROLE' },
    { value: 'CHANGE_CONDITION', label: 'CHANGE_CONDITION' },
  ];

  constructor(
    private workflowAdminService: WorkflowAdminService,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.loadWorkflows();
  }

  get selectedSummary(): WorkflowSummary | null {
    if (!this.selectedWorkflowId) {
      return null;
    }
    return this.workflows.find((item) => item.workflowId === this.selectedWorkflowId) ?? null;
  }

  get filteredWorkflows(): WorkflowSummary[] {
    const search = this.workflowSearchTerm.trim().toLowerCase();
    return this.workflows.filter((workflow) => {
      if (this.workflowStatusFilter === 'ACTIVE' && !workflow.active) {
        return false;
      }
      if (this.workflowStatusFilter === 'INACTIVE' && workflow.active) {
        return false;
      }

      if (!search) {
        return true;
      }

      const searchable = `${workflow.moduleName} ${workflow.workflowLabel} ${workflow.description} ${workflow.workflowType}`.toLowerCase();
      return searchable.includes(search);
    });
  }

  get kpiActiveWorkflows(): number {
    return this.workflows.filter((item) => item.active).length;
  }

  get kpiInactiveWorkflows(): number {
    return this.workflows.filter((item) => !item.active).length;
  }

  get kpiConfiguredSteps(): number {
    return this.workflows.reduce((total, workflow) => total + workflow.stepCount, 0);
  }

  get kpiAlerts(): number {
    return this.workflows.filter((item) => !item.configurationValid).length;
  }

  get kpiLastModification(): Date | undefined {
    if (this.workflows.length === 0) {
      return undefined;
    }
    return this.workflows
      .map((item) => item.lastModifiedAt)
      .sort((left, right) => right.getTime() - left.getTime())[0];
  }

  get availableTemplates(): WorkflowCatalog['stepTemplates'] {
    if (!this.catalog || !this.selectedWorkflow) {
      return [];
    }

    const usedCodes = new Set(this.selectedWorkflow.steps.map((step) => step.stepCode));
    return this.catalog.stepTemplates.filter((template) => !usedCodes.has(template.stepCode));
  }

  get canAddStep(): boolean {
    return !!this.selectedWorkflow && !!this.catalog && this.availableTemplates.length > 0;
  }

  get addStepDisabledReason(): string {
    if (!this.selectedWorkflow || !this.catalog) {
      return 'Sélectionnez d abord un workflow.';
    }
    if (this.availableTemplates.length === 0) {
      return 'Toutes les étapes autorisées sont déjà configurées pour ce workflow.';
    }
    return '';
  }

  get hasGeneralChanges(): boolean {
    if (!this.selectedWorkflow) {
      return false;
    }

    return this.generalForm.workflowLabel.trim() !== this.selectedWorkflow.workflowLabel
      || this.generalForm.description.trim() !== (this.selectedWorkflow.description || '').trim()
      || this.generalForm.active !== this.selectedWorkflow.active;
  }

  canManageWorkflows(): boolean {
    return this.authService.hasPermission('UPDATE_USER');
  }

  trackByWorkflowId(_: number, workflow: WorkflowSummary): string {
    return workflow.workflowId;
  }

  trackByStepCode(_: number, step: WorkflowStep): string {
    return step.stepCode;
  }

  formatDate(value?: Date): string {
    if (!value) {
      return '-';
    }
    return value.toLocaleString('fr-FR');
  }

  loadWorkflows(reloadSelection = false): void {
    this.loadingWorkflows = true;
    this.workflowAdminService.listWorkflows().subscribe({
      next: (items) => {
        this.loadingWorkflows = false;
        this.workflows = [...items].sort((left, right) => left.moduleName.localeCompare(right.moduleName, 'fr'));

        if (this.workflows.length === 0) {
          this.selectedWorkflowId = null;
          this.selectedWorkflow = null;
          this.catalog = null;
          this.audits = [];
          return;
        }

        if (reloadSelection && this.selectedWorkflowId) {
          const exists = this.workflows.some((workflow) => workflow.workflowId === this.selectedWorkflowId);
          if (exists) {
            this.selectWorkflow(this.selectedWorkflowId);
            return;
          }
        }

        if (!this.selectedWorkflowId) {
          this.selectWorkflow(this.workflows[0].workflowId);
        }
      },
      error: (error) => {
        this.loadingWorkflows = false;
        this.feedbackTone = 'error';
        this.feedbackMessage = error instanceof Error ? error.message : 'Chargement des workflows impossible.';
      },
    });
  }

  selectWorkflow(workflowId: string): void {
    const summary = this.workflows.find((item) => item.workflowId === workflowId);
    if (!summary) {
      return;
    }

    this.selectedWorkflowId = workflowId;
    this.loadingDetail = true;
    this.feedbackMessage = '';

    forkJoin({
      detail: this.workflowAdminService.getWorkflow(workflowId),
      catalog: this.workflowAdminService.getCatalog(summary.workflowType),
      audits: this.workflowAdminService.getAudits({ workflowId }),
    }).subscribe({
      next: ({ detail, catalog, audits }) => {
        this.loadingDetail = false;
        this.selectedWorkflow = detail;
        this.catalog = catalog;
        this.audits = audits;
        this.previewResult = null;
        this.initGeneralForm();
      },
      error: (error) => {
        this.loadingDetail = false;
        this.feedbackTone = 'error';
        this.feedbackMessage = error instanceof Error ? error.message : 'Chargement du workflow impossible.';
      },
    });
  }

  refreshPage(): void {
    this.loadWorkflows(true);
    if (this.showAuditModal) {
      this.loadAudits();
    }
  }

  toggleWorkflow(workflow: WorkflowSummary, event: Event): void {
    event.stopPropagation();
    if (!this.canManageWorkflows()) {
      this.showReadOnlyWarning('Cette action');
      return;
    }

    const targetState = !workflow.active;
    if (!targetState && !window.confirm('Confirmer la désactivation de ce workflow ?')) {
      return;
    }

    this.workflowAdminService.updateWorkflowGeneral(workflow.workflowId, {
      active: targetState,
      comment: targetState ? 'Activation workflow' : 'Désactivation workflow',
    }).subscribe({
      next: (updated) => {
        this.applyUpdatedWorkflow(updated, targetState ? 'Workflow activé.' : 'Workflow désactivé.');
      },
      error: (error) => {
        this.feedbackTone = 'error';
        this.feedbackMessage = error instanceof Error ? error.message : 'Action impossible.';
      },
    });
  }

  saveGeneralInfo(): void {
    if (!this.selectedWorkflow || !this.selectedWorkflowId || this.savingGeneral || !this.hasGeneralChanges) {
      return;
    }
    if (!this.canManageWorkflows()) {
      this.showReadOnlyWarning('La mise a jour du workflow');
      return;
    }

    this.savingGeneral = true;
    this.workflowAdminService.updateWorkflowGeneral(this.selectedWorkflowId, {
      workflowLabel: this.generalForm.workflowLabel.trim(),
      description: this.generalForm.description.trim(),
      active: this.generalForm.active,
      comment: 'Mise à jour informations générales',
    }).subscribe({
      next: (updated) => {
        this.savingGeneral = false;
        this.applyUpdatedWorkflow(updated, 'Informations générales enregistrées.');
      },
      error: (error) => {
        this.savingGeneral = false;
        this.feedbackTone = 'error';
        this.feedbackMessage = error instanceof Error ? error.message : 'Enregistrement impossible.';
      },
    });
  }

  cancelGeneralInfo(): void {
    this.initGeneralForm();
    this.feedbackTone = 'info';
    this.feedbackMessage = 'Modifications annulées.';
  }

  moveStep(stepIndex: number, delta: -1 | 1): void {
    if (!this.selectedWorkflow || !this.selectedWorkflowId) {
      return;
    }
    if (!this.canManageWorkflows()) {
      this.showReadOnlyWarning('Le reordonnancement des etapes');
      return;
    }

    const ordered = [...this.selectedWorkflow.steps].sort((left, right) => left.stepOrder - right.stepOrder);
    const targetIndex = stepIndex + delta;
    if (targetIndex < 0 || targetIndex >= ordered.length) {
      return;
    }

    const swapped = [...ordered];
    [swapped[stepIndex], swapped[targetIndex]] = [swapped[targetIndex], swapped[stepIndex]];
    const stepIds = swapped.map((step) => step.id).filter((id): id is string => !!id);

    this.workflowAdminService.reorderSteps(this.selectedWorkflowId, {
      stepIds,
      comment: 'Réorganisation des étapes',
    }).subscribe({
      next: (updated) => {
        this.applyUpdatedWorkflow(updated, 'Ordre des étapes mis à jour.');
      },
      error: (error) => {
        this.feedbackTone = 'error';
        this.feedbackMessage = error instanceof Error ? error.message : 'Réorganisation impossible.';
      },
    });
  }

  toggleStep(step: WorkflowStep): void {
    if (!this.selectedWorkflow || !this.selectedWorkflowId || !step.id) {
      return;
    }
    if (!this.canManageWorkflows()) {
      this.showReadOnlyWarning('La mise a jour de l etape');
      return;
    }

    const targetActive = !step.active;
    if (step.active && step.critical && !window.confirm('Cette étape est critique. Confirmer la désactivation ?')) {
      return;
    }

    const activeCount = this.selectedWorkflow.steps.filter((item) => item.active).length;
    if (this.selectedWorkflow.active && step.active && !targetActive && activeCount <= 1) {
      this.feedbackTone = 'error';
      this.feedbackMessage = 'Un workflow actif doit conserver au moins une étape active.';
      return;
    }

    const payload = this.stepToUpdatePayload(step, targetActive);
    this.workflowAdminService.updateStep(this.selectedWorkflowId, step.id, payload).subscribe({
      next: (updated) => {
        this.applyUpdatedWorkflow(updated, targetActive ? 'Étape activée.' : 'Étape désactivée.');
      },
      error: (error) => {
        this.feedbackTone = 'error';
        this.feedbackMessage = error instanceof Error ? error.message : 'Modification d étape impossible.';
      },
    });
  }

  openEditStepModal(step: WorkflowStep): void {
    if (!this.canManageWorkflows()) {
      this.showReadOnlyWarning('La modification d etape');
      return;
    }

    this.stepModal = {
      mode: 'edit',
      stepId: step.id,
      stepCode: step.stepCode,
      stepLabel: step.stepLabel,
      responsibleRole: step.responsibleRole,
      required: step.required,
      refusalReasonRequired: step.refusalReasonRequired,
      active: step.active,
      conditionType: step.conditionType,
      allowedActions: [...step.allowedActions],
    };
    this.stepModalError = '';
    this.showStepModal = true;
  }

  openCreateStepModal(): void {
    if (!this.canManageWorkflows()) {
      this.showReadOnlyWarning('L ajout d etape');
      return;
    }

    if (!this.selectedWorkflow || !this.catalog) {
      return;
    }

    if (this.availableTemplates.length === 0) {
      this.feedbackTone = 'info';
      this.feedbackMessage = this.addStepDisabledReason;
      return;
    }

    const template = this.availableTemplates[0];
    this.stepModal = {
      mode: 'create',
      stepId: null,
      stepCode: template.stepCode,
      stepLabel: template.label,
      responsibleRole: template.defaultRole,
      required: template.required,
      refusalReasonRequired: template.refusalReasonRequired,
      active: true,
      conditionType: template.defaultCondition,
      allowedActions: [...template.defaultActions],
    };
    this.stepModalError = '';
    this.showStepModal = true;
  }

  onCreateTemplateChanged(stepCode: string): void {
    const template = this.availableTemplates.find((item) => item.stepCode === stepCode);
    if (!template) {
      return;
    }
    this.stepModal.stepCode = template.stepCode;
    this.stepModal.stepLabel = template.label;
    this.stepModal.responsibleRole = template.defaultRole;
    this.stepModal.required = template.required;
    this.stepModal.refusalReasonRequired = template.refusalReasonRequired;
    this.stepModal.conditionType = template.defaultCondition;
    this.stepModal.allowedActions = [...template.defaultActions];
    this.stepModal.active = true;
  }

  toggleModalAction(actionCode: string, event: Event): void {
    const action = actionCode as WorkflowActionType;
    const checked = !!(event.target as HTMLInputElement | null)?.checked;

    if (checked) {
      if (!this.stepModal.allowedActions.includes(action)) {
        this.stepModal.allowedActions = [...this.stepModal.allowedActions, action];
      }
      return;
    }

    this.stepModal.allowedActions = this.stepModal.allowedActions.filter((item) => item !== action);
  }

  isModalActionSelected(actionCode: string): boolean {
    return this.stepModal.allowedActions.includes(actionCode as WorkflowActionType);
  }

  closeStepModal(): void {
    this.showStepModal = false;
    this.stepModalError = '';
    this.stepModal = this.emptyStepModal();
  }

  submitStepModal(): void {
    if (!this.selectedWorkflowId || this.savingStep) {
      return;
    }
    if (!this.canManageWorkflows()) {
      this.stepModalError = this.workflowReadOnlyHint;
      return;
    }

    this.stepModalError = this.validateStepModal();
    if (this.stepModalError) {
      return;
    }

    this.savingStep = true;
    if (this.stepModal.mode === 'edit' && this.stepModal.stepId) {
      const payload: WorkflowStepUpdatePayload = {
        stepLabel: this.stepModal.stepLabel.trim(),
        responsibleRole: this.stepModal.responsibleRole,
        required: this.stepModal.required,
        refusalReasonRequired: this.stepModal.refusalReasonRequired,
        active: this.stepModal.active,
        conditionType: this.stepModal.conditionType,
        allowedActions: [...this.stepModal.allowedActions],
        confirmCriticalChange: true,
        comment: 'Mise à jour étape',
      };
      this.workflowAdminService.updateStep(this.selectedWorkflowId, this.stepModal.stepId, payload).subscribe({
        next: (updated) => {
          this.savingStep = false;
          this.closeStepModal();
          this.applyUpdatedWorkflow(updated, 'Étape modifiée avec succès.');
        },
        error: (error) => {
          this.savingStep = false;
          this.stepModalError = error instanceof Error ? error.message : 'Mise à jour étape impossible.';
        },
      });
      return;
    }

    const createPayload: WorkflowStepCreatePayload = {
      stepCode: this.stepModal.stepCode,
      stepLabel: this.stepModal.stepLabel.trim(),
      responsibleRole: this.stepModal.responsibleRole,
      required: this.stepModal.required,
      refusalReasonRequired: this.stepModal.refusalReasonRequired,
      active: this.stepModal.active,
      conditionType: this.stepModal.conditionType,
      allowedActions: [...this.stepModal.allowedActions],
      comment: `Ajout étape: ${this.stepModal.stepLabel.trim()}`,
    };

    this.workflowAdminService.addStep(this.selectedWorkflowId, createPayload).subscribe({
      next: (updated) => {
        this.savingStep = false;
        this.closeStepModal();
        this.applyUpdatedWorkflow(updated, 'Étape ajoutée avec succès.');
      },
      error: (error) => {
        this.savingStep = false;
        this.stepModalError = error instanceof Error ? error.message : 'Ajout étape impossible.';
      },
    });
  }

  runPreview(scenario: PreviewScenario): void {
    if (!this.selectedWorkflowId) {
      return;
    }

    this.previewLoading = true;
    this.workflowAdminService.previewWorkflow(this.selectedWorkflowId, scenario.request).subscribe({
      next: (preview) => {
        this.previewLoading = false;
        this.previewResult = preview;
      },
      error: (error) => {
        this.previewLoading = false;
        this.feedbackTone = 'error';
        this.feedbackMessage = error instanceof Error ? error.message : 'Prévisualisation impossible.';
      },
    });
  }

  openAuditModal(): void {
    this.showAuditModal = true;
    this.auditWorkflowFilter = this.selectedWorkflowId ?? '';
    this.auditActionFilter = '';
    this.loadAudits();
  }

  closeAuditModal(): void {
    this.showAuditModal = false;
  }

  loadAudits(): void {
    this.loadingAudit = true;
    this.workflowAdminService.getAudits({
      workflowId: this.auditWorkflowFilter || undefined,
      actionType: this.auditActionFilter || undefined,
    }).subscribe({
      next: (audits) => {
        this.loadingAudit = false;
        this.audits = audits;
      },
      error: (error) => {
        this.loadingAudit = false;
        this.feedbackTone = 'error';
        this.feedbackMessage = error instanceof Error ? error.message : 'Chargement audit impossible.';
      },
    });
  }

  workflowLabelFromType(workflowType: string): string {
    return this.workflows.find((item) => item.workflowType === workflowType)?.workflowLabel ?? workflowType;
  }

  labelForCondition(code: WorkflowConditionType): string {
    return this.catalog?.conditions.find((condition) => condition.code === code)?.label ?? code;
  }

  labelsForActions(codes: WorkflowActionType[]): string[] {
    return codes.map((code) => this.catalog?.actions.find((action) => action.code === code)?.label ?? code);
  }

  jsonDiff(audit: WorkflowAuditLog): string {
    if (audit.comment?.trim()) {
      return audit.comment.trim();
    }
    if (audit.newConfig?.trim()) {
      return audit.newConfig.length > 140 ? `${audit.newConfig.slice(0, 140)}...` : audit.newConfig;
    }
    if (audit.oldConfig?.trim()) {
      return audit.oldConfig.length > 140 ? `${audit.oldConfig.slice(0, 140)}...` : audit.oldConfig;
    }
    return '-';
  }

  private stepToUpdatePayload(step: WorkflowStep, targetActive: boolean): WorkflowStepUpdatePayload {
    return {
      stepLabel: step.stepLabel,
      responsibleRole: step.responsibleRole,
      required: step.required,
      refusalReasonRequired: step.refusalReasonRequired,
      active: targetActive,
      conditionType: step.conditionType,
      allowedActions: [...step.allowedActions],
      confirmCriticalChange: true,
      comment: targetActive ? 'Activation étape' : 'Désactivation étape',
    };
  }

  private applyUpdatedWorkflow(updated: WorkflowDetail, successMessage: string): void {
    this.selectedWorkflow = updated;
    this.selectedWorkflowId = updated.workflowId;
    this.updateSummaryFromDetail(updated);
    this.initGeneralForm();
    this.feedbackTone = 'success';
    this.feedbackMessage = successMessage;

    this.workflowAdminService.getAudits({ workflowId: updated.workflowId }).subscribe({
      next: (audits) => {
        this.audits = audits;
      },
      error: () => {
        this.audits = [];
      },
    });
  }

  private initGeneralForm(): void {
    if (!this.selectedWorkflow) {
      return;
    }
    this.generalForm = {
      workflowLabel: this.selectedWorkflow.workflowLabel || '',
      description: this.selectedWorkflow.description || '',
      active: this.selectedWorkflow.active,
    };
  }

  private validateStepModal(): string {
    if (!this.stepModal.stepLabel.trim()) {
      return 'Le nom de l étape est obligatoire.';
    }
    if (!this.stepModal.responsibleRole) {
      return 'Le rôle responsable est obligatoire.';
    }
    if (!this.stepModal.conditionType) {
      return 'La condition est obligatoire.';
    }
    if (this.stepModal.allowedActions.length === 0) {
      return 'Sélectionnez au moins une action autorisée.';
    }
    if (this.stepModal.refusalReasonRequired && !this.stepModal.allowedActions.includes('REJECT')) {
      return 'Le motif de refus obligatoire exige l action REJECT.';
    }
    return '';
  }

  private updateSummaryFromDetail(detail: WorkflowDetail): void {
    this.workflows = this.workflows.map((workflow) => {
      if (workflow.workflowId !== detail.workflowId) {
        return workflow;
      }

      const involvedRoles = detail.steps
        .filter((step) => step.active)
        .map((step) => step.responsibleRoleLabel)
        .filter((label, index, array) => array.indexOf(label) === index);

      return {
        ...workflow,
        workflowLabel: detail.workflowLabel,
        moduleName: detail.moduleName,
        description: detail.description,
        active: detail.active,
        stepCount: detail.steps.length,
        activeStepCount: detail.steps.filter((step) => step.active).length,
        involvedRoles,
        configurationValid: detail.configurationValid,
        configurationStatus: detail.configurationValid ? 'Configuration valide' : 'À vérifier',
        updatedBy: detail.updatedBy,
        createdAt: detail.createdAt,
        lastModifiedAt: detail.updatedAt,
      };
    });
  }

  private emptyStepModal(): StepModalModel {
    return {
      mode: 'create',
      stepId: null,
      stepCode: '',
      stepLabel: '',
      responsibleRole: '',
      required: false,
      refusalReasonRequired: false,
      active: true,
      conditionType: 'TOUJOURS',
      allowedActions: [],
    };
  }

  private showReadOnlyWarning(actionLabel: string): void {
    this.feedbackTone = 'info';
    this.feedbackMessage = `${actionLabel} est desactivee en lecture seule. ${this.workflowReadOnlyHint}`;
  }
}
