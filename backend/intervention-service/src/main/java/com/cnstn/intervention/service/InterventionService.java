package com.cnstn.intervention.service;

import com.cnstn.intervention.client.notification.NotificationClient;
import com.cnstn.intervention.config.InterventionRoutingProperties;
import com.cnstn.intervention.dto.InterventionCreateRequest;
import com.cnstn.intervention.dto.InterventionResponse;
import com.cnstn.intervention.dto.InterventionStatusUpdateRequest;
import com.cnstn.intervention.dto.InterventionUpdateRequest;
import com.cnstn.intervention.dto.InterventionValidationRequest;
import com.cnstn.intervention.dto.PageResponse;
import com.cnstn.intervention.entity.InterventionEntity;
import com.cnstn.intervention.entity.InterventionStatus;
import com.cnstn.intervention.exception.ConflictException;
import com.cnstn.intervention.exception.ResourceNotFoundException;
import com.cnstn.intervention.mapper.InterventionMapper;
import com.cnstn.intervention.repository.InterventionRepository;
import java.time.Instant;
import java.util.LinkedHashSet;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class InterventionService {

    private static final Logger log = LoggerFactory.getLogger(InterventionService.class);

    private final InterventionRepository interventionRepository;
    private final NotificationClient notificationClient;
    private final InterventionRoutingProperties interventionRoutingProperties;

    public InterventionService(
            InterventionRepository interventionRepository,
            NotificationClient notificationClient,
            InterventionRoutingProperties interventionRoutingProperties
    ) {
        this.interventionRepository = interventionRepository;
        this.notificationClient = notificationClient;
        this.interventionRoutingProperties = interventionRoutingProperties;
    }

    @Transactional(readOnly = true)
    public PageResponse<InterventionResponse> list(
            Pageable pageable,
            String search,
            InterventionStatus status,
            String assignedTo
    ) {
        Page<InterventionEntity> page = interventionRepository.findAll(
                buildListSpecification(search, status, assignedTo, null),
                Objects.requireNonNull(pageable)
        );
        return new PageResponse<>(
                page.map(InterventionMapper::toResponse).getContent(),
                page.getNumber(),
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages()
        );
    }

    @Transactional(readOnly = true)
    public PageResponse<InterventionResponse> listMine(
            Pageable pageable,
            String username,
            String search,
            InterventionStatus status,
            String assignedTo
    ) {
        Pageable safePageable = Objects.requireNonNull(pageable);
        String safeUsername = normalize(username);
        Page<InterventionEntity> page = safeUsername.isEmpty()
                ? new PageImpl<>(java.util.List.of(), safePageable, 0)
                : interventionRepository.findAll(
                        buildListSpecification(search, status, assignedTo, safeUsername),
                        safePageable
                );
        return new PageResponse<>(
                page.map(InterventionMapper::toResponse).getContent(),
                page.getNumber(),
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages()
        );
    }

    @Transactional(readOnly = true)
    public InterventionResponse getById(UUID id) {
        return InterventionMapper.toResponse(fetchIntervention(Objects.requireNonNull(id)));
    }

    @Transactional
    public InterventionResponse create(InterventionCreateRequest request, String username) {
        InterventionEntity entity = new InterventionEntity();
        entity.setTitle(request.title().trim());
        entity.setDescription(request.description().trim());
        entity.setInterventionType(normalizeOrDefault(request.type(), "SUPPORT"));
        entity.setPriority(normalizeOrDefault(request.priority(), "MEDIUM"));
        entity.setLocation(normalizeOrNull(request.location()));
        entity.setRequestedBy(username);
        entity.setStatus(InterventionStatus.REQUESTED);

        InterventionEntity saved = interventionRepository.save(entity);
        notifyInterventionCreated(saved);
        notifyRoomManagerOnCreate(saved);
        return InterventionMapper.toResponse(saved);
    }

    @Transactional
    public InterventionResponse updateOwnRequest(
            UUID id,
            InterventionUpdateRequest request,
            String username,
            boolean adminOverride
    ) {
        InterventionEntity entity = fetchIntervention(Objects.requireNonNull(id));
        assertCanManageRequest(entity, username, adminOverride);
        ensureEditableStatus(entity);

        entity.setTitle(request.title().trim());
        entity.setDescription(request.description().trim());
        entity.setInterventionType(normalizeOrDefault(request.type(), entity.getInterventionType()));
        entity.setPriority(normalizeOrDefault(request.priority(), entity.getPriority()));
        entity.setLocation(normalizeOrNull(request.location()));
        InterventionEntity saved = interventionRepository.save(entity);
        return InterventionMapper.toResponse(saved);
    }

    @Transactional
    public void deleteOwnRequest(UUID id, String username, boolean adminOverride) {
        InterventionEntity entity = fetchIntervention(Objects.requireNonNull(id));
        assertCanManageRequest(entity, username, adminOverride);
        ensureEditableStatus(entity);
        interventionRepository.delete(entity);
    }

    @Transactional
    public InterventionResponse updateStatus(UUID id, InterventionStatusUpdateRequest request, String updatedBy) {
        InterventionEntity entity = fetchIntervention(Objects.requireNonNull(id));
        ensureTransitionAllowed(entity.getStatus(), request.status());
        entity.setStatus(request.status());
        entity.setAssignedTo(request.assignedTo());
        if (request.status() == InterventionStatus.COMPLETED) {
            entity.setResolution(normalizeOrNull(request.resolution()));
            entity.setSatisfactionRating(request.satisfactionRating());
            entity.setResolvedAt(Instant.now());
        }
        InterventionEntity saved = interventionRepository.save(entity);
        notifyStatusUpdated(saved, updatedBy);
        return InterventionMapper.toResponse(saved);
    }

    @Transactional
    public InterventionResponse validate(UUID id, InterventionValidationRequest request, String validator) {
        InterventionEntity entity = fetchIntervention(Objects.requireNonNull(id));
        ensureValidationAllowed(entity.getStatus(), Boolean.TRUE.equals(request.approved()));
        entity.setStatus(request.approved() ? InterventionStatus.VALIDATED : InterventionStatus.REJECTED);
        entity.setValidationNote(request.note());
        entity.setValidatedBy(validator);
        InterventionEntity saved = interventionRepository.save(entity);
        notifyValidation(saved, Boolean.TRUE.equals(request.approved()), validator, request.note());
        return InterventionMapper.toResponse(saved);
    }

    private InterventionEntity fetchIntervention(UUID id) {
        UUID safeId = Objects.requireNonNull(id);
        return interventionRepository.findById(safeId)
                .orElseThrow(() -> new ResourceNotFoundException("Intervention not found: " + id));
    }

    private void assertCanManageRequest(InterventionEntity entity, String username, boolean adminOverride) {
        if (adminOverride) {
            return;
        }

        String requester = normalize(entity.getRequestedBy());
        String currentUser = normalize(username);
        if (!requester.equalsIgnoreCase(currentUser)) {
            throw new AccessDeniedException("You can only manage your own intervention request.");
        }
    }

    private void ensureEditableStatus(InterventionEntity entity) {
        if (entity.getStatus() != InterventionStatus.REQUESTED) {
            throw new ConflictException("Intervention can be updated or deleted only while it is REQUESTED.");
        }
    }

    private void ensureTransitionAllowed(InterventionStatus currentStatus, InterventionStatus nextStatus) {
        if (currentStatus == nextStatus) {
            return;
        }

        boolean allowed = switch (currentStatus) {
            case REQUESTED -> nextStatus == InterventionStatus.IN_PROGRESS || nextStatus == InterventionStatus.COMPLETED;
            case IN_PROGRESS -> nextStatus == InterventionStatus.COMPLETED;
            case COMPLETED -> false;
            case VALIDATED, REJECTED -> false;
        };

        if (!allowed) {
            throw new ConflictException(
                    "Invalid intervention status transition: " + currentStatus + " -> " + nextStatus
            );
        }
    }

    private void ensureValidationAllowed(InterventionStatus currentStatus, boolean approved) {
        if (currentStatus == InterventionStatus.VALIDATED || currentStatus == InterventionStatus.REJECTED) {
            throw new ConflictException("Intervention is already validated or rejected.");
        }

        if (approved && currentStatus != InterventionStatus.COMPLETED) {
            throw new ConflictException("Only COMPLETED interventions can be validated.");
        }
    }

    private void notifyInterventionCreated(InterventionEntity intervention) {
        String requester = normalize(intervention.getRequestedBy());
        if (requester.isEmpty()) {
            return;
        }

        String safeTitle = normalize(intervention.getTitle());
        if (safeTitle.isEmpty()) {
            safeTitle = "intervention";
        }

        sendNotificationSafely(
                requester,
                "Intervention enregistree",
                "Votre intervention \"" + safeTitle + "\" a ete creee."
        );
    }

    private void notifyRoomManagerOnCreate(InterventionEntity intervention) {
        String requester = normalize(intervention.getRequestedBy());
        String safeTitle = normalize(intervention.getTitle());
        if (safeTitle.isEmpty()) {
            safeTitle = "intervention";
        }
        final String titleForMessage = safeTitle;

        Set<String> recipients = interventionRoutingProperties.getRoomManagerRecipients().stream()
                .map(this::normalize)
                .filter(value -> !value.isEmpty())
                .collect(LinkedHashSet::new, Set::add, Set::addAll);

        if (requester.isEmpty()) {
            recipients.forEach(recipient -> sendNotificationSafely(
                    recipient,
                    "Nouvelle intervention en attente",
                    "Une nouvelle intervention \"" + titleForMessage + "\" a ete soumise."
            ));
            return;
        }

        recipients.stream()
                .filter(recipient -> !recipient.equalsIgnoreCase(requester))
                .forEach(recipient -> sendNotificationSafely(
                        recipient,
                        "Nouvelle intervention en attente",
                        "Une nouvelle intervention \"" + titleForMessage + "\" a ete soumise par " + requester + "."
                ));
    }

    private void notifyStatusUpdated(InterventionEntity intervention, String updatedBy) {
        String requester = normalize(intervention.getRequestedBy());
        String updater = normalize(updatedBy);
        String assignee = normalize(intervention.getAssignedTo());
        String safeTitle = normalize(intervention.getTitle());
        if (safeTitle.isEmpty()) {
            safeTitle = "intervention";
        }

        String statusLabel = intervention.getStatus().name();
        sendNotificationSafely(
                requester,
                "Intervention mise a jour",
                "Votre intervention \"" + safeTitle + "\" est passee au statut " + statusLabel + "."
        );

        if (!updater.equalsIgnoreCase(requester)) {
            sendNotificationSafely(
                    updater,
                    "Mise a jour intervention effectuee",
                    "Vous avez mis a jour l intervention \"" + safeTitle + "\" au statut " + statusLabel + "."
            );
        }

        if (!assignee.isEmpty()
                && !assignee.equalsIgnoreCase(requester)
                && !assignee.equalsIgnoreCase(updater)) {
            sendNotificationSafely(
                    assignee,
                    "Intervention assignee",
                    "Vous etes assigne a l intervention \"" + safeTitle + "\" (statut " + statusLabel + ")."
            );
        }
    }

    private void notifyValidation(InterventionEntity intervention, boolean approved, String validator, String note) {
        String requester = normalize(intervention.getRequestedBy());
        String safeValidator = normalize(validator);
        String safeTitle = normalize(intervention.getTitle());
        if (safeTitle.isEmpty()) {
            safeTitle = "intervention";
        }

        String requesterTitle = approved ? "Intervention validee" : "Intervention rejetee";
        String requesterMessage = approved
                ? "Votre intervention \"" + safeTitle + "\" a ete validee."
                : "Votre intervention \"" + safeTitle + "\" a ete rejetee.";
        if (!safeValidator.isEmpty()) {
            requesterMessage += " Decision prise par " + safeValidator + ".";
        }
        String safeNote = normalize(note);
        if (!safeNote.isEmpty()) {
            requesterMessage += " Note: " + safeNote;
        }

        String validatorTitle = approved ? "Validation intervention effectuee" : "Refus intervention enregistre";
        String validatorMessage = approved
                ? "Vous avez valide l intervention \"" + safeTitle + "\"."
                : "Vous avez rejete l intervention \"" + safeTitle + "\".";
        if (!requester.isEmpty()) {
            validatorMessage += " Demandeur: " + requester + ".";
        }

        sendNotificationSafely(requester, requesterTitle, requesterMessage);
        if (!safeValidator.equalsIgnoreCase(requester)) {
            sendNotificationSafely(safeValidator, validatorTitle, validatorMessage);
        }
    }

    private void sendNotificationSafely(String recipientUsername, String title, String message) {
        String recipient = normalize(recipientUsername);
        if (recipient.isEmpty()) {
            return;
        }

        try {
            notificationClient.sendInternalNotification(recipient, title, message);
        } catch (Exception ex) {
            log.warn("Notification dispatch failed for recipient {}", recipient, ex);
        }
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim();
    }

    private String normalizeOrNull(String value) {
        String normalized = normalize(value);
        return normalized.isEmpty() ? null : normalized;
    }

    private String normalizeOrDefault(String value, String defaultValue) {
        String normalized = normalize(value);
        return normalized.isEmpty() ? defaultValue : normalized;
    }

    private Specification<InterventionEntity> buildListSpecification(
            String search,
            InterventionStatus status,
            String assignedTo,
            String requestedBy
    ) {
        Specification<InterventionEntity> specification = (root, query, cb) -> cb.conjunction();
        String normalizedSearch = normalizeOrNull(search);
        String normalizedAssignedTo = normalizeOrNull(assignedTo);
        String normalizedRequestedBy = normalizeOrNull(requestedBy);

        if (normalizedSearch != null) {
            specification = specification.and((root, query, cb) -> {
                String pattern = "%" + normalizedSearch.toLowerCase() + "%";
                return cb.or(
                        cb.like(cb.lower(root.get("title")), pattern),
                        cb.like(cb.lower(root.get("description")), pattern),
                        cb.like(cb.lower(root.get("requestedBy")), pattern),
                        cb.like(cb.lower(root.get("assignedTo")), pattern)
                );
            });
        }

        if (status != null) {
            specification = specification.and((root, query, cb) -> cb.equal(root.get("status"), status));
        }

        if (normalizedAssignedTo != null) {
            specification = specification.and((root, query, cb) ->
                    cb.like(cb.lower(root.get("assignedTo")), "%" + normalizedAssignedTo.toLowerCase() + "%"));
        }

        if (normalizedRequestedBy != null) {
            specification = specification.and((root, query, cb) ->
                    cb.equal(cb.lower(root.get("requestedBy")), normalizedRequestedBy.toLowerCase()));
        }

        return specification;
    }
}
