package com.cnstn.intervention.service;

import com.cnstn.intervention.client.itequipment.AuthUserItEquipmentClient;
import com.cnstn.intervention.client.itequipment.AuthUserItEquipmentClientException;
import com.cnstn.intervention.client.itequipment.InternalItEquipmentOwnershipResponse;
import com.cnstn.intervention.client.itequipment.InternalItEquipmentSummaryResponse;
import com.cnstn.intervention.client.notification.NotificationClient;
import com.cnstn.intervention.config.InterventionRoutingProperties;
import com.cnstn.intervention.dto.ItInterventionApprovalRequest;
import com.cnstn.intervention.dto.ItInterventionCreateRequest;
import com.cnstn.intervention.dto.ItInterventionProcessingRequest;
import com.cnstn.intervention.dto.ItInterventionResponse;
import com.cnstn.intervention.dto.ItInterventionTransitionResponse;
import com.cnstn.intervention.entity.InterventionEntity;
import com.cnstn.intervention.entity.InterventionStatus;
import com.cnstn.intervention.entity.ItInterventionTransitionEntity;
import com.cnstn.intervention.entity.ItWorkflowStatus;
import com.cnstn.intervention.exception.BadRequestException;
import com.cnstn.intervention.exception.ConflictException;
import com.cnstn.intervention.exception.ResourceNotFoundException;
import com.cnstn.intervention.repository.InterventionRepository;
import com.cnstn.intervention.repository.ItInterventionTransitionRepository;
import java.time.Instant;
import java.util.EnumSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ItInterventionWorkflowService {

    private static final Logger log = LoggerFactory.getLogger(ItInterventionWorkflowService.class);
    private static final Set<String> ALLOWED_PRIORITIES = Set.of("LOW", "MEDIUM", "HIGH", "CRITICAL");

    private final InterventionRepository interventionRepository;
    private final ItInterventionTransitionRepository transitionRepository;
    private final NotificationClient notificationClient;
    private final AuthUserItEquipmentClient authUserItEquipmentClient;
    private final InterventionRoutingProperties routingProperties;

    public ItInterventionWorkflowService(
        InterventionRepository interventionRepository,
        ItInterventionTransitionRepository transitionRepository,
        NotificationClient notificationClient,
        AuthUserItEquipmentClient authUserItEquipmentClient,
        InterventionRoutingProperties routingProperties
    ) {
        this.interventionRepository = interventionRepository;
        this.transitionRepository = transitionRepository;
        this.notificationClient = notificationClient;
        this.authUserItEquipmentClient = authUserItEquipmentClient;
        this.routingProperties = routingProperties;
    }

    @Transactional
    public ItInterventionResponse createItIntervention(
        ItInterventionCreateRequest request,
        String employeeId,
        String employeeName
    ) {
        String safeEmployeeId = requireNonBlank(employeeId, "Demandeur introuvable.");
        InternalItEquipmentOwnershipResponse ownership = checkEquipmentOwnership(request.equipmentId(), safeEmployeeId);
        if (!ownership.owner()) {
            throw new AccessDeniedException("L'equipement selectionne n'est pas affecte a l'utilisateur connecte.");
        }
        if (ownership.equipment() == null) {
            throw new ResourceNotFoundException("Equipement IT introuvable.");
        }
        if ("ARCHIVED".equalsIgnoreCase(ownership.equipment().state())) {
            throw new BadRequestException("L'equipement IT selectionne est archive.");
        }
        if ("OUT_OF_SERVICE".equalsIgnoreCase(ownership.equipment().state())) {
            throw new BadRequestException("L'equipement IT selectionne est hors service.");
        }

        InterventionEntity entity = new InterventionEntity();
        entity.setTitle(requireNonBlank(request.title(), "Le titre est obligatoire."));
        entity.setDescription(requireNonBlank(request.description(), "La description est obligatoire."));
        entity.setEquipmentId(request.equipmentId());
        entity.setItPriority(parsePriority(request.priority()));
        entity.setRequestedBy(safeEmployeeId);
        entity.setIsItWorkflow(true);
        entity.setStatus(InterventionStatus.REQUESTED);
        entity.setItWorkflowStatus(ItWorkflowStatus.MANAGER_APPROVAL_PENDING);

        InterventionEntity saved = interventionRepository.save(entity);
        traceTransition(saved, null, ItWorkflowStatus.MANAGER_APPROVAL_PENDING, safeEmployeeId, "EMPLOYE", "Demande soumise");
        notifyManagersForApproval(saved, normalize(employeeName).isEmpty() ? safeEmployeeId : employeeName);
        notifyEmployeeStatus(saved, "Votre demande d'intervention IT a ete soumise.");

        return toResponse(saved, ownership.equipment());
    }

    @Transactional
    public ItInterventionResponse approveByManager(
        UUID interventionId,
        ItInterventionApprovalRequest request,
        String managerId
    ) {
        InterventionEntity entity = fetchItIntervention(interventionId);
        ensureStatus(entity, ItWorkflowStatus.MANAGER_APPROVAL_PENDING);

        String safeManagerId = requireNonBlank(managerId, "Validateur chef introuvable.");
        if (safeManagerId.equalsIgnoreCase(normalize(entity.getRequestedBy()))) {
            throw new AccessDeniedException("Le demandeur ne peut pas valider sa propre demande.");
        }

        validateRejectionNoteIfNeeded(request);
        entity.setManagerId(safeManagerId);
        entity.setManagerApproved(Boolean.TRUE.equals(request.approved()));
        entity.setManagerApprovalNote(normalizeOrNull(request.note()));
        entity.setManagerApprovedAt(Instant.now());

        ItWorkflowStatus fromStatus = entity.getItWorkflowStatus();
        if (Boolean.TRUE.equals(request.approved())) {
            entity.setItWorkflowStatus(ItWorkflowStatus.DSN_APPROVAL_PENDING);
            entity.setStatus(InterventionStatus.REQUESTED);
            notifyDsnForApproval(entity, safeManagerId);
        } else {
            entity.setItWorkflowStatus(ItWorkflowStatus.MANAGER_REJECTED);
            entity.setStatus(InterventionStatus.REJECTED);
            notifyEmployeeRejection(entity, "chef hierarchique", request.note());
        }

        InterventionEntity saved = interventionRepository.save(entity);
        traceTransition(saved, fromStatus, saved.getItWorkflowStatus(), safeManagerId, "CHEF_HIERARCHIQUE", normalizeOrNull(request.note()));
        return toResponse(saved, resolveEquipment(saved.getEquipmentId()));
    }

    @Transactional
    public ItInterventionResponse approveByDsn(
        UUID interventionId,
        ItInterventionApprovalRequest request,
        String dsnId
    ) {
        InterventionEntity entity = fetchItIntervention(interventionId);
        ensureStatus(entity, ItWorkflowStatus.DSN_APPROVAL_PENDING);

        String safeDsnId = requireNonBlank(dsnId, "Validateur DSN introuvable.");
        if (safeDsnId.equalsIgnoreCase(normalize(entity.getRequestedBy()))) {
            throw new AccessDeniedException("Le demandeur ne peut pas valider sa propre demande.");
        }

        validateRejectionNoteIfNeeded(request);
        entity.setDsnId(safeDsnId);
        entity.setDsnApproved(Boolean.TRUE.equals(request.approved()));
        entity.setDsnApprovalNote(normalizeOrNull(request.note()));
        entity.setDsnApprovedAt(Instant.now());

        ItWorkflowStatus fromStatus = entity.getItWorkflowStatus();
        if (Boolean.TRUE.equals(request.approved())) {
            entity.setItWorkflowStatus(ItWorkflowStatus.IT_PROCESSING_PENDING);
            entity.setStatus(InterventionStatus.REQUESTED);
            notifyItResponsibleForProcessing(entity, safeDsnId);
        } else {
            entity.setItWorkflowStatus(ItWorkflowStatus.DSN_REJECTED);
            entity.setStatus(InterventionStatus.REJECTED);
            notifyEmployeeRejection(entity, "Directeur DSN", request.note());
        }

        InterventionEntity saved = interventionRepository.save(entity);
        traceTransition(saved, fromStatus, saved.getItWorkflowStatus(), safeDsnId, "DIRECTEUR_DSN", normalizeOrNull(request.note()));
        return toResponse(saved, resolveEquipment(saved.getEquipmentId()));
    }

    @Transactional
    public ItInterventionResponse takeInCharge(
        UUID interventionId,
        String itResponsibleId,
        ItInterventionProcessingRequest request
    ) {
        InterventionEntity entity = fetchItIntervention(interventionId);
        ensureStatus(entity, ItWorkflowStatus.IT_PROCESSING_PENDING);
        String safeItId = requireNonBlank(itResponsibleId, "Responsable IT introuvable.");

        entity.setItResponsibleId(safeItId);
        entity.setItProcessingStartedAt(Instant.now());
        ItWorkflowStatus fromStatus = entity.getItWorkflowStatus();
        entity.setItWorkflowStatus(ItWorkflowStatus.IT_IN_CHARGE);
        entity.setStatus(InterventionStatus.IN_PROGRESS);
        if (request != null) {
            entity.setItDiagnosticComment(normalizeOrNull(request.note()));
        }

        InterventionEntity saved = interventionRepository.save(entity);
        traceTransition(saved, fromStatus, ItWorkflowStatus.IT_IN_CHARGE, safeItId, "RESPONSABLE_IT", request == null ? null : normalizeOrNull(request.note()));
        notifyEmployeeStatus(saved, "Votre intervention IT est prise en charge.");
        return toResponse(saved, resolveEquipment(saved.getEquipmentId()));
    }

    @Transactional
    public ItInterventionResponse markInProgress(
        UUID interventionId,
        String itResponsibleId,
        ItInterventionProcessingRequest request
    ) {
        InterventionEntity entity = fetchItIntervention(interventionId);
        ensureStatus(entity, ItWorkflowStatus.IT_IN_CHARGE);
        assertItResponsibleOwner(entity, itResponsibleId);

        ItWorkflowStatus fromStatus = entity.getItWorkflowStatus();
        entity.setItWorkflowStatus(ItWorkflowStatus.IT_IN_PROGRESS);
        entity.setStatus(InterventionStatus.IN_PROGRESS);
        if (request != null && request.note() != null) {
            entity.setItDiagnosticComment(normalizeOrNull(request.note()));
        }

        InterventionEntity saved = interventionRepository.save(entity);
        traceTransition(saved, fromStatus, ItWorkflowStatus.IT_IN_PROGRESS, normalize(itResponsibleId), "RESPONSABLE_IT", request == null ? null : normalizeOrNull(request.note()));
        notifyEmployeeStatus(saved, "Votre intervention IT est en cours.");
        return toResponse(saved, resolveEquipment(saved.getEquipmentId()));
    }

    @Transactional
    public ItInterventionResponse markResolved(
        UUID interventionId,
        String itResponsibleId,
        ItInterventionProcessingRequest request
    ) {
        InterventionEntity entity = fetchItIntervention(interventionId);
        ensureStatus(entity, ItWorkflowStatus.IT_IN_PROGRESS);
        assertItResponsibleOwner(entity, itResponsibleId);

        String comment = request == null ? null : normalizeOrNull(request.note());
        if (comment == null) {
            throw new BadRequestException("Le commentaire de diagnostic est obligatoire pour resoudre.");
        }

        ItWorkflowStatus fromStatus = entity.getItWorkflowStatus();
        entity.setItWorkflowStatus(ItWorkflowStatus.IT_RESOLVED);
        entity.setStatus(InterventionStatus.COMPLETED);
        entity.setItDiagnosticComment(comment);

        if (request.equipmentState() != null && !request.equipmentState().isBlank()) {
            try {
                authUserItEquipmentClient.updateState(entity.getEquipmentId(), normalize(request.equipmentState()).toUpperCase());
            } catch (AuthUserItEquipmentClientException ex) {
                throw mapEquipmentClientException(ex, "Impossible de mettre a jour l'etat de l'equipement IT.");
            }
        }

        InterventionEntity saved = interventionRepository.save(entity);
        traceTransition(saved, fromStatus, ItWorkflowStatus.IT_RESOLVED, normalize(itResponsibleId), "RESPONSABLE_IT", comment);
        notifyEmployeeStatus(saved, "Votre intervention IT est resolue.");
        return toResponse(saved, resolveEquipment(saved.getEquipmentId()));
    }

    @Transactional
    public ItInterventionResponse close(
        UUID interventionId,
        String itResponsibleId,
        ItInterventionProcessingRequest request
    ) {
        InterventionEntity entity = fetchItIntervention(interventionId);
        ensureStatus(entity, ItWorkflowStatus.IT_RESOLVED);
        assertItResponsibleOwner(entity, itResponsibleId);

        ItWorkflowStatus fromStatus = entity.getItWorkflowStatus();
        entity.setItWorkflowStatus(ItWorkflowStatus.IT_CLOSED);
        entity.setStatus(InterventionStatus.VALIDATED);

        InterventionEntity saved = interventionRepository.save(entity);
        traceTransition(saved, fromStatus, ItWorkflowStatus.IT_CLOSED, normalize(itResponsibleId), "RESPONSABLE_IT", request == null ? null : normalizeOrNull(request.note()));
        notifyEmployeeStatus(saved, "Votre intervention IT est fermee.");
        return toResponse(saved, resolveEquipment(saved.getEquipmentId()));
    }

    @Transactional(readOnly = true)
    public Page<ItInterventionResponse> listForEmployee(String employeeId, Pageable pageable) {
        String safeEmployeeId = requireNonBlank(employeeId, "Utilisateur introuvable.");
        return interventionRepository.findByRequestedByAndIsItWorkflowTrue(safeEmployeeId, pageable)
            .map(entity -> toResponse(entity, resolveEquipment(entity.getEquipmentId())));
    }

    @Transactional(readOnly = true)
    public Page<ItInterventionResponse> listForManager(Pageable pageable) {
        return listByStatuses(pageable, EnumSet.of(
            ItWorkflowStatus.MANAGER_APPROVAL_PENDING,
            ItWorkflowStatus.DSN_APPROVAL_PENDING,
            ItWorkflowStatus.IT_PROCESSING_PENDING,
            ItWorkflowStatus.IT_IN_CHARGE,
            ItWorkflowStatus.IT_IN_PROGRESS,
            ItWorkflowStatus.IT_RESOLVED,
            ItWorkflowStatus.IT_CLOSED,
            ItWorkflowStatus.MANAGER_REJECTED,
            ItWorkflowStatus.DSN_REJECTED
        ));
    }

    @Transactional(readOnly = true)
    public Page<ItInterventionResponse> listForDsn(Pageable pageable) {
        return listByStatuses(pageable, EnumSet.of(
            ItWorkflowStatus.DSN_APPROVAL_PENDING,
            ItWorkflowStatus.IT_PROCESSING_PENDING,
            ItWorkflowStatus.IT_IN_CHARGE,
            ItWorkflowStatus.IT_IN_PROGRESS,
            ItWorkflowStatus.IT_RESOLVED,
            ItWorkflowStatus.IT_CLOSED,
            ItWorkflowStatus.DSN_REJECTED
        ));
    }

    @Transactional(readOnly = true)
    public Page<ItInterventionResponse> listForItResponsible(Pageable pageable) {
        return listByStatuses(pageable, EnumSet.of(
            ItWorkflowStatus.IT_PROCESSING_PENDING,
            ItWorkflowStatus.IT_IN_CHARGE,
            ItWorkflowStatus.IT_IN_PROGRESS,
            ItWorkflowStatus.IT_RESOLVED,
            ItWorkflowStatus.IT_CLOSED
        ));
    }

    @Transactional(readOnly = true)
    public Page<ItInterventionResponse> listAll(Pageable pageable) {
        return interventionRepository.findByIsItWorkflowTrue(pageable)
            .map(entity -> toResponse(entity, resolveEquipment(entity.getEquipmentId())));
    }

    @Transactional(readOnly = true)
    public List<ItInterventionTransitionResponse> getHistory(UUID interventionId) {
        InterventionEntity entity = fetchItIntervention(interventionId);
        return transitionRepository.findByIntervention_IdOrderByCreatedAtAsc(entity.getId())
            .stream()
            .map(this::toHistoryResponse)
            .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ItInterventionResponse getById(UUID interventionId) {
        InterventionEntity entity = fetchItIntervention(interventionId);
        return toResponse(entity, resolveEquipment(entity.getEquipmentId()));
    }

    private Page<ItInterventionResponse> listByStatuses(Pageable pageable, Set<ItWorkflowStatus> statuses) {
        return interventionRepository.findByItWorkflowStatusInAndIsItWorkflowTrue(List.copyOf(statuses), pageable)
            .map(entity -> toResponse(entity, resolveEquipment(entity.getEquipmentId())));
    }

    private InterventionEntity fetchItIntervention(UUID interventionId) {
        InterventionEntity entity = interventionRepository.findById(Objects.requireNonNull(interventionId))
            .orElseThrow(() -> new ResourceNotFoundException("Intervention IT introuvable: " + interventionId));
        if (!isItWorkflow(entity)) {
            throw new BadRequestException("Intervention non rattachee au workflow IT.");
        }
        return entity;
    }

    private void ensureStatus(InterventionEntity entity, ItWorkflowStatus expected) {
        if (entity.getItWorkflowStatus() != expected) {
            throw new ConflictException("Transition invalide: statut actuel " + entity.getItWorkflowStatus() + ", attendu " + expected);
        }
    }

    private void assertItResponsibleOwner(InterventionEntity entity, String itResponsibleId) {
        String safeActor = requireNonBlank(itResponsibleId, "Responsable IT introuvable.");
        String owner = normalize(entity.getItResponsibleId());
        if (!owner.isEmpty() && !owner.equalsIgnoreCase(safeActor)) {
            throw new AccessDeniedException("Seul le référent DSN ayant pris en charge peut continuer le traitement.");
        }
    }

    private void validateRejectionNoteIfNeeded(ItInterventionApprovalRequest request) {
        if (!Boolean.TRUE.equals(request.approved()) && normalize(request.note()).isEmpty()) {
            throw new BadRequestException("Le motif de refus est obligatoire.");
        }
    }

    private InternalItEquipmentOwnershipResponse checkEquipmentOwnership(UUID equipmentId, String employeeId) {
        try {
            InternalItEquipmentOwnershipResponse response = authUserItEquipmentClient.checkOwnership(equipmentId, employeeId);
            if (response == null) {
                throw new ResourceNotFoundException("Equipement IT introuvable.");
            }
            return response;
        } catch (AuthUserItEquipmentClientException ex) {
            throw mapEquipmentClientException(ex, "Verification de l'equipement IT impossible.");
        }
    }

    private InternalItEquipmentSummaryResponse resolveEquipment(UUID equipmentId) {
        try {
            return authUserItEquipmentClient.getSummary(equipmentId);
        } catch (AuthUserItEquipmentClientException ex) {
            log.warn("Unable to resolve IT equipment summary for {}", equipmentId, ex);
            return null;
        }
    }

    private RuntimeException mapEquipmentClientException(AuthUserItEquipmentClientException ex, String fallbackMessage) {
        int status = ex.getStatusCode();
        if (status == 404) {
            return new ResourceNotFoundException("Equipement IT introuvable.");
        }
        if (status == 400 || status == 422) {
            String detail = extractClientDetail(ex.getResponseBody());
            return new BadRequestException(detail.isEmpty() ? fallbackMessage : detail);
        }
        if (status == 403) {
            return new AccessDeniedException("L'equipement selectionne n'est pas accessible.");
        }
        if (status == 401) {
            return new AccessDeniedException("Verification interne de l'equipement non autorisee.");
        }
        return new BadRequestException(fallbackMessage);
    }

    private String extractClientDetail(String responseBody) {
        String safeBody = normalize(responseBody);
        if (safeBody.isEmpty()) {
            return "";
        }

        int detailIndex = safeBody.indexOf("\"detail\"");
        if (detailIndex < 0) {
            return "";
        }
        int colonIndex = safeBody.indexOf(':', detailIndex);
        if (colonIndex < 0) {
            return "";
        }
        int firstQuote = safeBody.indexOf('"', colonIndex + 1);
        if (firstQuote < 0) {
            return "";
        }
        int secondQuote = safeBody.indexOf('"', firstQuote + 1);
        if (secondQuote < 0) {
            return "";
        }
        return safeBody.substring(firstQuote + 1, secondQuote).replace("\\\"", "\"").trim();
    }

    private void traceTransition(
        InterventionEntity intervention,
        ItWorkflowStatus fromStatus,
        ItWorkflowStatus toStatus,
        String actorId,
        String actorRole,
        String note
    ) {
        ItInterventionTransitionEntity transition = new ItInterventionTransitionEntity();
        transition.setIntervention(intervention);
        transition.setFromStatus(fromStatus == null ? null : fromStatus.name());
        transition.setToStatus(toStatus.name());
        transition.setActorId(requireNonBlank(actorId, "Acteur introuvable."));
        transition.setActorRole(normalizeOrNull(actorRole));
        transition.setNote(normalizeOrNull(note));
        transitionRepository.save(transition);
    }

    private ItInterventionTransitionResponse toHistoryResponse(ItInterventionTransitionEntity entity) {
        return new ItInterventionTransitionResponse(
            entity.getId(),
            entity.getFromStatus(),
            entity.getToStatus(),
            entity.getActorId(),
            entity.getActorRole(),
            entity.getNote(),
            entity.getCreatedAt()
        );
    }

    private void notifyManagersForApproval(InterventionEntity entity, String employeeName) {
        String message = "Nouvelle demande IT de " + employeeName + " en attente de validation chef.";
        notifyRecipients(routingProperties.getItManagerRecipients(), "Validation chef requise", message);
    }

    private void notifyDsnForApproval(InterventionEntity entity, String managerName) {
        String message = "Demande IT validee par " + managerName + ", en attente de validation DSN.";
        notifyRecipients(routingProperties.getDsnRecipients(), "Validation DSN requise", message);
    }

    private void notifyItResponsibleForProcessing(InterventionEntity entity, String dsnName) {
        String message = "Demande IT validee par " + dsnName + ", intervention a traiter.";
        notifyRecipients(routingProperties.getItResponsibleRecipients(), "Intervention IT a traiter", message);
    }

    private void notifyEmployeeRejection(InterventionEntity entity, String rejectedBy, String reason) {
        String message = "Votre demande IT a ete refusee par " + rejectedBy + ". Motif: " + normalize(reason);
        notifyUser(entity.getRequestedBy(), "Demande IT refusee", message);
    }

    private void notifyEmployeeStatus(InterventionEntity entity, String message) {
        notifyUser(entity.getRequestedBy(), "Mise a jour intervention IT", message);
    }

    private void notifyRecipients(List<String> recipients, String title, String message) {
        if (recipients == null) {
            return;
        }
        recipients.stream()
            .map(this::normalize)
            .filter(value -> !value.isEmpty())
            .forEach(recipient -> notifyUser(recipient, title, message));
    }

    private void notifyUser(String recipient, String title, String message) {
        String safeRecipient = normalize(recipient);
        if (safeRecipient.isEmpty()) {
            return;
        }
        try {
            notificationClient.sendInternalNotification(safeRecipient, title, message);
        } catch (Exception ex) {
            log.warn("Notification dispatch failed for {}", safeRecipient, ex);
        }
    }

    private ItInterventionResponse toResponse(InterventionEntity entity, InternalItEquipmentSummaryResponse equipment) {
        return new ItInterventionResponse(
            entity.getId(),
            entity.getTitle(),
            entity.getDescription(),
            entity.getEquipmentId(),
            equipment == null ? null : equipment.equipmentName(),
            equipment == null ? null : equipment.serialNumber(),
            equipment == null ? null : equipment.categoryName(),
            entity.getItPriority(),
            entity.getRequestedBy(),
            entity.getRequestedBy(),
            entity.getItWorkflowStatus(),
            entity.getManagerApproved(),
            entity.getManagerApprovalNote(),
            entity.getManagerId(),
            entity.getDsnApproved(),
            entity.getDsnApprovalNote(),
            entity.getDsnId(),
            entity.getItResponsibleId(),
            entity.getItDiagnosticComment(),
            equipment == null ? null : equipment.assignedAt(),
            entity.getManagerApprovedAt(),
            entity.getDsnApprovedAt(),
            entity.getItProcessingStartedAt(),
            entity.getCreatedAt(),
            entity.getUpdatedAt()
        );
    }

    private boolean isItWorkflow(InterventionEntity entity) {
        return entity.getIsItWorkflow() != null && entity.getIsItWorkflow();
    }

    private String parsePriority(String value) {
        String normalized = normalize(value).toUpperCase();
        if (!ALLOWED_PRIORITIES.contains(normalized)) {
            throw new BadRequestException("Priorite IT invalide: " + value);
        }
        return normalized;
    }

    private String requireNonBlank(String value, String message) {
        String normalized = normalize(value);
        if (normalized.isEmpty()) {
            throw new BadRequestException(message);
        }
        return normalized;
    }

    private String normalizeOrNull(String value) {
        String normalized = normalize(value);
        return normalized.isEmpty() ? null : normalized;
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim();
    }
}
