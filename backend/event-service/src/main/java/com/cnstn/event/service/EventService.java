package com.cnstn.event.service;

import com.cnstn.event.client.notification.NotificationClient;
import com.cnstn.event.client.reservation.InternalEventReservationSummaryResponse;
import com.cnstn.event.client.reservation.InternalEventSecurityValidationRequest;
import com.cnstn.event.client.reservation.ReservationWorkflowClient;
import com.cnstn.event.client.reservation.ReservationWorkflowClientProperties;
import com.cnstn.event.config.EventInvitationProperties;
import com.cnstn.event.dto.EventCreateRequest;
import com.cnstn.event.dto.EventDecisionRequest;
import com.cnstn.event.dto.EventDocumentContent;
import com.cnstn.event.dto.EventDocumentResponse;
import com.cnstn.event.dto.EventInviteRecipientRequest;
import com.cnstn.event.dto.EventInviteRequest;
import com.cnstn.event.dto.EventInvitationRespondRequest;
import com.cnstn.event.dto.EventInvitationResponse;
import com.cnstn.event.dto.EventMeetingResponse;
import com.cnstn.event.dto.EventReservationContextResponse;
import com.cnstn.event.dto.EventResponse;
import com.cnstn.event.dto.EventSubmissionRequest;
import com.cnstn.event.dto.EventUpdateRequest;
import com.cnstn.event.dto.PageResponse;
import com.cnstn.event.dto.PartnerInviteRequest;
import com.cnstn.event.dto.PartnerInviteResponse;
import com.cnstn.event.entity.EventEntity;
import com.cnstn.event.entity.EventMode;
import com.cnstn.event.entity.EventStatus;
import com.cnstn.event.entity.EventType;
import com.cnstn.event.entity.EventInvitationEntity;
import com.cnstn.event.entity.EventInvitationStatus;
import com.cnstn.event.entity.EventWorkflowStep;
import com.cnstn.event.entity.EventOfficialDocumentType;
import com.cnstn.event.entity.PartnerInvitationEntity;
import com.cnstn.event.exception.BadRequestException;
import com.cnstn.event.exception.ResourceNotFoundException;
import com.cnstn.event.mapper.EventMapper;
import com.cnstn.event.repository.EventRepository;
import com.cnstn.event.repository.EventInvitationRepository;
import com.cnstn.event.repository.PartnerInvitationRepository;
import feign.FeignException;
import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class EventService {

    private static final Logger log = LoggerFactory.getLogger(EventService.class);
    private static final String ROLE_MANAGER = "CHEF_HIERARCHIQUE";
    private static final String ROLE_SECURITY = "RESPONSABLE_SECURITE";
    private static final String ROLE_DSN = "DIRECTEUR_DSN";
    private static final String ROLE_ROOM = "RESPONSABLE_SALLE";

    private final EventRepository eventRepository;
    private final PartnerInvitationRepository partnerInvitationRepository;
    private final EventInvitationRepository eventInvitationRepository;
    private final NotificationClient notificationClient;
    private final ReservationWorkflowClient reservationWorkflowClient;
    private final ReservationWorkflowClientProperties reservationWorkflowClientProperties;
    private final EventInvitationProperties eventInvitationProperties;
    private final EventReferenceGeneratorService eventReferenceGeneratorService;
    private final EventOfficialDocumentService eventOfficialDocumentService;

    public EventService(
            EventRepository eventRepository,
            PartnerInvitationRepository partnerInvitationRepository,
            EventInvitationRepository eventInvitationRepository,
            NotificationClient notificationClient,
            ReservationWorkflowClient reservationWorkflowClient,
            ReservationWorkflowClientProperties reservationWorkflowClientProperties,
            EventInvitationProperties eventInvitationProperties,
            EventReferenceGeneratorService eventReferenceGeneratorService,
            EventOfficialDocumentService eventOfficialDocumentService
    ) {
        this.eventRepository = eventRepository;
        this.partnerInvitationRepository = partnerInvitationRepository;
        this.eventInvitationRepository = eventInvitationRepository;
        this.notificationClient = notificationClient;
        this.reservationWorkflowClient = reservationWorkflowClient;
        this.reservationWorkflowClientProperties = reservationWorkflowClientProperties;
        this.eventInvitationProperties = eventInvitationProperties;
        this.eventReferenceGeneratorService = eventReferenceGeneratorService;
        this.eventOfficialDocumentService = eventOfficialDocumentService;
    }

    @Transactional(readOnly = true)
    public PageResponse<EventResponse> list(
            Pageable pageable,
            String search,
            EventStatus status,
            EventType eventType,
            EventMode eventMode,
            EventWorkflowStep workflowStep,
            String requestedBy
    ) {
        Specification<EventEntity> specification = buildListSpecification(
                search,
                status,
                eventType,
                eventMode,
                workflowStep,
                requestedBy
        );
        Page<EventEntity> page = eventRepository.findAll(specification, Objects.requireNonNull(pageable));
        return new PageResponse<>(
                page.map(EventMapper::toResponse).getContent(),
                page.getNumber(),
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages()
        );
    }

    @Transactional(readOnly = true)
    public EventResponse getById(UUID id) {
        return EventMapper.toResponse(fetchEvent(Objects.requireNonNull(id)));
    }

    @Transactional(readOnly = true)
    public EventMeetingResponse getMeeting(UUID id) {
        EventEntity event = fetchEvent(Objects.requireNonNull(id));
        boolean onlineAvailable = event.getEventMode() == EventMode.EN_LIGNE || event.getEventMode() == EventMode.HYBRIDE;
        return new EventMeetingResponse(
                event.getId(),
                event.getTitle(),
                event.getStartAt(),
                event.getEndAt(),
                event.getEventMode(),
                event.getMeetingRoomId(),
                onlineAvailable
        );
    }

    @Transactional(readOnly = true)
    public EventReservationContextResponse reservationContext(UUID eventId) {
        EventEntity event = fetchEvent(Objects.requireNonNull(eventId));
        boolean reservationAllowed = event.getWorkflowStep() == EventWorkflowStep.BROUILLON
                || event.getWorkflowStep() == EventWorkflowStep.VALIDATION_MANAGER
                || event.getWorkflowStep() == EventWorkflowStep.REFUSE;

        return new EventReservationContextResponse(
                event.getId(),
                event.getEventMode(),
                event.getWorkflowStep(),
                event.getStatus(),
                reservationAllowed
        );
    }

    @Transactional
    public EventResponse create(EventCreateRequest request, String username) {
        EventEntity entity = new EventEntity();
        entity.setRequestedBy(username);
        entity.setBusinessVersion(1);
        entity.setReferenceCode(eventReferenceGeneratorService.nextEventReference());
        entity.setStatus(EventStatus.DRAFT);
        entity.setWorkflowStep(EventWorkflowStep.BROUILLON);
        entity.setHasExternalPartners(false);

        applyCreatePayload(entity, request);
        validateEventChronology(entity.getStartAt(), entity.getEndAt());
        validateModeCoherence(entity);
        refreshMeetingRoom(entity);

        EventEntity saved = eventRepository.save(entity);
        return EventMapper.toResponse(saved);
    }

    @Transactional
    public EventResponse update(UUID id, EventUpdateRequest request, String username, boolean adminOverride) {
        EventEntity event = fetchEvent(Objects.requireNonNull(id));
        ensureEventEditable(event, username, adminOverride);
        applyUpdatePayload(event, request);
        validateEventChronology(event.getStartAt(), event.getEndAt());
        validateModeCoherence(event);
        refreshMeetingRoom(event);
        return EventMapper.toResponse(eventRepository.save(event));
    }

    @Transactional
    public EventResponse submit(UUID id, EventSubmissionRequest request, String username) {
        EventEntity event = fetchEvent(Objects.requireNonNull(id));
        ensureEventOwnedByRequester(event, username);

        if (event.getStatus() != EventStatus.DRAFT && event.getStatus() != EventStatus.REJECTED) {
            throw new BadRequestException("Seuls les evenements brouillon ou refuses peuvent etre soumis");
        }

        validateEventChronology(event.getStartAt(), event.getEndAt());
        validateModeCoherence(event);

        event.setHasExternalPartners(partnerInvitationRepository.existsByEventId(event.getId()));
        InternalEventReservationSummaryResponse summary = fetchReservationSummary(event.getId());
        validateReservationCoherence(event, summary);

        if (event.getStatus() == EventStatus.REJECTED) {
            event.setBusinessVersion(event.getBusinessVersion() + 1);
        }

        resetWorkflowDecisions(event);
        event.setStatus(EventStatus.PENDING);
        event.setWorkflowStep(EventWorkflowStep.VALIDATION_MANAGER);
        event.setSubmittedBy(username);
        event.setSubmittedAt(Instant.now());
        event.setDecisionComment(normalizeOrNull(request == null ? null : request.comment()));

        EventEntity saved = eventRepository.save(event);
        eventOfficialDocumentService.generateSubmissionDocument(
                saved,
                username,
                request == null ? null : request.comment()
        );
        notifySubmission(saved);
        return EventMapper.toResponse(saved);
    }

    @Transactional
    public EventResponse managerDecision(UUID id, EventDecisionRequest request, String decidedBy) {
        EventEntity event = fetchEvent(Objects.requireNonNull(id));
        ensureWorkflowStep(event, EventWorkflowStep.VALIDATION_MANAGER);

        boolean approved = Boolean.TRUE.equals(request.approved());
        String decisionComment = normalize(request.decisionComment());
        String rejectionReason = resolveRejectionReason(request, decisionComment, approved);

        event.setManagerDecisionBy(decidedBy);
        event.setManagerDecisionAt(Instant.now());
        event.setManagerDecisionComment(normalizeOrNull(decisionComment));

        if (!approved) {
            markRejected(event, rejectionReason, decidedBy, decisionComment);
            EventEntity saved = eventRepository.save(event);
            eventOfficialDocumentService.generateDecisionDocument(
                    saved,
                    EventOfficialDocumentType.DECISION_MANAGER,
                    false,
                    ROLE_MANAGER,
                    decidedBy,
                    decisionComment,
                    rejectionReason,
                    saved.getManagerDecisionAt()
            );
            notifyDecision(saved, false, decidedBy, rejectionReason);
            return EventMapper.toResponse(saved);
        }

        InternalEventReservationSummaryResponse summary = fetchReservationSummary(event.getId());
        validateReservationCoherence(event, summary);

        event.setWorkflowStep(EventWorkflowStep.VALIDATION_SECURITE);
        event.setStatus(EventStatus.PENDING);
        event.setDecisionComment(normalizeOrNull(decisionComment));
        event.setDecidedBy(decidedBy);

        EventEntity saved = eventRepository.save(event);
        eventOfficialDocumentService.generateDecisionDocument(
                saved,
                EventOfficialDocumentType.DECISION_MANAGER,
                true,
                ROLE_MANAGER,
                decidedBy,
                decisionComment,
                null,
                saved.getManagerDecisionAt()
        );
        notifyDecision(saved, true, decidedBy, decisionComment);
        return EventMapper.toResponse(saved);
    }

    @Transactional
    public EventResponse securityDecision(UUID id, EventDecisionRequest request, String decidedBy) {
        EventEntity event = fetchEvent(Objects.requireNonNull(id));
        ensureWorkflowStep(event, EventWorkflowStep.VALIDATION_SECURITE);

        boolean approved = Boolean.TRUE.equals(request.approved());
        String decisionComment = normalize(request.decisionComment());
        String rejectionReason = resolveRejectionReason(request, decisionComment, approved);

        event.setSecurityDecisionBy(decidedBy);
        event.setSecurityDecisionAt(Instant.now());
        event.setSecurityDecisionComment(normalizeOrNull(decisionComment));

        InternalEventReservationSummaryResponse summary = fetchReservationSummary(event.getId());
        if (summary.hasPhysicalReservation()) {
            summary = applyReservationSecurityDecision(
                    event.getId(),
                    approved,
                    decidedBy,
                    approved ? decisionComment : rejectionReason
            );
        }

        if (!approved) {
            markRejected(event, rejectionReason, decidedBy, decisionComment);
            EventEntity saved = eventRepository.save(event);
            eventOfficialDocumentService.generateDecisionDocument(
                    saved,
                    EventOfficialDocumentType.DECISION_SECURITE,
                    false,
                    ROLE_SECURITY,
                    decidedBy,
                    decisionComment,
                    rejectionReason,
                    saved.getSecurityDecisionAt()
            );
            notifyDecision(saved, false, decidedBy, rejectionReason);
            return EventMapper.toResponse(saved);
        }

        if (summary.hasPhysicalReservation() && !summary.securityApproved()) {
            throw new BadRequestException("La validation securite des reservations n est pas complete");
        }

        if (event.isHasExternalPartners()) {
            event.setWorkflowStep(EventWorkflowStep.VALIDATION_DSN);
            event.setStatus(EventStatus.PENDING);
            event.setDecisionComment(normalizeOrNull(decisionComment));
            event.setDecidedBy(decidedBy);
        } else if (requiresRoomPreparation(event, summary)) {
            event.setWorkflowStep(EventWorkflowStep.VALIDATION_SALLE);
            event.setStatus(EventStatus.PENDING);
            event.setDecisionComment(normalizeOrNull(decisionComment));
            event.setDecidedBy(decidedBy);
        } else {
            markApproved(event, decidedBy, decisionComment);
        }

        EventEntity saved = eventRepository.save(event);
        eventOfficialDocumentService.generateDecisionDocument(
                saved,
                EventOfficialDocumentType.DECISION_SECURITE,
                true,
                ROLE_SECURITY,
                decidedBy,
                decisionComment,
                null,
                saved.getSecurityDecisionAt()
        );
        notifyDecision(saved, true, decidedBy, decisionComment);
        return EventMapper.toResponse(saved);
    }

    @Transactional
    public EventResponse dsnDecision(UUID id, EventDecisionRequest request, String decidedBy) {
        EventEntity event = fetchEvent(Objects.requireNonNull(id));
        ensureWorkflowStep(event, EventWorkflowStep.VALIDATION_DSN);

        if (!event.isHasExternalPartners()) {
            throw new BadRequestException("La validation DSN est reservee aux evenements avec partenaires externes");
        }

        boolean approved = Boolean.TRUE.equals(request.approved());
        String decisionComment = normalize(request.decisionComment());
        String rejectionReason = resolveRejectionReason(request, decisionComment, approved);

        event.setDsnDecisionBy(decidedBy);
        event.setDsnDecisionAt(Instant.now());
        event.setDsnDecisionComment(normalizeOrNull(decisionComment));

        if (!approved) {
            markRejected(event, rejectionReason, decidedBy, decisionComment);
            EventEntity saved = eventRepository.save(event);
            eventOfficialDocumentService.generateDecisionDocument(
                    saved,
                    EventOfficialDocumentType.DECISION_DSN,
                    false,
                    ROLE_DSN,
                    decidedBy,
                    decisionComment,
                    rejectionReason,
                    saved.getDsnDecisionAt()
            );
            notifyDecision(saved, false, decidedBy, rejectionReason);
            return EventMapper.toResponse(saved);
        }

        InternalEventReservationSummaryResponse summary = fetchReservationSummary(event.getId());
        if (requiresRoomPreparation(event, summary)) {
            event.setWorkflowStep(EventWorkflowStep.VALIDATION_SALLE);
            event.setStatus(EventStatus.PENDING);
            event.setDecisionComment(normalizeOrNull(decisionComment));
            event.setDecidedBy(decidedBy);
        } else {
            markApproved(event, decidedBy, decisionComment);
        }
        EventEntity saved = eventRepository.save(event);
        eventOfficialDocumentService.generateDecisionDocument(
                saved,
                EventOfficialDocumentType.DECISION_DSN,
                true,
                ROLE_DSN,
                decidedBy,
                decisionComment,
                null,
                saved.getDsnDecisionAt()
        );
        notifyDecision(saved, true, decidedBy, decisionComment);
        return EventMapper.toResponse(saved);
    }

    @Transactional
    public EventResponse roomDecision(UUID id, EventDecisionRequest request, String decidedBy) {
        EventEntity event = fetchEvent(Objects.requireNonNull(id));
        ensureWorkflowStep(event, EventWorkflowStep.VALIDATION_SALLE);

        boolean approved = Boolean.TRUE.equals(request.approved());
        String decisionComment = normalize(request.decisionComment());
        String rejectionReason = resolveRejectionReason(request, decisionComment, approved);

        if (!approved) {
            markRejected(event, rejectionReason, decidedBy, decisionComment);
            EventEntity saved = eventRepository.save(event);
            eventOfficialDocumentService.generateDecisionDocument(
                    saved,
                    EventOfficialDocumentType.DECISION_SALLE,
                    false,
                    ROLE_ROOM,
                    decidedBy,
                    decisionComment,
                    rejectionReason,
                    Instant.now()
            );
            notifyDecision(saved, false, decidedBy, rejectionReason);
            return EventMapper.toResponse(saved);
        }

        markApproved(event, decidedBy, decisionComment);
        EventEntity saved = eventRepository.save(event);
        eventOfficialDocumentService.generateDecisionDocument(
                saved,
                EventOfficialDocumentType.DECISION_SALLE,
                true,
                ROLE_ROOM,
                decidedBy,
                decisionComment,
                null,
                Instant.now()
        );
        notifyDecision(saved, true, decidedBy, decisionComment);
        return EventMapper.toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<EventDocumentResponse> listDocuments(UUID eventId) {
        UUID safeEventId = Objects.requireNonNull(eventId);
        fetchEvent(safeEventId);
        return eventOfficialDocumentService.listByEvent(safeEventId);
    }

    @Transactional(readOnly = true)
    public EventDocumentContent downloadDocument(UUID eventId, UUID documentId) {
        UUID safeEventId = Objects.requireNonNull(eventId);
        EventEntity event = fetchEvent(safeEventId);
        return eventOfficialDocumentService.download(event, Objects.requireNonNull(documentId));
    }

    @Transactional(readOnly = true)
    public EventDocumentContent downloadLatestDocument(UUID eventId) {
        UUID safeEventId = Objects.requireNonNull(eventId);
        EventEntity event = fetchEvent(safeEventId);
        return eventOfficialDocumentService.downloadLatest(event);
    }

    @Transactional
    public EventResponse decideWithCurrentStep(UUID id, EventDecisionRequest request, String decidedBy, Authentication authentication) {
        EventEntity event = fetchEvent(Objects.requireNonNull(id));
        Set<String> roles = extractRoles(authentication);

        if (event.getWorkflowStep() == EventWorkflowStep.VALIDATION_MANAGER) {
            if (!roles.contains(ROLE_MANAGER) && !roles.contains("ADMIN")) {
                throw new AccessDeniedException("Seul le chef hierarchique peut valider cette etape");
            }
            return managerDecision(id, request, decidedBy);
        }

        if (event.getWorkflowStep() == EventWorkflowStep.VALIDATION_SECURITE) {
            if (!roles.contains(ROLE_SECURITY) && !roles.contains("ADMIN")) {
                throw new AccessDeniedException("Seul le responsable securite peut valider cette etape");
            }
            return securityDecision(id, request, decidedBy);
        }

        if (event.getWorkflowStep() == EventWorkflowStep.VALIDATION_DSN) {
            if (!roles.contains(ROLE_DSN) && !roles.contains("ADMIN")) {
                throw new AccessDeniedException("Seul le directeur DSN peut valider cette etape");
            }
            return dsnDecision(id, request, decidedBy);
        }

        if (event.getWorkflowStep() == EventWorkflowStep.VALIDATION_SALLE) {
            if (!roles.contains(ROLE_ROOM) && !roles.contains("ADMIN")) {
                throw new AccessDeniedException("Seul le responsable salle peut valider cette etape");
            }
            return roomDecision(id, request, decidedBy);
        }

        throw new BadRequestException("Aucune validation possible pour l etat courant de cet evenement");
    }

    @Transactional
    public PartnerInviteResponse invitePartner(UUID eventId, PartnerInviteRequest request) {
        EventEntity event = fetchEvent(Objects.requireNonNull(eventId));
        if (event.getStatus() == EventStatus.APPROVED) {
            throw new BadRequestException("Ajout partenaire interdit apres validation finale. Resoumettez une nouvelle version");
        }

        PartnerInvitationEntity invitation = new PartnerInvitationEntity();
        invitation.setEvent(event);
        invitation.setPartnerName(request.partnerName().trim());
        invitation.setPartnerEmail(request.partnerEmail().trim().toLowerCase());
        PartnerInvitationEntity saved = partnerInvitationRepository.save(invitation);

        event.setHasExternalPartners(true);
        eventRepository.save(event);

        sendPartnerEmail(event, saved);
        return EventMapper.toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<PartnerInviteResponse> listPartners(UUID eventId) {
        UUID safeEventId = Objects.requireNonNull(eventId);
        fetchEvent(safeEventId);
        return partnerInvitationRepository.findByEventId(safeEventId)
                .stream()
                .map(EventMapper::toResponse)
                .toList();
    }

    @Transactional
    public List<EventInvitationResponse> inviteEmployees(
            UUID eventId,
            EventInviteRequest request,
            String invitedByUsername,
            String invitedByDisplayName,
            boolean adminOverride
    ) {
        EventEntity event = fetchEvent(Objects.requireNonNull(eventId));
        assertCanInvite(event, invitedByUsername, adminOverride);
        expirePastInvitationsIfNeeded();

        List<EventInviteRecipientRequest> recipients = Objects.requireNonNull(request.recipients());
        if (recipients.isEmpty()) {
            throw new BadRequestException("Au moins un destinataire est obligatoire");
        }

        String invitationMessage = normalizeOrNull(request.message());
        Instant now = Instant.now();
        Instant expiresAt = resolveInvitationExpiry(event, now);
        List<EventInvitationEntity> toSave = recipients.stream()
                .map(recipient -> prepareInvitation(
                        event,
                        recipient,
                        invitedByUsername,
                        normalizeDisplayName(invitedByDisplayName, invitedByUsername),
                        invitationMessage,
                        expiresAt,
                        now
                ))
                .toList();

        List<EventInvitationEntity> saved = eventInvitationRepository.saveAll(toSave);
        for (EventInvitationEntity invitation : saved) {
            notifyInvitationCreated(event, invitation);
        }

        return saved.stream()
                .map(EventMapper::toResponse)
                .toList();
    }

    @Transactional
    public List<EventInvitationResponse> listInvitationsForEvent(UUID eventId, String currentUsername, boolean adminOverride) {
        EventEntity event = fetchEvent(Objects.requireNonNull(eventId));
        assertCanInvite(event, currentUsername, adminOverride);
        expirePastInvitationsIfNeeded();
        return eventInvitationRepository.findByEventIdOrderByCreatedAtDesc(eventId)
                .stream()
                .map(EventMapper::toResponse)
                .toList();
    }

    @Transactional
    public List<EventInvitationResponse> listAllInvitationsForAdmin() {
        expirePastInvitationsIfNeeded();
        return eventInvitationRepository.findAllByOrderByCreatedAtDesc()
                .stream()
                .map(EventMapper::toResponse)
                .toList();
    }

    @Transactional
    public List<EventInvitationResponse> listInvitationsForCurrentUser(String currentUsername) {
        String normalizedCurrent = normalize(currentUsername);
        if (normalizedCurrent.isEmpty()) {
            return List.of();
        }

        expirePastInvitationsIfNeeded();
        List<EventInvitationEntity> invitedAsUsername = eventInvitationRepository
                .findByInvitedUsernameIgnoreCaseOrderByCreatedAtDesc(normalizedCurrent);
        List<EventInvitationEntity> invitedAsEmail = eventInvitationRepository
                .findByInvitedEmailIgnoreCaseOrderByCreatedAtDesc(normalizedCurrent);
        List<EventInvitationEntity> sentByCurrent = eventInvitationRepository
                .findByInvitedByUsernameIgnoreCaseOrderByCreatedAtDesc(normalizedCurrent);

        Set<UUID> seenIds = new HashSet<>();
        List<EventInvitationEntity> merged = new java.util.ArrayList<>();
        for (EventInvitationEntity invitation : invitedAsUsername) {
            if (seenIds.add(invitation.getId())) {
                merged.add(invitation);
            }
        }
        for (EventInvitationEntity invitation : invitedAsEmail) {
            if (seenIds.add(invitation.getId())) {
                merged.add(invitation);
            }
        }
        for (EventInvitationEntity invitation : sentByCurrent) {
            if (seenIds.add(invitation.getId())) {
                merged.add(invitation);
            }
        }

        merged.sort((left, right) -> right.getCreatedAt().compareTo(left.getCreatedAt()));
        return merged.stream()
                .map(EventMapper::toResponse)
                .toList();
    }

    @Transactional
    public EventInvitationResponse acceptInvitation(UUID invitationId, String currentUsername) {
        EventInvitationEntity invitation = fetchInvitation(invitationId);
        assertInvitationOwnedByCurrentUser(invitation, currentUsername);
        updateInvitationStatus(invitation, EventInvitationStatus.ACCEPTED, null);
        notifyInvitationResponse(invitation, true);
        return EventMapper.toResponse(invitation);
    }

    @Transactional
    public EventInvitationResponse declineInvitation(
            UUID invitationId,
            EventInvitationRespondRequest request,
            String currentUsername
    ) {
        EventInvitationEntity invitation = fetchInvitation(invitationId);
        assertInvitationOwnedByCurrentUser(invitation, currentUsername);
        String reason = normalizeOrNull(request == null ? null : request.reason());
        updateInvitationStatus(invitation, EventInvitationStatus.DECLINED, reason);
        notifyInvitationResponse(invitation, false);
        return EventMapper.toResponse(invitation);
    }

    @Transactional
    public EventInvitationResponse cancelInvitation(UUID invitationId, String currentUsername, boolean adminOverride) {
        EventInvitationEntity invitation = fetchInvitation(invitationId);
        assertInvitationCanBeCancelled(invitation, currentUsername, adminOverride);

        if (invitation.getStatus() != EventInvitationStatus.PENDING) {
            throw new BadRequestException("Seule une invitation en attente peut etre annulee");
        }

        invitation.setStatus(EventInvitationStatus.CANCELLED);
        invitation.setResponseReason(null);
        invitation.setRespondedAt(Instant.now());
        eventInvitationRepository.save(invitation);
        sendNotificationSafely(
                invitation.getInvitedUsername(),
                "Invitation annulee",
                "L invitation a l evenement \"" + normalize(invitation.getEvent().getTitle()) + "\" a ete annulee."
        );
        return EventMapper.toResponse(invitation);
    }

    private EventEntity fetchEvent(UUID id) {
        return eventRepository.findById(Objects.requireNonNull(id))
                .orElseThrow(() -> new ResourceNotFoundException("Evenement introuvable: " + id));
    }

    private void applyCreatePayload(EventEntity event, EventCreateRequest request) {
        event.setTitle(normalizeRequired(request.title(), "Le titre est obligatoire"));
        event.setDescription(normalizeOrNull(request.description()));
        event.setStartAt(request.startAt());
        event.setEndAt(request.endAt());
        event.setLocation(normalizeOrNull(request.location()));
        event.setEventType(request.eventType() == null ? EventType.REUNION : request.eventType());

        EventMode resolvedMode = resolveMode(request.eventMode(), request.onlineEvent(), EventMode.PRESENTIEL);
        event.setEventMode(resolvedMode);
        event.setOnlineEvent(resolvedMode != EventMode.PRESENTIEL);

        applyOnlineMeetingFields(
                event,
                request.onlineMeetingProvider(),
                request.onlineMeetingLink(),
                request.onlineMeetingId(),
                request.onlineMeetingPassword()
        );
    }

    private void applyUpdatePayload(EventEntity event, EventUpdateRequest request) {
        if (request.title() != null) {
            event.setTitle(normalizeRequired(request.title(), "Le titre est obligatoire"));
        }
        if (request.description() != null) {
            event.setDescription(normalizeOrNull(request.description()));
        }
        if (request.startAt() != null) {
            event.setStartAt(request.startAt());
        }
        if (request.endAt() != null) {
            event.setEndAt(request.endAt());
        }
        if (request.location() != null) {
            event.setLocation(normalizeOrNull(request.location()));
        }
        if (request.eventType() != null) {
            event.setEventType(request.eventType());
        }

        EventMode resolvedMode = resolveMode(request.eventMode(), request.onlineEvent(), event.getEventMode());
        event.setEventMode(resolvedMode);
        event.setOnlineEvent(resolvedMode != EventMode.PRESENTIEL);

        applyOnlineMeetingFields(
                event,
                request.onlineMeetingProvider(),
                request.onlineMeetingLink(),
                request.onlineMeetingId(),
                request.onlineMeetingPassword()
        );
    }

    private void applyOnlineMeetingFields(
            EventEntity event,
            String provider,
            String meetingLink,
            String meetingId,
            String meetingPassword
    ) {
        String normalizedMeetingId = normalize(meetingId);
        String normalizedPassword = normalize(meetingPassword);

        String normalizedProvider = normalize(provider);
        if (normalizedProvider.isEmpty() && event.getEventMode() != EventMode.PRESENTIEL) {
            normalizedProvider = "Jitsi";
        }

        String normalizedLink = normalize(meetingLink);

        if (event.getEventMode() == EventMode.PRESENTIEL) {
            event.setOnlineMeetingProvider(null);
            event.setOnlineMeetingLink(null);
            event.setOnlineMeetingId(null);
            event.setOnlineMeetingPassword(null);
            return;
        }

        if (!normalizedLink.isEmpty() && !isSafeHttpsUrl(normalizedLink)) {
            throw new BadRequestException("Le lien de reunion en ligne doit etre une URL HTTPS valide.");
        }

        event.setOnlineMeetingProvider(normalizeOrNull(normalizedProvider));
        event.setOnlineMeetingLink(normalizeOrNull(normalizedLink));
        event.setOnlineMeetingId(normalizeOrNull(normalizedMeetingId));
        event.setOnlineMeetingPassword(normalizeOrNull(normalizedPassword));
    }

    private void refreshMeetingRoom(EventEntity event) {
        if (event.getEventMode() == EventMode.PRESENTIEL) {
            event.setMeetingRoomId(null);
            return;
        }
        if (!normalize(event.getMeetingRoomId()).isEmpty()) {
            return;
        }
        String suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase();
        event.setMeetingRoomId("EVT-" + suffix);
    }

    private void validateEventChronology(Instant startAt, Instant endAt) {
        if (startAt == null || endAt == null) {
            throw new BadRequestException("Les dates de debut et de fin sont obligatoires");
        }
        if (!endAt.isAfter(startAt)) {
            throw new BadRequestException("La date de fin doit etre apres la date de debut");
        }
    }

    private void validateModeCoherence(EventEntity event) {
        EventMode mode = event.getEventMode();
        String location = normalize(event.getLocation());

        if (mode == EventMode.PRESENTIEL) {
            if (location.isEmpty()) {
                throw new BadRequestException("Une salle est obligatoire pour un evenement presentiel");
            }
            return;
        }

        if (mode == EventMode.HYBRIDE && location.isEmpty()) {
            throw new BadRequestException("Une salle est obligatoire pour un evenement hybride");
        }
    }

    private void validateReservationCoherence(EventEntity event, InternalEventReservationSummaryResponse summary) {
        if (event.getEventMode() == EventMode.EN_LIGNE && summary.totalReservations() > 0) {
            throw new BadRequestException("Un evenement en ligne ne peut pas contenir de reservation physique");
        }

        if ((event.getEventMode() == EventMode.PRESENTIEL || event.getEventMode() == EventMode.HYBRIDE)
                && !summary.hasRoomReservation()) {
            throw new BadRequestException("Une reservation de salle est obligatoire pour cet evenement");
        }
    }

    private boolean requiresRoomPreparation(EventEntity event, InternalEventReservationSummaryResponse summary) {
        return (event.getEventMode() == EventMode.PRESENTIEL || event.getEventMode() == EventMode.HYBRIDE)
                && summary.hasRoomReservation();
    }

    private InternalEventReservationSummaryResponse fetchReservationSummary(UUID eventId) {
        try {
            return reservationWorkflowClient.getEventSummary(
                    eventId,
                    reservationWorkflowClientProperties.getInternalApiKey()
            );
        } catch (FeignException ex) {
            throw new BadRequestException("Impossible de verifier les reservations liees a l evenement");
        }
    }

    private InternalEventReservationSummaryResponse applyReservationSecurityDecision(
            UUID eventId,
            boolean approved,
            String decidedBy,
            String decisionComment
    ) {
        try {
            return reservationWorkflowClient.applySecurityDecision(
                    eventId,
                    reservationWorkflowClientProperties.getInternalApiKey(),
                    new InternalEventSecurityValidationRequest(approved, decisionComment, decidedBy)
            );
        } catch (FeignException ex) {
            throw new BadRequestException("Impossible d appliquer la validation securite des reservations");
        }
    }

    private void ensureEventEditable(EventEntity event, String username, boolean adminOverride) {
        if (event.getWorkflowStep() != EventWorkflowStep.BROUILLON
                && event.getWorkflowStep() != EventWorkflowStep.REFUSE) {
            throw new BadRequestException("Modification interdite pour cet etat du workflow");
        }

        if (!adminOverride && !event.getRequestedBy().equalsIgnoreCase(username)) {
            throw new AccessDeniedException("Seul le createur peut modifier cet evenement");
        }
    }

    private void ensureEventOwnedByRequester(EventEntity event, String username) {
        if (!event.getRequestedBy().equalsIgnoreCase(username)) {
            throw new AccessDeniedException("Seul le createur peut soumettre cet evenement");
        }
    }

    private void ensureWorkflowStep(EventEntity event, EventWorkflowStep expectedStep) {
        if (event.getWorkflowStep() != expectedStep) {
            throw new BadRequestException("Transition invalide: etape attendue " + expectedStep);
        }
    }

    private String resolveRejectionReason(EventDecisionRequest request, String decisionComment, boolean approved) {
        String rejectionReason = normalize(request.rejectionReason());
        if (!approved && rejectionReason.isEmpty()) {
            rejectionReason = decisionComment;
        }
        if (!approved && rejectionReason.isEmpty()) {
            throw new BadRequestException("Le motif de refus est obligatoire");
        }
        return rejectionReason;
    }

    private void markApproved(EventEntity event, String decidedBy, String decisionComment) {
        event.setStatus(EventStatus.APPROVED);
        event.setWorkflowStep(EventWorkflowStep.TERMINE);
        event.setDecisionComment(normalizeOrNull(decisionComment));
        event.setDecidedBy(normalizeOrNull(decidedBy));
        event.setRejectionReason(null);
    }

    private void markRejected(EventEntity event, String rejectionReason, String decidedBy, String decisionComment) {
        event.setStatus(EventStatus.REJECTED);
        event.setWorkflowStep(EventWorkflowStep.REFUSE);
        event.setDecisionComment(normalizeOrNull(decisionComment));
        event.setDecidedBy(normalizeOrNull(decidedBy));
        event.setRejectionReason(normalizeOrNull(rejectionReason));
    }

    private void resetWorkflowDecisions(EventEntity event) {
        event.setDecisionComment(null);
        event.setDecidedBy(null);
        event.setRejectionReason(null);
        event.setManagerDecisionComment(null);
        event.setManagerDecisionBy(null);
        event.setManagerDecisionAt(null);
        event.setSecurityDecisionComment(null);
        event.setSecurityDecisionBy(null);
        event.setSecurityDecisionAt(null);
        event.setDsnDecisionComment(null);
        event.setDsnDecisionBy(null);
        event.setDsnDecisionAt(null);
    }

    private EventMode resolveMode(EventMode explicitMode, Boolean onlineEventFlag, EventMode fallbackMode) {
        if (explicitMode != null) {
            return explicitMode;
        }
        if (onlineEventFlag != null) {
            return onlineEventFlag ? EventMode.EN_LIGNE : EventMode.PRESENTIEL;
        }
        return fallbackMode;
    }

    private Set<String> extractRoles(Authentication authentication) {
        if (authentication == null) {
            return Set.of();
        }
        return authentication.getAuthorities()
                .stream()
                .map(authority -> authority.getAuthority())
                .filter(value -> value != null && value.startsWith("ROLE_"))
                .map(value -> value.substring("ROLE_".length()))
                .collect(Collectors.toSet());
    }

    private void sendPartnerEmail(EventEntity event, PartnerInvitationEntity invitation) {
        String partnerName = normalize(invitation.getPartnerName());
        String partnerEmail = normalize(invitation.getPartnerEmail());
        String eventTitle = normalize(event.getTitle());
        String safeEventTitle = eventTitle.isEmpty() ? "Evenement CNSTN" : eventTitle;
        String location = normalize(event.getLocation());
        String safeLocation = location.isEmpty() ? "A definir" : location;

        String subject = "Invitation - " + safeEventTitle;
        String body = "Bonjour " + (partnerName.isEmpty() ? "Partenaire" : partnerName) + ",\n\n"
                + "Vous etes invite a l evenement: " + safeEventTitle + "\n"
                + "Debut: " + event.getStartAt() + "\n"
                + "Fin: " + event.getEndAt() + "\n"
                + "Lieu: " + safeLocation + "\n";

        if (event.getEventMode() != EventMode.PRESENTIEL) {
            String provider = normalize(event.getOnlineMeetingProvider());
            String meetingLink = normalize(event.getOnlineMeetingLink());
            String meetingId = normalize(event.getOnlineMeetingId());
            if (!provider.isEmpty()) {
                body += "Provider: " + provider + "\n";
            }
            if (!meetingLink.isEmpty()) {
                body += "Lien: " + meetingLink + "\n";
            }
            if (!meetingId.isEmpty()) {
                body += "ID reunion: " + meetingId + "\n";
            }
        }

        body += "\nCordialement,\nEquipe CNSTN";

        try {
            notificationClient.sendInternalEmail(partnerEmail, subject, body, false);
        } catch (Exception ex) {
            log.warn("Envoi email partenaire impossible pour {} / {}", event.getId(), partnerEmail, ex);
        }
    }

    private void notifySubmission(EventEntity event) {
        String requester = normalize(event.getRequestedBy());
        if (requester.isEmpty()) {
            return;
        }
        sendNotificationSafely(
                requester,
                "Evenement soumis",
                "Votre evenement \"" + normalize(event.getTitle()) + "\" est soumis au workflow de validation.",
                "/events?eventId=" + event.getId()
        );
    }

    private void notifyDecision(EventEntity event, boolean approved, String decidedBy, String detail) {
        String requester = normalize(event.getRequestedBy());
        String decider = normalize(decidedBy);
        String title = approved ? "Validation evenement" : "Refus evenement";
        String message = approved
                ? "L evenement \"" + normalize(event.getTitle()) + "\" a progresse dans le workflow."
                : "L evenement \"" + normalize(event.getTitle()) + "\" a ete refuse.";

        if (!decider.isEmpty()) {
            message += " Decision prise par " + decider + ".";
        }
        String normalizedDetail = normalize(detail);
        if (!normalizedDetail.isEmpty()) {
            message += " Detail: " + normalizedDetail;
        }

        sendNotificationSafely(requester, title, message, "/events?eventId=" + event.getId());
    }

    private void sendNotificationSafely(String recipientUsername, String title, String message) {
        sendNotificationSafely(recipientUsername, title, message, null);
    }

    private void sendNotificationSafely(String recipientUsername, String title, String message, String actionUrl) {
        String recipient = normalize(recipientUsername);
        if (recipient.isEmpty()) {
            return;
        }

        try {
            notificationClient.sendInternalNotification(recipient, title, message, actionUrl);
        } catch (Exception ex) {
            log.warn("Notification non envoyee pour {}", recipient, ex);
        }
    }

    private void assertCanInvite(EventEntity event, String invitedByUsername, boolean adminOverride) {
        if (adminOverride) {
            return;
        }
        String requester = normalize(event.getRequestedBy());
        String actor = normalize(invitedByUsername);
        if (actor.isEmpty()) {
            throw new AccessDeniedException("Utilisateur inviteur invalide");
        }
        if (actor.equalsIgnoreCase(requester)) {
            return;
        }
        throw new AccessDeniedException("Seul l organisateur peut inviter des employes pour cet evenement");
    }

    private EventInvitationEntity prepareInvitation(
            EventEntity event,
            EventInviteRecipientRequest recipient,
            String invitedByUsername,
            String invitedByDisplayName,
            String invitationMessage,
            Instant expiresAt,
            Instant now
    ) {
        String invitedUsername = normalizeRequired(recipient.username(), "Le nom utilisateur du destinataire est obligatoire");
        String invitedEmail = normalizeRequired(recipient.email(), "L email du destinataire est obligatoire").toLowerCase();
        String invitedDisplayName = normalizeDisplayName(recipient.displayName(), invitedUsername);

        EventInvitationEntity invitation = eventInvitationRepository
                .findByEventIdAndInvitedUsernameIgnoreCase(event.getId(), invitedUsername)
                .or(() -> eventInvitationRepository.findByEventIdAndInvitedEmailIgnoreCase(event.getId(), invitedEmail))
                .orElseGet(EventInvitationEntity::new);

        invitation.setEvent(event);
        invitation.setInvitedUsername(invitedUsername);
        invitation.setInvitedEmail(invitedEmail);
        invitation.setInvitedDisplayName(invitedDisplayName);
        invitation.setInvitedByUsername(normalizeRequired(invitedByUsername, "L inviteur est obligatoire"));
        invitation.setInvitedByDisplayName(invitedByDisplayName);
        invitation.setMessage(invitationMessage);
        invitation.setStatus(EventInvitationStatus.PENDING);
        invitation.setResponseReason(null);
        invitation.setRespondedAt(null);
        invitation.setExpiresAt(expiresAt);
        if (event.getStartAt() != null && event.getStartAt().isBefore(now)) {
            invitation.setStatus(EventInvitationStatus.EXPIRED);
        }
        return invitation;
    }

    private Instant resolveInvitationExpiry(EventEntity event, Instant now) {
        Instant startAt = event.getStartAt();
        if (startAt != null && startAt.isAfter(now)) {
            return startAt;
        }
        return now.plusSeconds(30L * 60L);
    }

    private void expirePastInvitationsIfNeeded() {
        Instant now = Instant.now();
        List<EventInvitationEntity> expired = eventInvitationRepository
                .findByStatusAndExpiresAtBefore(EventInvitationStatus.PENDING, now);
        if (expired.isEmpty()) {
            return;
        }
        for (EventInvitationEntity invitation : expired) {
            invitation.setStatus(EventInvitationStatus.EXPIRED);
        }
        eventInvitationRepository.saveAll(expired);
    }

    private EventInvitationEntity fetchInvitation(UUID invitationId) {
        return eventInvitationRepository.findById(Objects.requireNonNull(invitationId))
                .orElseThrow(() -> new ResourceNotFoundException("Invitation introuvable: " + invitationId));
    }

    private void assertInvitationOwnedByCurrentUser(EventInvitationEntity invitation, String currentUsername) {
        String actor = normalize(currentUsername).toLowerCase();
        String invitedUsername = normalize(invitation.getInvitedUsername()).toLowerCase();
        String invitedEmail = normalize(invitation.getInvitedEmail()).toLowerCase();
        if (actor.isEmpty() || (!actor.equals(invitedUsername) && !actor.equals(invitedEmail))) {
            throw new AccessDeniedException("Vous ne pouvez pas repondre a cette invitation");
        }
    }

    private void assertInvitationCanBeCancelled(EventInvitationEntity invitation, String currentUsername, boolean adminOverride) {
        if (adminOverride) {
            return;
        }

        String actor = normalize(currentUsername).toLowerCase();
        String sender = normalize(invitation.getInvitedByUsername()).toLowerCase();
        if (actor.isEmpty() || !actor.equals(sender)) {
            throw new AccessDeniedException("Seul l inviteur ou l administrateur peut annuler cette invitation");
        }
    }

    private void updateInvitationStatus(
            EventInvitationEntity invitation,
            EventInvitationStatus targetStatus,
            String reason
    ) {
        if (invitation.getStatus() != EventInvitationStatus.PENDING) {
            throw new BadRequestException("Cette invitation ne peut plus etre modifiee");
        }

        Instant now = Instant.now();
        if (invitation.getExpiresAt() != null && invitation.getExpiresAt().isBefore(now)) {
            invitation.setStatus(EventInvitationStatus.EXPIRED);
            eventInvitationRepository.save(invitation);
            throw new BadRequestException("Cette invitation est expiree");
        }

        invitation.setStatus(targetStatus);
        invitation.setResponseReason(reason);
        invitation.setRespondedAt(now);
        eventInvitationRepository.save(invitation);
    }

    private void notifyInvitationCreated(EventEntity event, EventInvitationEntity invitation) {
        String eventTitle = normalize(event.getTitle());
        String safeTitle = eventTitle.isEmpty() ? "Evenement CNSTN" : eventTitle;
        String subject = "[CNSTN] Invitation a un evenement";
        String invitationLink = buildInvitationLink(event.getId(), invitation.getId());
        String message = "Bonjour " + normalizeDisplayName(invitation.getInvitedDisplayName(), invitation.getInvitedUsername()) + ",\n\n"
                + "Vous etes invite(e) a l evenement : " + safeTitle + "\n"
                + "Date debut : " + event.getStartAt() + "\n"
                + "Date fin : " + event.getEndAt() + "\n"
                + "Mode : " + safeEventMode(event.getEventMode()) + "\n"
                + "Lieu / lien : " + resolveEventAccessLabel(event) + "\n"
                + "Voir mon invitation : " + invitationLink + "\n\n"
                + "Message automatique CNSTN";

        sendNotificationSafely(
                invitation.getInvitedUsername(),
                "Invitation evenement",
                "Vous avez recu une invitation pour \"" + safeTitle + "\". Consultez /invitations.",
                "/invitations?eventId=" + event.getId() + "&invitationId=" + invitation.getId()
        );

        try {
            notificationClient.sendInternalEmail(invitation.getInvitedEmail(), subject, message, false);
        } catch (Exception ex) {
            log.warn("Envoi email invitation impossible pour {}", invitation.getInvitedEmail(), ex);
        }
    }

    private void notifyInvitationResponse(EventInvitationEntity invitation, boolean accepted) {
        String statusText = accepted ? "acceptee" : "refusee";
        String title = accepted ? "Invitation acceptee" : "Invitation refusee";
        String eventTitle = normalize(invitation.getEvent().getTitle());
        String body = "L invitation de "
                + normalizeDisplayName(invitation.getInvitedDisplayName(), invitation.getInvitedUsername())
                + " pour l evenement \"" + eventTitle + "\" a ete "
                + statusText
                + ".";
        if (normalize(invitation.getResponseReason()).length() > 0) {
            body += " Motif: " + normalize(invitation.getResponseReason()) + ".";
        }
        sendNotificationSafely(invitation.getInvitedByUsername(), title, body);
    }

    private String buildInvitationLink(UUID eventId, UUID invitationId) {
        String baseUrl = normalize(eventInvitationProperties.getFrontendInvitationsUrl());
        if (baseUrl.isEmpty()) {
            baseUrl = "http://localhost:4200/invitations";
        }
        String separator = baseUrl.contains("?") ? "&" : "?";
        return baseUrl + separator + "eventId=" + eventId + "&invitationId=" + invitationId;
    }

    private String normalizeDisplayName(String value, String fallback) {
        String normalized = normalize(value);
        if (!normalized.isEmpty()) {
            return normalized;
        }
        String safeFallback = normalize(fallback);
        return safeFallback.isEmpty() ? "Employe CNSTN" : safeFallback;
    }

    private String safeEventMode(EventMode mode) {
        if (mode == null) {
            return "Presentiel";
        }
        if (mode == EventMode.EN_LIGNE) {
            return "En ligne";
        }
        if (mode == EventMode.HYBRIDE) {
            return "Hybride";
        }
        return "Presentiel";
    }

    private String resolveEventAccessLabel(EventEntity event) {
        if (event.getEventMode() == EventMode.PRESENTIEL) {
            return normalize(event.getLocation()).isEmpty() ? "Salle a definir" : normalize(event.getLocation());
        }
        String onlineLink = normalize(event.getOnlineMeetingLink());
        if (!onlineLink.isEmpty()) {
            return onlineLink;
        }
        return "Lien en ligne non disponible";
    }

    private String normalizeRequired(String value, String errorMessage) {
        String normalized = normalize(value);
        if (normalized.isEmpty()) {
            throw new BadRequestException(errorMessage);
        }
        return normalized;
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim();
    }

    private String normalizeOrNull(String value) {
        String normalized = normalize(value);
        return normalized.isEmpty() ? null : normalized;
    }

    private boolean isSafeHttpsUrl(String value) {
        String normalized = normalize(value);
        if (normalized.isEmpty() || !normalized.toLowerCase().startsWith("https://")) {
            return false;
        }
        try {
            java.net.URI uri = java.net.URI.create(normalized);
            return "https".equalsIgnoreCase(uri.getScheme()) && uri.getHost() != null;
        } catch (Exception ex) {
            return false;
        }
    }

    private Specification<EventEntity> buildListSpecification(
            String search,
            EventStatus status,
            EventType eventType,
            EventMode eventMode,
            EventWorkflowStep workflowStep,
            String requestedBy
    ) {
        Specification<EventEntity> spec = (root, query, cb) -> cb.conjunction();
        String normalizedSearch = normalizeOrNull(search);
        String normalizedRequester = normalizeOrNull(requestedBy);

        if (normalizedSearch != null) {
            spec = spec.and((root, query, cb) -> {
                String pattern = "%" + normalizedSearch.toLowerCase() + "%";
                return cb.or(
                        cb.like(cb.lower(root.get("title")), pattern),
                        cb.like(cb.lower(root.get("description")), pattern),
                        cb.like(cb.lower(root.get("location")), pattern),
                        cb.like(cb.lower(root.get("requestedBy")), pattern),
                        cb.like(cb.lower(root.get("referenceCode")), pattern)
                );
            });
        }

        if (status != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("status"), status));
        }

        if (eventType != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("eventType"), eventType));
        }

        if (eventMode != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("eventMode"), eventMode));
        }

        if (workflowStep != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("workflowStep"), workflowStep));
        }

        if (normalizedRequester != null) {
            spec = spec.and((root, query, cb) -> cb.like(cb.lower(root.get("requestedBy")), "%" + normalizedRequester.toLowerCase() + "%"));
        }

        return spec;
    }
}
