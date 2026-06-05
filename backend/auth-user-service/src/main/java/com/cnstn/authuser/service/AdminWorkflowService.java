package com.cnstn.authuser.service;

import com.cnstn.authuser.dto.WorkflowAuditResponse;
import com.cnstn.authuser.dto.WorkflowCatalogResponse;
import com.cnstn.authuser.dto.WorkflowDetailResponse;
import com.cnstn.authuser.dto.WorkflowGeneralUpdateRequest;
import com.cnstn.authuser.dto.WorkflowOptionResponse;
import com.cnstn.authuser.dto.WorkflowPreviewRequest;
import com.cnstn.authuser.dto.WorkflowPreviewResponse;
import com.cnstn.authuser.dto.WorkflowPreviewStepResponse;
import com.cnstn.authuser.dto.WorkflowStepCreateRequest;
import com.cnstn.authuser.dto.WorkflowStepReorderRequest;
import com.cnstn.authuser.dto.WorkflowStepResponse;
import com.cnstn.authuser.dto.WorkflowStepTemplateResponse;
import com.cnstn.authuser.dto.WorkflowStepUpdateRequest;
import com.cnstn.authuser.dto.WorkflowStepUpsertRequest;
import com.cnstn.authuser.dto.WorkflowSummaryResponse;
import com.cnstn.authuser.dto.WorkflowToggleRequest;
import com.cnstn.authuser.dto.WorkflowUpdateRequest;
import com.cnstn.authuser.entity.RoleName;
import com.cnstn.authuser.entity.WorkflowActionType;
import com.cnstn.authuser.entity.WorkflowAuditActionType;
import com.cnstn.authuser.entity.WorkflowAuditLogEntity;
import com.cnstn.authuser.entity.WorkflowConditionType;
import com.cnstn.authuser.entity.WorkflowDefinitionEntity;
import com.cnstn.authuser.entity.WorkflowStepCode;
import com.cnstn.authuser.entity.WorkflowStepEntity;
import com.cnstn.authuser.entity.WorkflowType;
import com.cnstn.authuser.exception.BadRequestException;
import com.cnstn.authuser.exception.ResourceNotFoundException;
import com.cnstn.authuser.repository.WorkflowAuditLogRepository;
import com.cnstn.authuser.repository.WorkflowDefinitionRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdminWorkflowService {

    private static final Map<WorkflowType, String> WORKFLOW_MODULE_LABELS = Map.of(
            WorkflowType.EVENT_WORKFLOW, "Événements",
            WorkflowType.ROOM_RESERVATION_WORKFLOW, "Réservations salles",
            WorkflowType.EQUIPMENT_RESERVATION_WORKFLOW, "Réservations équipements",
            WorkflowType.EXTERNAL_PARTNER_WORKFLOW, "Invitations / partenaires externes",
            WorkflowType.INTERVENTION_WORKFLOW, "Interventions IT",
            WorkflowType.GED_DOCUMENT_WORKFLOW, "Documents GED"
    );

    private static final Map<WorkflowType, String> DEFAULT_WORKFLOW_LABELS = Map.of(
            WorkflowType.EVENT_WORKFLOW, "Workflow événement",
            WorkflowType.ROOM_RESERVATION_WORKFLOW, "Workflow réservation salle",
            WorkflowType.EQUIPMENT_RESERVATION_WORKFLOW, "Workflow réservation équipement",
            WorkflowType.EXTERNAL_PARTNER_WORKFLOW, "Workflow partenaire externe",
            WorkflowType.INTERVENTION_WORKFLOW, "Workflow intervention IT",
            WorkflowType.GED_DOCUMENT_WORKFLOW, "Workflow document GED"
    );

    private static final Map<RoleName, String> ROLE_LABELS = Map.of(
            RoleName.ADMIN, "Administrateur",
            RoleName.EMPLOYE, "Employé",
            RoleName.CHEF_HIERARCHIQUE, "Chef hiérarchique",
            RoleName.RESPONSABLE_SECURITE, "Responsable sécurité",
            RoleName.RESPONSABLE_SALLE, "Responsable salle",
            RoleName.RESPONSABLE_IT, "Responsable IT",
            RoleName.RESPONSABLE_QUALITE, "Responsable qualité",
            RoleName.DIRECTEUR_DSN, "Directeur DSN"
    );

    private static final Map<WorkflowConditionType, String> CONDITION_LABELS = Map.of(
            WorkflowConditionType.TOUJOURS, "Toujours",
            WorkflowConditionType.RESERVATION_PHYSIQUE, "Si réservation physique",
            WorkflowConditionType.EVENEMENT_PRESENTIEL, "Si événement présentiel",
            WorkflowConditionType.EVENEMENT_HYBRIDE, "Si événement hybride",
            WorkflowConditionType.PARTENAIRE_EXTERNE, "Si partenaire externe",
            WorkflowConditionType.DOCUMENT_CONFIDENTIEL, "Si document confidentiel",
            WorkflowConditionType.INTERVENTION_IT, "Si intervention IT",
            WorkflowConditionType.INTERVENTION_CRITIQUE, "Si intervention critique"
    );

    private static final Map<WorkflowActionType, String> ACTION_LABELS = Map.ofEntries(
            Map.entry(WorkflowActionType.SUBMIT, "Soumettre"),
            Map.entry(WorkflowActionType.VALIDATE, "Valider"),
            Map.entry(WorkflowActionType.REJECT, "Refuser"),
            Map.entry(WorkflowActionType.APPROVE, "Approuver"),
            Map.entry(WorkflowActionType.ASSIGN, "Affecter"),
            Map.entry(WorkflowActionType.PROCESS, "Traiter"),
            Map.entry(WorkflowActionType.REQUEST_CHANGES, "Retourner pour correction"),
            Map.entry(WorkflowActionType.PUBLISH, "Publier"),
            Map.entry(WorkflowActionType.CANCEL, "Annuler"),
            Map.entry(WorkflowActionType.ARCHIVE, "Archiver"),
            Map.entry(WorkflowActionType.CLOSE, "Clôturer")
    );

    private final WorkflowDefinitionRepository workflowDefinitionRepository;
    private final WorkflowAuditLogRepository workflowAuditLogRepository;
    private final ObjectMapper objectMapper;
    private final Map<WorkflowType, List<WorkflowStepTemplate>> workflowCatalog;

    public AdminWorkflowService(
            WorkflowDefinitionRepository workflowDefinitionRepository,
            WorkflowAuditLogRepository workflowAuditLogRepository,
            ObjectMapper objectMapper
    ) {
        this.workflowDefinitionRepository = workflowDefinitionRepository;
        this.workflowAuditLogRepository = workflowAuditLogRepository;
        this.objectMapper = objectMapper;
        this.workflowCatalog = createWorkflowCatalog();
    }

    @Transactional
    public List<WorkflowSummaryResponse> listWorkflows() {
        List<WorkflowSummaryResponse> responses = new ArrayList<>();
        for (WorkflowType workflowType : WorkflowType.values()) {
            WorkflowDefinitionEntity workflow = ensureWorkflowExists(workflowType);
            responses.add(toSummary(workflow));
        }
        responses.sort(Comparator.comparing(item -> item.moduleName().toLowerCase()));
        return responses;
    }

    @Transactional
    public WorkflowDetailResponse getWorkflowById(UUID workflowId) {
        WorkflowDefinitionEntity workflow = findWorkflowById(workflowId);
        return toDetail(workflow);
    }

    @Transactional
    public WorkflowDetailResponse getWorkflow(WorkflowType workflowType) {
        WorkflowDefinitionEntity workflow = ensureWorkflowExists(workflowType);
        return toDetail(workflow);
    }

    @Transactional
    public WorkflowCatalogResponse getCatalog(WorkflowType workflowType) {
        List<WorkflowStepTemplate> templates = new ArrayList<>(
                workflowCatalog.getOrDefault(workflowType, List.of())
        );

        List<WorkflowStepTemplateResponse> stepTemplates = templates.stream()
                .map(this::toTemplateResponse)
                .toList();

        List<WorkflowOptionResponse> roles = Arrays.stream(RoleName.values())
                .map(roleName -> new WorkflowOptionResponse(roleName.name(), roleLabel(roleName)))
                .toList();

        List<WorkflowOptionResponse> conditions = Arrays.stream(WorkflowConditionType.values())
                .map(condition -> new WorkflowOptionResponse(condition.name(), conditionLabel(condition)))
                .toList();

        List<WorkflowOptionResponse> actions = Arrays.stream(WorkflowActionType.values())
                .map(action -> new WorkflowOptionResponse(action.name(), actionLabel(action)))
                .toList();

        return new WorkflowCatalogResponse(stepTemplates, roles, conditions, actions);
    }

    @Transactional(readOnly = true)
    public List<WorkflowAuditResponse> listAudits(WorkflowType workflowType) {
        return workflowAuditLogRepository.findTop50ByWorkflowTypeOrderByCreatedAtDesc(workflowType).stream()
                .map(this::toAuditResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<WorkflowAuditResponse> listAudits(UUID workflowId, WorkflowAuditActionType actionType) {
        WorkflowType workflowType = null;
        if (workflowId != null) {
            workflowType = findWorkflowById(workflowId).getWorkflowType();
        }

        List<WorkflowAuditLogEntity> audits;
        if (workflowType != null && actionType != null) {
            audits = workflowAuditLogRepository.findTop200ByWorkflowTypeAndActionTypeOrderByCreatedAtDesc(
                    workflowType,
                    actionType
            );
        } else if (workflowType != null) {
            audits = workflowAuditLogRepository.findTop200ByWorkflowTypeOrderByCreatedAtDesc(workflowType);
        } else if (actionType != null) {
            audits = workflowAuditLogRepository.findTop200ByActionTypeOrderByCreatedAtDesc(actionType);
        } else {
            audits = workflowAuditLogRepository.findTop200ByOrderByCreatedAtDesc();
        }

        return audits.stream().map(this::toAuditResponse).toList();
    }

    @Transactional
    public WorkflowDetailResponse updateWorkflowGeneral(
            UUID workflowId,
            WorkflowGeneralUpdateRequest request,
            String actorUsername
    ) {
        WorkflowDefinitionEntity workflow = findWorkflowById(workflowId);
        String actor = normalizeActor(actorUsername);
        WorkflowSnapshot beforeSnapshot = snapshot(workflow);

        if (request.workflowLabel() != null && !request.workflowLabel().isBlank()) {
            workflow.setWorkflowName(request.workflowLabel().trim());
        }
        if (request.description() != null) {
            workflow.setDescription(request.description().trim());
        }
        if (request.active() != null) {
            if (request.active() && workflow.getSteps().stream().noneMatch(WorkflowStepEntity::isActive)) {
                throw new BadRequestException("Un workflow actif doit contenir au moins une étape active.");
            }
            workflow.setActive(request.active());
        }
        workflow.setUpdatedBy(actor);

        WorkflowDefinitionEntity saved = workflowDefinitionRepository.save(workflow);
        WorkflowSnapshot afterSnapshot = snapshot(saved);

        if (!beforeSnapshot.sameHeader(afterSnapshot)) {
            recordAudit(
                    saved.getWorkflowType(),
                    WorkflowAuditActionType.UPDATE_WORKFLOW,
                    actor,
                    beforeSnapshot.headerView(),
                    afterSnapshot.headerView(),
                    request.comment()
            );
        }

        return toDetail(saved);
    }

    @Transactional
    public WorkflowDetailResponse updateStep(
            UUID workflowId,
            UUID stepId,
            WorkflowStepUpdateRequest request,
            String actorUsername
    ) {
        WorkflowDefinitionEntity workflow = findWorkflowById(workflowId);
        WorkflowStepEntity step = findStep(workflow, stepId);
        String actor = normalizeActor(actorUsername);

        boolean targetActive = request.active() == null ? step.isActive() : request.active();
        validateStepChange(workflow, step, targetActive, request.confirmCriticalChange(), request.allowedActions(), request.refusalReasonRequired());

        WorkflowStepSnapshot before = WorkflowStepSnapshot.fromEntity(step);

        step.setStepName(request.stepLabel().trim());
        step.setResponsibleRole(request.responsibleRole());
        step.setRequired(request.required() != null && request.required());
        step.setRefusalReasonRequired(request.refusalReasonRequired() != null && request.refusalReasonRequired());
        step.setActive(targetActive);
        step.setConditionType(request.conditionType());
        step.setAllowedActions(new HashSet<>(request.allowedActions()));

        WorkflowDefinitionEntity saved = workflowDefinitionRepository.save(workflow);
        WorkflowStepEntity savedStep = findStep(saved, stepId);
        WorkflowStepSnapshot after = WorkflowStepSnapshot.fromEntity(savedStep);
        recordStepAuditChanges(saved.getWorkflowType(), actor, before, after, request.comment());

        return toDetail(saved);
    }

    @Transactional
    public WorkflowDetailResponse addStep(
            UUID workflowId,
            WorkflowStepCreateRequest request,
            String actorUsername
    ) {
        WorkflowDefinitionEntity workflow = findWorkflowById(workflowId);
        String actor = normalizeActor(actorUsername);
        WorkflowType workflowType = workflow.getWorkflowType();

        WorkflowStepTemplate template = getTemplate(workflowType, request.stepCode());
        boolean stepCodeExists = workflow.getSteps().stream().anyMatch(item -> item.getStepCode() == request.stepCode());
        if (stepCodeExists) {
            throw new BadRequestException("Cette étape est déjà présente dans le workflow.");
        }
        if (request.stepLabel() == null || request.stepLabel().isBlank()) {
            throw new BadRequestException("Le nom de l'étape est obligatoire.");
        }
        if (request.responsibleRole() == null) {
            throw new BadRequestException("Chaque étape doit définir un rôle responsable.");
        }
        if (request.conditionType() == null) {
            throw new BadRequestException("Chaque étape doit définir une condition autorisée.");
        }
        if (request.allowedActions() == null || request.allowedActions().isEmpty()) {
            throw new BadRequestException("Chaque étape doit définir au moins une action autorisée.");
        }
        boolean refusalReasonRequired = request.refusalReasonRequired() != null && request.refusalReasonRequired();
        if (refusalReasonRequired && !request.allowedActions().contains(WorkflowActionType.REJECT)) {
            throw new BadRequestException("Le motif de refus obligatoire nécessite l'action REJECT.");
        }

        int requestedOrder = request.stepOrder() == null ? workflow.getSteps().size() + 1 : request.stepOrder();
        if (requestedOrder < 1 || requestedOrder > workflow.getSteps().size() + 1) {
            throw new BadRequestException("Ordre d'étape invalide.");
        }

        List<WorkflowStepEntity> sorted = workflow.getSteps().stream()
                .sorted(Comparator.comparingInt(WorkflowStepEntity::getStepOrder))
                .toList();
        for (WorkflowStepEntity existing : sorted) {
            if (existing.getStepOrder() >= requestedOrder) {
                existing.setStepOrder(existing.getStepOrder() + 1);
            }
        }

        WorkflowStepEntity step = new WorkflowStepEntity();
        step.setWorkflow(workflow);
        step.setStepCode(request.stepCode());
        step.setStepName(request.stepLabel().trim());
        step.setStepOrder(requestedOrder);
        step.setResponsibleRole(request.responsibleRole());
        step.setRequired(request.required() != null && request.required());
        step.setRefusalReasonRequired(refusalReasonRequired);
        step.setActive(request.active() == null || request.active());
        step.setCritical(template.critical());
        step.setConditionType(request.conditionType());
        step.setAllowedActions(new HashSet<>(request.allowedActions()));
        workflow.getSteps().add(step);

        normalizeOrders(workflow);
        ensureWorkflowHasActiveStepIfNeeded(workflow);

        WorkflowDefinitionEntity saved = workflowDefinitionRepository.save(workflow);
        WorkflowStepEntity created = saved.getSteps().stream()
                .filter(item -> item.getStepCode() == request.stepCode())
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Étape créée introuvable"));

        recordAudit(
                saved.getWorkflowType(),
                WorkflowAuditActionType.CREATE_STEP,
                actor,
                null,
                WorkflowStepSnapshot.fromEntity(created),
                request.comment()
        );

        return toDetail(saved);
    }

    @Transactional
    public WorkflowDetailResponse reorderSteps(
            UUID workflowId,
            WorkflowStepReorderRequest request,
            String actorUsername
    ) {
        WorkflowDefinitionEntity workflow = findWorkflowById(workflowId);
        String actor = normalizeActor(actorUsername);

        List<WorkflowStepEntity> steps = workflow.getSteps();
        if (steps.isEmpty()) {
            throw new BadRequestException("Aucune étape à réordonner.");
        }

        Set<UUID> expectedIds = steps.stream().map(WorkflowStepEntity::getId).collect(Collectors.toCollection(LinkedHashSet::new));
        Set<UUID> providedIds = new LinkedHashSet<>(request.stepIds());

        if (!expectedIds.equals(providedIds)) {
            throw new BadRequestException("La liste de réordonnancement doit contenir exactement les étapes du workflow.");
        }

        Map<UUID, WorkflowStepEntity> byId = steps.stream()
                .collect(Collectors.toMap(WorkflowStepEntity::getId, item -> item, (left, right) -> left, LinkedHashMap::new));
        Map<WorkflowStepCode, WorkflowStepSnapshot> before = steps.stream()
                .map(WorkflowStepSnapshot::fromEntity)
                .collect(Collectors.toMap(WorkflowStepSnapshot::stepCode, item -> item, (left, right) -> right, LinkedHashMap::new));

        // Two-phase update to avoid unique constraint collisions on (workflow_id, step_order)
        // when swapping adjacent steps.
        int tempOrder = 1000;
        for (UUID stepId : request.stepIds()) {
            WorkflowStepEntity step = byId.get(stepId);
            step.setStepOrder(tempOrder++);
        }
        workflowDefinitionRepository.saveAndFlush(workflow);

        int finalOrder = 1;
        for (UUID stepId : request.stepIds()) {
            WorkflowStepEntity step = byId.get(stepId);
            step.setStepOrder(finalOrder++);
        }

        WorkflowDefinitionEntity saved = workflowDefinitionRepository.save(workflow);
        for (WorkflowStepEntity savedStep : saved.getSteps()) {
            WorkflowStepSnapshot oldSnapshot = before.get(savedStep.getStepCode());
            WorkflowStepSnapshot newSnapshot = WorkflowStepSnapshot.fromEntity(savedStep);
            if (oldSnapshot != null && oldSnapshot.stepOrder() != newSnapshot.stepOrder()) {
                recordAudit(
                        saved.getWorkflowType(),
                        WorkflowAuditActionType.REORDER_STEP,
                        actor,
                        oldSnapshot,
                        newSnapshot,
                        request.comment()
                );
            }
        }

        return toDetail(saved);
    }

    @Transactional(readOnly = true)
    public WorkflowPreviewResponse previewWorkflow(UUID workflowId, WorkflowPreviewRequest request) {
        WorkflowDefinitionEntity workflow = findWorkflowById(workflowId);
        List<WorkflowPreviewStepResponse> selectedSteps = workflow.getSteps().stream()
                .filter(WorkflowStepEntity::isActive)
                .sorted(Comparator.comparingInt(WorkflowStepEntity::getStepOrder))
                .filter(step -> matchesScenario(step.getConditionType(), request))
                .map(step -> new WorkflowPreviewStepResponse(
                        step.getId(),
                        step.getStepCode().name(),
                        step.getStepName(),
                        step.getStepOrder(),
                        roleLabel(step.getResponsibleRole()),
                        conditionLabel(step.getConditionType())
                ))
                .toList();

        String scenarioLabel = request == null || request.scenarioLabel() == null || request.scenarioLabel().isBlank()
                ? "Scénario personnalisé"
                : request.scenarioLabel().trim();

        String previewPath;
        if (selectedSteps.isEmpty()) {
            previewPath = "Aucun passage (conditions non satisfaites)";
        } else {
            previewPath = selectedSteps.stream()
                    .map(WorkflowPreviewStepResponse::responsibleRoleLabel)
                    .collect(Collectors.joining(" -> ")) + " -> Final";
        }

        return new WorkflowPreviewResponse(
                workflow.getWorkflowName(),
                scenarioLabel,
                previewPath,
                selectedSteps
        );
    }

    @Transactional
    public WorkflowDetailResponse updateWorkflow(WorkflowType workflowType, WorkflowUpdateRequest request, String actorUsername) {
        WorkflowDefinitionEntity workflow = ensureWorkflowExists(workflowType);
        String actor = normalizeActor(actorUsername);
        WorkflowSnapshot beforeSnapshot = snapshot(workflow);

        boolean targetActive = request.active() != null ? request.active() : workflow.isActive();
        validateFullWorkflowUpdate(workflowType, request, workflow, targetActive);

        Map<WorkflowStepCode, WorkflowStepSnapshot> oldStepsByCode = beforeSnapshot.stepsByCode();
        List<WorkflowStepUpsertRequest> sortedSteps = request.steps().stream()
                .sorted(Comparator.comparing(WorkflowStepUpsertRequest::stepOrder))
                .toList();

        workflow.setDescription(request.description() != null ? request.description().trim() : workflow.getDescription());
        workflow.setActive(targetActive);
        workflow.setUpdatedBy(actor);

        workflow.getSteps().clear();
        workflowDefinitionRepository.saveAndFlush(workflow);

        for (WorkflowStepUpsertRequest stepRequest : sortedSteps) {
            WorkflowStepTemplate template = getTemplate(workflowType, stepRequest.stepCode());
            WorkflowStepEntity step = new WorkflowStepEntity();
            step.setWorkflow(workflow);
            step.setStepCode(stepRequest.stepCode());
            step.setStepName(stepRequest.stepLabel().trim());
            step.setStepOrder(stepRequest.stepOrder());
            step.setResponsibleRole(stepRequest.responsibleRole());
            step.setRequired(stepRequest.required() != null && stepRequest.required());
            step.setRefusalReasonRequired(stepRequest.refusalReasonRequired() != null && stepRequest.refusalReasonRequired());
            step.setActive(stepRequest.active() == null || stepRequest.active());
            step.setCritical(template.critical());
            step.setConditionType(stepRequest.conditionType());
            step.setAllowedActions(new HashSet<>(stepRequest.allowedActions()));
            workflow.getSteps().add(step);
        }

        WorkflowDefinitionEntity saved = workflowDefinitionRepository.save(workflow);
        WorkflowSnapshot afterSnapshot = snapshot(saved);
        createAuditEntries(workflowType, actor, beforeSnapshot, afterSnapshot, oldStepsByCode, null);

        return toDetail(saved);
    }

    @Transactional
    public WorkflowDetailResponse toggleWorkflow(
            WorkflowType workflowType,
            WorkflowToggleRequest request,
            String actorUsername
    ) {
        WorkflowDefinitionEntity workflow = ensureWorkflowExists(workflowType);
        boolean targetActive = request.active() != null && request.active();

        if (targetActive && workflow.getSteps().stream().noneMatch(WorkflowStepEntity::isActive)) {
            throw new BadRequestException("Un workflow actif doit contenir au moins une étape active.");
        }

        boolean previouslyActive = workflow.isActive();
        workflow.setActive(targetActive);
        workflow.setUpdatedBy(normalizeActor(actorUsername));
        WorkflowDefinitionEntity saved = workflowDefinitionRepository.save(workflow);

        if (previouslyActive != targetActive) {
            recordAudit(
                    workflowType,
                    WorkflowAuditActionType.UPDATE_WORKFLOW,
                    normalizeActor(actorUsername),
                    Map.of("active", previouslyActive),
                    Map.of("active", targetActive),
                    null
            );
        }

        return toDetail(saved);
    }

    private void validateFullWorkflowUpdate(
            WorkflowType workflowType,
            WorkflowUpdateRequest request,
            WorkflowDefinitionEntity currentWorkflow,
            boolean targetActive
    ) {
        if (request.steps() == null || request.steps().isEmpty()) {
            throw new BadRequestException("Un workflow doit contenir au moins une étape.");
        }

        Set<Integer> orders = new HashSet<>();
        Set<WorkflowStepCode> stepCodes = new HashSet<>();
        int activeCount = 0;

        Set<WorkflowStepCode> allowedCodes = workflowCatalog.getOrDefault(workflowType, List.of())
                .stream()
                .map(WorkflowStepTemplate::stepCode)
                .collect(Collectors.toSet());

        for (WorkflowStepUpsertRequest step : request.steps()) {
            if (!allowedCodes.contains(step.stepCode())) {
                throw new BadRequestException("Étape non autorisée pour ce workflow: " + step.stepCode());
            }
            if (step.responsibleRole() == null) {
                throw new BadRequestException("Chaque étape doit définir un rôle responsable.");
            }
            if (step.conditionType() == null) {
                throw new BadRequestException("Chaque étape doit définir une condition autorisée.");
            }
            if (!orders.add(step.stepOrder())) {
                throw new BadRequestException("Chaque étape doit avoir un ordre unique.");
            }
            if (!stepCodes.add(step.stepCode())) {
                throw new BadRequestException("Chaque code d'étape doit être unique dans un workflow.");
            }
            if (step.allowedActions() == null || step.allowedActions().isEmpty()) {
                throw new BadRequestException("Chaque étape doit définir au moins une action autorisée.");
            }

            boolean isActive = step.active() == null || step.active();
            if (isActive) {
                activeCount++;
            }

            if ((step.refusalReasonRequired() != null && step.refusalReasonRequired())
                    && !step.allowedActions().contains(WorkflowActionType.REJECT)) {
                throw new BadRequestException(
                        "Le motif de refus obligatoire nécessite l'action REJECT sur l'étape " + step.stepCode()
                );
            }
        }

        if (targetActive && activeCount == 0) {
            throw new BadRequestException("Un workflow actif doit contenir au moins une étape active.");
        }

        boolean confirmCritical = request.confirmCriticalChange() != null && request.confirmCriticalChange();
        Map<WorkflowStepCode, WorkflowStepEntity> currentSteps = currentWorkflow.getSteps().stream()
                .collect(Collectors.toMap(WorkflowStepEntity::getStepCode, item -> item, (left, right) -> left, LinkedHashMap::new));
        Map<WorkflowStepCode, WorkflowStepUpsertRequest> requestedSteps = request.steps().stream()
                .collect(Collectors.toMap(WorkflowStepUpsertRequest::stepCode, item -> item, (left, right) -> right, LinkedHashMap::new));

        for (WorkflowStepEntity currentStep : currentSteps.values()) {
            if (!currentStep.isCritical() || !currentStep.isActive()) {
                continue;
            }

            WorkflowStepUpsertRequest updated = requestedSteps.get(currentStep.getStepCode());
            boolean removed = updated == null;
            boolean disabled = updated != null && updated.active() != null && !updated.active();
            if ((removed || disabled) && !confirmCritical) {
                throw new BadRequestException(
                        "La modification touche une étape critique (" + currentStep.getStepCode()
                                + "). Confirmez l'opération avant de continuer."
                );
            }
        }
    }

    private void validateStepChange(
            WorkflowDefinitionEntity workflow,
            WorkflowStepEntity step,
            boolean targetActive,
            Boolean confirmCriticalChange,
            Set<WorkflowActionType> allowedActions,
            Boolean refusalReasonRequired
    ) {
        if (allowedActions == null || allowedActions.isEmpty()) {
            throw new BadRequestException("Chaque étape doit définir au moins une action autorisée.");
        }

        boolean refusalRequired = refusalReasonRequired != null && refusalReasonRequired;
        if (refusalRequired && !allowedActions.contains(WorkflowActionType.REJECT)) {
            throw new BadRequestException("Le motif de refus obligatoire nécessite l'action REJECT.");
        }

        if (step.isCritical() && step.isActive() && !targetActive) {
            boolean confirmed = confirmCriticalChange != null && confirmCriticalChange;
            if (!confirmed) {
                throw new BadRequestException("La désactivation d'une étape critique doit être confirmée.");
            }
        }

        if (workflow.isActive() && step.isActive() && !targetActive) {
            long activeCount = workflow.getSteps().stream().filter(WorkflowStepEntity::isActive).count();
            if (activeCount <= 1) {
                throw new BadRequestException("Un workflow actif doit conserver au moins une étape active.");
            }
        }
    }

    private void ensureWorkflowHasActiveStepIfNeeded(WorkflowDefinitionEntity workflow) {
        if (workflow.isActive() && workflow.getSteps().stream().noneMatch(WorkflowStepEntity::isActive)) {
            throw new BadRequestException("Un workflow actif doit contenir au moins une étape active.");
        }
    }

    private void normalizeOrders(WorkflowDefinitionEntity workflow) {
        List<WorkflowStepEntity> ordered = workflow.getSteps().stream()
                .sorted(Comparator.comparingInt(WorkflowStepEntity::getStepOrder))
                .toList();
        int order = 1;
        for (WorkflowStepEntity step : ordered) {
            step.setStepOrder(order++);
        }
    }

    private void recordStepAuditChanges(
            WorkflowType workflowType,
            String actor,
            WorkflowStepSnapshot before,
            WorkflowStepSnapshot after,
            String comment
    ) {
        if (before.active() && !after.active()) {
            recordAudit(workflowType, WorkflowAuditActionType.DISABLE_STEP, actor, before, after, comment);
        }
        if (!before.active() && after.active()) {
            recordAudit(workflowType, WorkflowAuditActionType.ENABLE_STEP, actor, before, after, comment);
        }
        if (before.responsibleRole() != after.responsibleRole()) {
            recordAudit(workflowType, WorkflowAuditActionType.CHANGE_ROLE, actor, before, after, comment);
        }
        if (before.conditionType() != after.conditionType()) {
            recordAudit(workflowType, WorkflowAuditActionType.CHANGE_CONDITION, actor, before, after, comment);
        }
        if (!before.sameConfiguration(after)) {
            recordAudit(workflowType, WorkflowAuditActionType.UPDATE_STEP, actor, before, after, comment);
        }
    }

    private void createAuditEntries(
            WorkflowType workflowType,
            String actor,
            WorkflowSnapshot beforeSnapshot,
            WorkflowSnapshot afterSnapshot,
            Map<WorkflowStepCode, WorkflowStepSnapshot> oldStepsByCode,
            String comment
    ) {
        Map<WorkflowStepCode, WorkflowStepSnapshot> newStepsByCode = afterSnapshot.stepsByCode();

        if (!beforeSnapshot.sameHeader(afterSnapshot)) {
            recordAudit(
                    workflowType,
                    WorkflowAuditActionType.UPDATE_WORKFLOW,
                    actor,
                    beforeSnapshot.headerView(),
                    afterSnapshot.headerView(),
                    comment
            );
        }

        for (WorkflowStepCode code : newStepsByCode.keySet()) {
            if (!oldStepsByCode.containsKey(code)) {
                recordAudit(workflowType, WorkflowAuditActionType.CREATE_STEP, actor, null, newStepsByCode.get(code), comment);
            }
        }

        for (WorkflowStepCode code : oldStepsByCode.keySet()) {
            WorkflowStepSnapshot previous = oldStepsByCode.get(code);
            WorkflowStepSnapshot current = newStepsByCode.get(code);
            if (current == null) {
                recordAudit(workflowType, WorkflowAuditActionType.DISABLE_STEP, actor, previous, null, comment);
                continue;
            }

            if (previous.active() && !current.active()) {
                recordAudit(workflowType, WorkflowAuditActionType.DISABLE_STEP, actor, previous, current, comment);
            } else if (!previous.active() && current.active()) {
                recordAudit(workflowType, WorkflowAuditActionType.ENABLE_STEP, actor, previous, current, comment);
            }

            if (previous.stepOrder() != current.stepOrder()) {
                recordAudit(workflowType, WorkflowAuditActionType.REORDER_STEP, actor, previous, current, comment);
            }

            if (previous.responsibleRole() != current.responsibleRole()) {
                recordAudit(workflowType, WorkflowAuditActionType.CHANGE_ROLE, actor, previous, current, comment);
            }

            if (previous.conditionType() != current.conditionType()) {
                recordAudit(workflowType, WorkflowAuditActionType.CHANGE_CONDITION, actor, previous, current, comment);
            }

            if (!previous.sameConfiguration(current)) {
                recordAudit(workflowType, WorkflowAuditActionType.UPDATE_STEP, actor, previous, current, comment);
            }
        }
    }

    private WorkflowDefinitionEntity ensureWorkflowExists(WorkflowType workflowType) {
        return workflowDefinitionRepository.findByWorkflowType(workflowType)
                .orElseGet(() -> createDefaultWorkflow(workflowType));
    }

    private WorkflowDefinitionEntity findWorkflowById(UUID workflowId) {
        return workflowDefinitionRepository.findById(workflowId)
                .orElseThrow(() -> new ResourceNotFoundException("Workflow introuvable: " + workflowId));
    }

    private WorkflowStepEntity findStep(WorkflowDefinitionEntity workflow, UUID stepId) {
        return workflow.getSteps().stream()
                .filter(item -> Objects.equals(item.getId(), stepId))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Étape introuvable: " + stepId));
    }

    private WorkflowDefinitionEntity createDefaultWorkflow(WorkflowType workflowType) {
        WorkflowDefinitionEntity entity = new WorkflowDefinitionEntity();
        entity.setWorkflowType(workflowType);
        entity.setWorkflowName(DEFAULT_WORKFLOW_LABELS.getOrDefault(workflowType, workflowType.name()));
        entity.setDescription("Configuration initiale du workflow.");
        entity.setActive(true);
        entity.setUpdatedBy("system");

        List<WorkflowStepTemplate> templates = workflowCatalog.getOrDefault(workflowType, List.of());
        int order = 1;
        for (WorkflowStepTemplate template : templates) {
            WorkflowStepEntity step = new WorkflowStepEntity();
            step.setWorkflow(entity);
            step.setStepCode(template.stepCode());
            step.setStepName(template.label());
            step.setStepOrder(order++);
            step.setResponsibleRole(template.defaultRole());
            step.setRequired(template.required());
            step.setRefusalReasonRequired(template.refusalReasonRequired());
            step.setActive(true);
            step.setCritical(template.critical());
            step.setConditionType(template.defaultCondition());
            step.setAllowedActions(new HashSet<>(template.defaultActions()));
            entity.getSteps().add(step);
        }

        WorkflowDefinitionEntity saved = workflowDefinitionRepository.save(entity);
        recordAudit(
                workflowType,
                WorkflowAuditActionType.CREATE_WORKFLOW,
                "system",
                null,
                Map.of("workflowId", saved.getId(), "workflowLabel", saved.getWorkflowName()),
                "Initialisation automatique"
        );
        return saved;
    }

    private WorkflowSummaryResponse toSummary(WorkflowDefinitionEntity workflow) {
        WorkflowValidationResult validation = validateWorkflowConfiguration(workflow);
        int stepCount = workflow.getSteps().size();
        int activeStepCount = (int) workflow.getSteps().stream().filter(WorkflowStepEntity::isActive).count();
        List<String> involvedRoles = workflow.getSteps().stream()
                .filter(WorkflowStepEntity::isActive)
                .map(WorkflowStepEntity::getResponsibleRole)
                .filter(Objects::nonNull)
                .map(this::roleLabel)
                .distinct()
                .toList();

        return new WorkflowSummaryResponse(
                workflow.getId(),
                workflow.getWorkflowType(),
                workflow.getWorkflowName(),
                workflowModuleLabel(workflow.getWorkflowType()),
                workflow.getDescription(),
                workflow.isActive(),
                stepCount,
                activeStepCount,
                involvedRoles,
                validation.valid(),
                validation.valid() ? "Configuration valide" : "À vérifier",
                workflow.getUpdatedBy(),
                workflow.getCreatedAt(),
                workflow.getUpdatedAt()
        );
    }

    private WorkflowDetailResponse toDetail(WorkflowDefinitionEntity workflow) {
        List<WorkflowStepResponse> steps = workflow.getSteps().stream()
                .sorted(Comparator.comparingInt(WorkflowStepEntity::getStepOrder))
                .map(this::toStepResponse)
                .toList();
        WorkflowValidationResult validation = validateWorkflowConfiguration(workflow);

        return new WorkflowDetailResponse(
                workflow.getId(),
                workflow.getWorkflowType(),
                workflow.getWorkflowName(),
                workflowModuleLabel(workflow.getWorkflowType()),
                workflow.getDescription(),
                workflow.isActive(),
                validation.valid(),
                validation.issues(),
                workflow.getUpdatedBy(),
                workflow.getCreatedAt(),
                workflow.getUpdatedAt(),
                steps
        );
    }

    private WorkflowValidationResult validateWorkflowConfiguration(WorkflowDefinitionEntity workflow) {
        List<String> issues = new ArrayList<>();
        List<WorkflowStepEntity> steps = workflow.getSteps();
        if (steps.isEmpty()) {
            issues.add("Le workflow ne contient aucune étape.");
        }

        if (workflow.isActive() && steps.stream().noneMatch(WorkflowStepEntity::isActive)) {
            issues.add("Le workflow est actif mais aucune étape active n'est définie.");
        }

        for (WorkflowStepEntity step : steps) {
            if (step.getResponsibleRole() == null) {
                issues.add("L'étape " + step.getStepCode() + " n'a pas de rôle responsable.");
            }
            if (step.getConditionType() == null) {
                issues.add("L'étape " + step.getStepCode() + " n'a pas de condition.");
            }
            if (step.getAllowedActions() == null || step.getAllowedActions().isEmpty()) {
                issues.add("L'étape " + step.getStepCode() + " ne définit aucune action.");
            }
            if (step.isRefusalReasonRequired()
                    && (step.getAllowedActions() == null || !step.getAllowedActions().contains(WorkflowActionType.REJECT))) {
                issues.add("L'étape " + step.getStepCode() + " impose un motif de refus sans action REJECT.");
            }
        }

        return new WorkflowValidationResult(issues.isEmpty(), issues);
    }

    private WorkflowStepResponse toStepResponse(WorkflowStepEntity step) {
        return new WorkflowStepResponse(
                step.getId(),
                step.getStepCode(),
                step.getStepName(),
                step.getStepOrder(),
                step.getResponsibleRole(),
                roleLabel(step.getResponsibleRole()),
                step.isRequired(),
                step.isRefusalReasonRequired(),
                step.isActive(),
                step.isCritical(),
                step.getConditionType(),
                new HashSet<>(step.getAllowedActions())
        );
    }

    private WorkflowStepTemplateResponse toTemplateResponse(WorkflowStepTemplate template) {
        return new WorkflowStepTemplateResponse(
                template.stepCode(),
                template.label(),
                template.description(),
                template.defaultRole(),
                template.defaultCondition(),
                new HashSet<>(template.defaultActions()),
                template.required(),
                template.refusalReasonRequired(),
                template.critical()
        );
    }

    private WorkflowAuditResponse toAuditResponse(WorkflowAuditLogEntity entity) {
        return new WorkflowAuditResponse(
                entity.getId(),
                entity.getWorkflowType(),
                entity.getActionType(),
                entity.getActorUsername(),
                entity.getOldConfig(),
                entity.getNewConfig(),
                entity.getComment(),
                entity.getCreatedAt()
        );
    }

    private WorkflowStepTemplate getTemplate(WorkflowType workflowType, WorkflowStepCode stepCode) {
        return workflowCatalog.getOrDefault(workflowType, List.of())
                .stream()
                .filter(item -> item.stepCode() == stepCode)
                .findFirst()
                .orElseThrow(() -> new BadRequestException("Étape non autorisée pour le workflow: " + stepCode));
    }

    private WorkflowSnapshot snapshot(WorkflowDefinitionEntity workflow) {
        Map<WorkflowStepCode, WorkflowStepSnapshot> stepsByCode = workflow.getSteps().stream()
                .map(WorkflowStepSnapshot::fromEntity)
                .collect(Collectors.toMap(WorkflowStepSnapshot::stepCode, item -> item, (left, right) -> right, LinkedHashMap::new));
        return new WorkflowSnapshot(
                workflow.getWorkflowType(),
                workflow.getWorkflowName(),
                workflow.getDescription(),
                workflow.isActive(),
                stepsByCode
        );
    }

    private String workflowModuleLabel(WorkflowType workflowType) {
        return WORKFLOW_MODULE_LABELS.getOrDefault(workflowType, workflowType.name());
    }

    private String roleLabel(RoleName roleName) {
        return ROLE_LABELS.getOrDefault(roleName, roleName.name());
    }

    private String conditionLabel(WorkflowConditionType conditionType) {
        return CONDITION_LABELS.getOrDefault(conditionType, conditionType.name());
    }

    private String actionLabel(WorkflowActionType actionType) {
        return ACTION_LABELS.getOrDefault(actionType, actionType.name());
    }

    private boolean matchesScenario(WorkflowConditionType conditionType, WorkflowPreviewRequest request) {
        if (conditionType == null) {
            return false;
        }
        if (request == null) {
            return conditionType == WorkflowConditionType.TOUJOURS;
        }
        return switch (conditionType) {
            case TOUJOURS -> true;
            case RESERVATION_PHYSIQUE -> truthy(request.reservationPhysique());
            case EVENEMENT_PRESENTIEL -> truthy(request.evenementPresentiel());
            case EVENEMENT_HYBRIDE -> truthy(request.evenementHybride());
            case PARTENAIRE_EXTERNE -> truthy(request.partenaireExterne());
            case DOCUMENT_CONFIDENTIEL -> truthy(request.documentConfidentiel());
            case INTERVENTION_IT -> truthy(request.interventionIt());
            case INTERVENTION_CRITIQUE -> truthy(request.interventionCritique());
        };
    }

    private boolean truthy(Boolean value) {
        return value != null && value;
    }

    private String normalizeActor(String actorUsername) {
        String actor = actorUsername == null ? "" : actorUsername.trim();
        return actor.isEmpty() ? "admin" : actor;
    }

    private void recordAudit(
            WorkflowType workflowType,
            WorkflowAuditActionType actionType,
            String actorUsername,
            Object oldConfig,
            Object newConfig,
            String comment
    ) {
        WorkflowAuditLogEntity audit = new WorkflowAuditLogEntity();
        audit.setWorkflowType(workflowType);
        audit.setActionType(actionType);
        audit.setActorUsername(normalizeActor(actorUsername));
        audit.setOldConfig(toJson(oldConfig));
        audit.setNewConfig(toJson(newConfig));
        audit.setComment(comment == null ? null : comment.trim());
        workflowAuditLogRepository.save(audit);
    }

    private String toJson(Object value) {
        if (value == null) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException ex) {
            return String.valueOf(value);
        }
    }

    private Map<WorkflowType, List<WorkflowStepTemplate>> createWorkflowCatalog() {
        Map<WorkflowType, List<WorkflowStepTemplate>> catalog = new HashMap<>();

        catalog.put(WorkflowType.EVENT_WORKFLOW, List.of(
                new WorkflowStepTemplate(
                        WorkflowStepCode.EVENT_DRAFT_REVIEW,
                        "Soumission employé",
                        "L'organisateur soumet la demande d'événement.",
                        RoleName.EMPLOYE,
                        WorkflowConditionType.TOUJOURS,
                        Set.of(WorkflowActionType.SUBMIT),
                        true,
                        false,
                        true
                ),
                new WorkflowStepTemplate(
                        WorkflowStepCode.EVENT_MANAGER_REVIEW,
                        "Validation chef hiérarchique",
                        "Le chef hiérarchique valide ou refuse la demande d'événement.",
                        RoleName.CHEF_HIERARCHIQUE,
                        WorkflowConditionType.TOUJOURS,
                        Set.of(WorkflowActionType.VALIDATE, WorkflowActionType.REJECT, WorkflowActionType.REQUEST_CHANGES),
                        true,
                        true,
                        true
                ),
                new WorkflowStepTemplate(
                        WorkflowStepCode.EVENT_SECURITY_REVIEW,
                        "Validation sécurité",
                        "Le responsable sécurité valide les contraintes de sûreté.",
                        RoleName.RESPONSABLE_SECURITE,
                        WorkflowConditionType.TOUJOURS,
                        Set.of(WorkflowActionType.VALIDATE, WorkflowActionType.REJECT),
                        true,
                        true,
                        true
                ),
                new WorkflowStepTemplate(
                        WorkflowStepCode.EVENT_DSN_APPROVAL,
                        "Validation DSN",
                        "Le directeur DSN rend la décision finale pour les partenaires externes.",
                        RoleName.DIRECTEUR_DSN,
                        WorkflowConditionType.PARTENAIRE_EXTERNE,
                        Set.of(WorkflowActionType.APPROVE, WorkflowActionType.REJECT),
                        true,
                        true,
                        true
                ),
                new WorkflowStepTemplate(
                        WorkflowStepCode.EVENT_ROOM_PREPARATION,
                        "Préparation salle et équipements",
                        "Le responsable salle prépare la logistique après validations métier.",
                        RoleName.RESPONSABLE_SALLE,
                        WorkflowConditionType.RESERVATION_PHYSIQUE,
                        Set.of(WorkflowActionType.PROCESS, WorkflowActionType.REJECT),
                        true,
                        true,
                        false
                ),
                new WorkflowStepTemplate(
                        WorkflowStepCode.EVENT_PUBLICATION,
                        "Statut final",
                        "Finalisation et clôture du workflow événement.",
                        RoleName.RESPONSABLE_QUALITE,
                        WorkflowConditionType.TOUJOURS,
                        Set.of(WorkflowActionType.PUBLISH, WorkflowActionType.CLOSE),
                        true,
                        false,
                        false
                ),
                new WorkflowStepTemplate(
                        WorkflowStepCode.EVENT_POST_EVENT_REPORT,
                        "Compte rendu post-événement",
                        "Étape optionnelle pour capitaliser les retours après exécution.",
                        RoleName.RESPONSABLE_QUALITE,
                        WorkflowConditionType.DOCUMENT_CONFIDENTIEL,
                        Set.of(WorkflowActionType.ARCHIVE),
                        false,
                        false,
                        false
                ),
                new WorkflowStepTemplate(
                        WorkflowStepCode.EVENT_EXTERNAL_COMMUNICATION,
                        "Communication externe",
                        "Étape optionnelle de communication vers les partenaires externes.",
                        RoleName.DIRECTEUR_DSN,
                        WorkflowConditionType.PARTENAIRE_EXTERNE,
                        Set.of(WorkflowActionType.APPROVE, WorkflowActionType.REQUEST_CHANGES),
                        false,
                        false,
                        false
                ),
                new WorkflowStepTemplate(
                        WorkflowStepCode.EVENT_SOUTENANCE_CHECKPOINT,
                        "Contrôle soutenance",
                        "Étape optionnelle de vérification finale avant soutenance.",
                        RoleName.RESPONSABLE_QUALITE,
                        WorkflowConditionType.TOUJOURS,
                        Set.of(WorkflowActionType.REQUEST_CHANGES, WorkflowActionType.CLOSE),
                        false,
                        false,
                        false
                )
        ));

        catalog.put(WorkflowType.ROOM_RESERVATION_WORKFLOW, List.of(
                new WorkflowStepTemplate(
                        WorkflowStepCode.ROOM_REQUEST_REVIEW,
                        "Soumission employé",
                        "L'employé soumet sa demande de réservation de salle.",
                        RoleName.EMPLOYE,
                        WorkflowConditionType.RESERVATION_PHYSIQUE,
                        Set.of(WorkflowActionType.SUBMIT, WorkflowActionType.CANCEL),
                        true,
                        false,
                        true
                ),
                new WorkflowStepTemplate(
                        WorkflowStepCode.ROOM_SECURITY_REVIEW,
                        "Validation sécurité",
                        "Le responsable sécurité évalue la demande.",
                        RoleName.RESPONSABLE_SECURITE,
                        WorkflowConditionType.RESERVATION_PHYSIQUE,
                        Set.of(WorkflowActionType.VALIDATE, WorkflowActionType.REJECT),
                        true,
                        true,
                        true
                ),
                new WorkflowStepTemplate(
                        WorkflowStepCode.ROOM_CONFIRMATION,
                        "Validation responsable salle",
                        "Le responsable salle confirme la disponibilité.",
                        RoleName.RESPONSABLE_SALLE,
                        WorkflowConditionType.RESERVATION_PHYSIQUE,
                        Set.of(WorkflowActionType.APPROVE, WorkflowActionType.REJECT),
                        true,
                        true,
                        false
                )
        ));

        catalog.put(WorkflowType.EQUIPMENT_RESERVATION_WORKFLOW, List.of(
                new WorkflowStepTemplate(
                        WorkflowStepCode.EQUIPMENT_REQUEST_REVIEW,
                        "Soumission employé",
                        "L'employé soumet une demande d'équipement.",
                        RoleName.EMPLOYE,
                        WorkflowConditionType.RESERVATION_PHYSIQUE,
                        Set.of(WorkflowActionType.SUBMIT, WorkflowActionType.CANCEL),
                        true,
                        false,
                        true
                ),
                new WorkflowStepTemplate(
                        WorkflowStepCode.EQUIPMENT_SECURITY_REVIEW,
                        "Validation sécurité",
                        "Le responsable sécurité valide l'usage demandé.",
                        RoleName.RESPONSABLE_SECURITE,
                        WorkflowConditionType.RESERVATION_PHYSIQUE,
                        Set.of(WorkflowActionType.VALIDATE, WorkflowActionType.REJECT),
                        true,
                        true,
                        true
                ),
                new WorkflowStepTemplate(
                        WorkflowStepCode.EQUIPMENT_CONFIRMATION,
                        "Validation responsable salle",
                        "Le responsable salle confirme la sortie de matériel.",
                        RoleName.RESPONSABLE_SALLE,
                        WorkflowConditionType.RESERVATION_PHYSIQUE,
                        Set.of(WorkflowActionType.APPROVE, WorkflowActionType.REJECT),
                        true,
                        true,
                        false
                )
        ));

        catalog.put(WorkflowType.EXTERNAL_PARTNER_WORKFLOW, List.of(
                new WorkflowStepTemplate(
                        WorkflowStepCode.PARTNER_REQUEST_REVIEW,
                        "Soumission employé",
                        "L'employé soumet une demande d'accès partenaire externe.",
                        RoleName.EMPLOYE,
                        WorkflowConditionType.PARTENAIRE_EXTERNE,
                        Set.of(WorkflowActionType.SUBMIT, WorkflowActionType.CANCEL),
                        true,
                        false,
                        true
                ),
                new WorkflowStepTemplate(
                        WorkflowStepCode.PARTNER_SECURITY_REVIEW,
                        "Validation sécurité",
                        "Le responsable sécurité examine les risques d'accès.",
                        RoleName.RESPONSABLE_SECURITE,
                        WorkflowConditionType.PARTENAIRE_EXTERNE,
                        Set.of(WorkflowActionType.VALIDATE, WorkflowActionType.REJECT),
                        true,
                        true,
                        true
                ),
                new WorkflowStepTemplate(
                        WorkflowStepCode.PARTNER_DSN_APPROVAL,
                        "Validation DSN",
                        "Le directeur DSN rend la décision finale.",
                        RoleName.DIRECTEUR_DSN,
                        WorkflowConditionType.PARTENAIRE_EXTERNE,
                        Set.of(WorkflowActionType.APPROVE, WorkflowActionType.REJECT),
                        true,
                        true,
                        true
                )
        ));

        catalog.put(WorkflowType.INTERVENTION_WORKFLOW, List.of(
                new WorkflowStepTemplate(
                        WorkflowStepCode.INTERVENTION_REQUEST_REVIEW,
                        "Soumission employé",
                        "L'employé crée la demande technique.",
                        RoleName.EMPLOYE,
                        WorkflowConditionType.TOUJOURS,
                        Set.of(WorkflowActionType.SUBMIT, WorkflowActionType.CANCEL),
                        true,
                        false,
                        true
                ),
                new WorkflowStepTemplate(
                        WorkflowStepCode.INTERVENTION_ASSIGNMENT,
                        "Traitement DSN",
                        "Le référent DSN traite l'intervention.",
                        RoleName.DIRECTEUR_DSN,
                        WorkflowConditionType.INTERVENTION_IT,
                        Set.of(WorkflowActionType.PROCESS, WorkflowActionType.REJECT),
                        true,
                        true,
                        true
                ),
                new WorkflowStepTemplate(
                        WorkflowStepCode.INTERVENTION_CLOSURE,
                        "Clôture",
                        "Validation de fin d'intervention et fermeture.",
                        RoleName.DIRECTEUR_DSN,
                        WorkflowConditionType.TOUJOURS,
                        Set.of(WorkflowActionType.CLOSE, WorkflowActionType.REJECT),
                        true,
                        true,
                        false
                )
        ));

        catalog.put(WorkflowType.GED_DOCUMENT_WORKFLOW, List.of(
                new WorkflowStepTemplate(
                        WorkflowStepCode.GED_DRAFT_REVIEW,
                        "Création document",
                        "Le document est soumis à la GED.",
                        RoleName.EMPLOYE,
                        WorkflowConditionType.TOUJOURS,
                        Set.of(WorkflowActionType.SUBMIT, WorkflowActionType.REQUEST_CHANGES),
                        true,
                        false,
                        true
                ),
                new WorkflowStepTemplate(
                        WorkflowStepCode.GED_QUALITY_REVIEW,
                        "Vérification qualité",
                        "Le responsable qualité vérifie conformité et confidentialité.",
                        RoleName.RESPONSABLE_QUALITE,
                        WorkflowConditionType.DOCUMENT_CONFIDENTIEL,
                        Set.of(WorkflowActionType.VALIDATE, WorkflowActionType.REJECT),
                        true,
                        true,
                        true
                ),
                new WorkflowStepTemplate(
                        WorkflowStepCode.GED_PUBLICATION,
                        "Publication / archivage",
                        "Publication de la version finale du document.",
                        RoleName.RESPONSABLE_QUALITE,
                        WorkflowConditionType.TOUJOURS,
                        Set.of(WorkflowActionType.PUBLISH, WorkflowActionType.ARCHIVE),
                        true,
                        false,
                        false
                )
        ));

        return Map.copyOf(catalog);
    }

    private record WorkflowStepTemplate(
            WorkflowStepCode stepCode,
            String label,
            String description,
            RoleName defaultRole,
            WorkflowConditionType defaultCondition,
            Set<WorkflowActionType> defaultActions,
            boolean required,
            boolean refusalReasonRequired,
            boolean critical
    ) {
    }

    private record WorkflowValidationResult(
            boolean valid,
            List<String> issues
    ) {
    }

    private record WorkflowSnapshot(
            WorkflowType workflowType,
            String workflowLabel,
            String description,
            boolean active,
            Map<WorkflowStepCode, WorkflowStepSnapshot> stepsByCode
    ) {
        boolean sameHeader(WorkflowSnapshot other) {
            if (other == null) {
                return false;
            }
            return workflowType == other.workflowType
                    && Objects.equals(workflowLabel, other.workflowLabel)
                    && Objects.equals(description, other.description)
                    && active == other.active;
        }

        Map<String, Object> headerView() {
            return Map.of(
                    "workflowType", workflowType.name(),
                    "workflowLabel", workflowLabel,
                    "description", description == null ? "" : description,
                    "active", active
            );
        }
    }

    private record WorkflowStepSnapshot(
            UUID stepId,
            WorkflowStepCode stepCode,
            String stepLabel,
            int stepOrder,
            RoleName responsibleRole,
            boolean required,
            boolean refusalReasonRequired,
            boolean active,
            boolean critical,
            WorkflowConditionType conditionType,
            Set<WorkflowActionType> allowedActions
    ) {
        static WorkflowStepSnapshot fromEntity(WorkflowStepEntity entity) {
            return new WorkflowStepSnapshot(
                    entity.getId(),
                    entity.getStepCode(),
                    entity.getStepName(),
                    entity.getStepOrder(),
                    entity.getResponsibleRole(),
                    entity.isRequired(),
                    entity.isRefusalReasonRequired(),
                    entity.isActive(),
                    entity.isCritical(),
                    entity.getConditionType(),
                    new HashSet<>(entity.getAllowedActions())
            );
        }

        boolean sameConfiguration(WorkflowStepSnapshot other) {
            if (other == null) {
                return false;
            }
            return stepCode == other.stepCode
                    && Objects.equals(stepLabel, other.stepLabel)
                    && stepOrder == other.stepOrder
                    && responsibleRole == other.responsibleRole
                    && required == other.required
                    && refusalReasonRequired == other.refusalReasonRequired
                    && active == other.active
                    && critical == other.critical
                    && conditionType == other.conditionType
                    && Objects.equals(allowedActions, other.allowedActions);
        }
    }
}
