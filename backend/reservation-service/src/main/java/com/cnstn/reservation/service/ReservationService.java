package com.cnstn.reservation.service;

import com.cnstn.reservation.client.event.EventReservationContextResponse;
import com.cnstn.reservation.client.event.EventWorkflowClient;
import com.cnstn.reservation.client.event.EventWorkflowClientProperties;
import com.cnstn.reservation.client.notification.NotificationClient;
import com.cnstn.reservation.dto.ConflictCheckResponse;
import com.cnstn.reservation.dto.EventReservationSummaryResponse;
import com.cnstn.reservation.dto.PageResponse;
import com.cnstn.reservation.dto.ReservationDocumentContent;
import com.cnstn.reservation.dto.ReservationDocumentResponse;
import com.cnstn.reservation.dto.ReservationCreateRequest;
import com.cnstn.reservation.dto.ReservationResponse;
import com.cnstn.reservation.entity.EquipmentEntity;
import com.cnstn.reservation.entity.EquipmentOperationalStatus;
import com.cnstn.reservation.entity.EventMode;
import com.cnstn.reservation.entity.ReservationEntity;
import com.cnstn.reservation.entity.ReservationStatus;
import com.cnstn.reservation.entity.RoomEntity;
import com.cnstn.reservation.entity.RoomOperationalStatus;
import com.cnstn.reservation.exception.BadRequestException;
import com.cnstn.reservation.exception.ResourceNotFoundException;
import com.cnstn.reservation.mapper.ReservationMapper;
import com.cnstn.reservation.repository.ReservationRepository;
import feign.FeignException;
import feign.RetryableException;
import java.time.Instant;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import jakarta.persistence.criteria.JoinType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClientException;

@Service
public class ReservationService {

    private static final List<ReservationStatus> BLOCKING_STATUSES = List.of(ReservationStatus.PENDING, ReservationStatus.APPROVED);
    private static final Logger log = LoggerFactory.getLogger(ReservationService.class);

    private final ReservationRepository reservationRepository;
    private final RoomService roomService;
    private final EquipmentService equipmentService;
    private final NotificationClient notificationClient;
    private final EventWorkflowClient eventWorkflowClient;
    private final EventWorkflowClientProperties eventWorkflowClientProperties;
    private final ReservationReferenceGeneratorService reservationReferenceGeneratorService;
    private final ReservationOfficialDocumentService reservationOfficialDocumentService;

    public ReservationService(
            ReservationRepository reservationRepository,
            RoomService roomService,
            EquipmentService equipmentService,
            NotificationClient notificationClient,
            EventWorkflowClient eventWorkflowClient,
            EventWorkflowClientProperties eventWorkflowClientProperties,
            ReservationReferenceGeneratorService reservationReferenceGeneratorService,
            ReservationOfficialDocumentService reservationOfficialDocumentService
    ) {
        this.reservationRepository = reservationRepository;
        this.roomService = roomService;
        this.equipmentService = equipmentService;
        this.notificationClient = notificationClient;
        this.eventWorkflowClient = eventWorkflowClient;
        this.eventWorkflowClientProperties = eventWorkflowClientProperties;
        this.reservationReferenceGeneratorService = reservationReferenceGeneratorService;
        this.reservationOfficialDocumentService = reservationOfficialDocumentService;
    }

    @Transactional(readOnly = true)
    public PageResponse<ReservationResponse> list(
            Pageable pageable,
            UUID eventId,
            ReservationStatus status,
            String requesterUsername,
            UUID roomId,
            UUID equipmentId,
            EventMode eventMode,
            String search
    ) {
        Specification<ReservationEntity> specification = buildListSpecification(
                eventId,
                status,
                requesterUsername,
                roomId,
                equipmentId,
                eventMode,
                search
        );
        Page<ReservationEntity> page = reservationRepository.findAll(specification, Objects.requireNonNull(pageable));
        return new PageResponse<>(
                page.map(ReservationMapper::toResponse).getContent(),
                page.getNumber(),
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages()
        );
    }

    @Transactional(readOnly = true)
    public List<ReservationResponse> listByEventId(UUID eventId) {
        return reservationRepository.findByEventId(Objects.requireNonNull(eventId))
                .stream()
                .map(ReservationMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public ReservationResponse getById(UUID id) {
        return ReservationMapper.toResponse(fetchReservation(Objects.requireNonNull(id)));
    }

    @Transactional
    public ReservationResponse create(ReservationCreateRequest request, String username) {
        if (!request.endAt().isAfter(request.startAt())) {
            throw new BadRequestException("La date de fin de reservation doit etre apres la date de debut");
        }

        boolean roomRequested = request.roomId() != null;
        boolean equipmentRequested = request.equipmentId() != null;
        if (roomRequested == equipmentRequested) {
            throw new BadRequestException("Une seule reservation est autorisee par demande: salle ou equipement");
        }

        UUID eventId = request.eventId();
        EventMode eventMode = EventMode.PRESENTIEL;
        if (eventId != null) {
            EventReservationContextResponse context = fetchEventReservationContext(eventId);
            eventMode = Objects.requireNonNull(context.eventMode());
            if (!context.reservationAllowed()) {
                throw new BadRequestException("Les reservations sont bloquees pour cet evenement");
            }
            if (eventMode == EventMode.EN_LIGNE) {
                throw new BadRequestException("Une reservation physique est interdite pour un evenement en ligne");
            }
        }

        int requestedQuantity = resolveRequestedQuantity(request.quantityRequested(), equipmentRequested);

        ReservationEntity entity = new ReservationEntity();
        entity.setEventId(eventId);
        entity.setEventMode(eventMode);
        entity.setReferenceCode(reservationReferenceGeneratorService.nextReservationReference());
        entity.setBusinessVersion(1);
        entity.setQuantityRequested(requestedQuantity);
        entity.setRequesterUsername(username);
        entity.setStartAt(request.startAt());
        entity.setEndAt(request.endAt());
        entity.setPurpose(normalizeOrNull(request.purpose()));
        entity.setStatus(ReservationStatus.PENDING);

        if (roomRequested) {
            RoomEntity room = roomService.fetchRoom(request.roomId());
            if (!isRoomReservable(room)) {
                throw new BadRequestException("La salle selectionnee est inactive ou indisponible");
            }
            boolean roomConflict = hasRoomConflict(request.roomId(), request.startAt(), request.endAt());
            if (roomConflict) {
                throw new BadRequestException("Cette salle est deja reservee sur ce creneau.");
            }
            entity.setRoom(room);
        } else {
            EquipmentEntity equipment = equipmentService.fetchEquipment(request.equipmentId());
            if (!isEquipmentReservable(equipment)) {
                throw new BadRequestException("L equipement selectionne est inactif ou indisponible");
            }
            int remaining = computeRemainingEquipmentQuantity(
                    equipment,
                    request.startAt(),
                    request.endAt()
            );
            if (remaining < requestedQuantity) {
                throw new BadRequestException("Quantite insuffisante pour cet equipement sur ce creneau.");
            }
            entity.setEquipment(equipment);
        }

        ReservationEntity saved = reservationRepository.save(entity);
        reservationOfficialDocumentService.generateRequestDocument(saved, username);
        notifyReservationCreated(saved);
        return ReservationMapper.toResponse(saved);
    }

    @Transactional(readOnly = true)
    public ConflictCheckResponse checkConflict(
            UUID roomId,
            UUID equipmentId,
            Instant startAt,
            Instant endAt,
            Integer quantityRequested
    ) {
        if (roomId != null) {
            return new ConflictCheckResponse(hasRoomConflict(roomId, startAt, endAt));
        }
        if (equipmentId != null) {
            EquipmentEntity equipment = equipmentService.fetchEquipment(equipmentId);
            int requested = resolveRequestedQuantity(quantityRequested, true);
            int remaining = computeRemainingEquipmentQuantity(equipment, startAt, endAt);
            return new ConflictCheckResponse(remaining < requested);
        }
        throw new BadRequestException("roomId ou equipmentId est obligatoire");
    }

    @Transactional
    public ReservationResponse securityValidation(UUID id, boolean approved, String securityUsername, String decisionComment) {
        return securityValidation(id, approved, securityUsername, decisionComment, "RESPONSABLE_SECURITE");
    }

    @Transactional
    public ReservationResponse securityValidation(
            UUID id,
            boolean approved,
            String securityUsername,
            String decisionComment,
            String decisionRole
    ) {
        ReservationEntity entity = fetchReservation(Objects.requireNonNull(id));
        applySecurityDecision(entity, approved, securityUsername, decisionComment);
        ReservationEntity saved = reservationRepository.save(entity);
        reservationOfficialDocumentService.generateSecurityDecisionDocument(
                saved,
                approved,
                securityUsername,
                decisionRole,
                decisionComment,
                saved.getSecurityCheckedAt()
        );
        notifySecurityDecision(saved, approved, securityUsername, decisionComment);
        return ReservationMapper.toResponse(saved);
    }

    @Transactional
    public EventReservationSummaryResponse securityValidationByEvent(
            UUID eventId,
            boolean approved,
            String securityUsername,
            String decisionComment
    ) {
        UUID safeEventId = Objects.requireNonNull(eventId);
        List<ReservationEntity> allReservations = reservationRepository.findByEventId(safeEventId);
        if (allReservations.isEmpty()) {
            throw new BadRequestException("Aucune reservation liee a cet evenement");
        }

        List<ReservationEntity> pendingReservations = allReservations.stream()
                .filter(reservation -> reservation.getStatus() == ReservationStatus.PENDING)
                .toList();

        if (pendingReservations.isEmpty()) {
            return buildEventSummary(safeEventId, allReservations);
        }

        pendingReservations.forEach(reservation ->
                applySecurityDecision(reservation, approved, securityUsername, decisionComment));
        reservationRepository.saveAll(pendingReservations);
        pendingReservations.forEach(reservation ->
                reservationOfficialDocumentService.generateSecurityDecisionDocument(
                        reservation,
                        approved,
                        securityUsername,
                        decisionComment,
                        reservation.getSecurityCheckedAt()
                ));
        pendingReservations.forEach(reservation ->
                notifySecurityDecision(reservation, approved, securityUsername, decisionComment));

        List<ReservationEntity> refreshed = reservationRepository.findByEventId(safeEventId);
        return buildEventSummary(safeEventId, refreshed);
    }

    @Transactional(readOnly = true)
    public EventReservationSummaryResponse getEventReservationSummary(UUID eventId) {
        UUID safeEventId = Objects.requireNonNull(eventId);
        List<ReservationEntity> reservations = reservationRepository.findByEventId(safeEventId);
        return buildEventSummary(safeEventId, reservations);
    }

    @Transactional(readOnly = true)
    public List<ReservationDocumentResponse> listDocuments(UUID reservationId) {
        UUID safeReservationId = Objects.requireNonNull(reservationId);
        fetchReservation(safeReservationId);
        return reservationOfficialDocumentService.listByReservation(safeReservationId);
    }

    @Transactional(readOnly = true)
    public ReservationDocumentContent downloadDocument(UUID reservationId, UUID documentId) {
        UUID safeReservationId = Objects.requireNonNull(reservationId);
        fetchReservation(safeReservationId);
        return reservationOfficialDocumentService.download(safeReservationId, Objects.requireNonNull(documentId));
    }

    @Transactional(readOnly = true)
    public ReservationDocumentContent downloadLatestDocument(UUID reservationId) {
        UUID safeReservationId = Objects.requireNonNull(reservationId);
        fetchReservation(safeReservationId);
        return reservationOfficialDocumentService.downloadLatest(safeReservationId);
    }

    private void applySecurityDecision(
            ReservationEntity reservation,
            boolean approved,
            String securityUsername,
            String decisionComment
    ) {
        if (reservation.getStatus() != ReservationStatus.PENDING) {
            throw new BadRequestException("La reservation n est plus en attente de validation securite");
        }

        String normalizedComment = normalize(decisionComment);
        if (!approved && normalizedComment.isEmpty()) {
            throw new BadRequestException("Le motif de refus est obligatoire pour la securite");
        }

        reservation.setSecurityCheckedBy(normalizeOrNull(securityUsername));
        reservation.setSecurityCheckedAt(Instant.now());
        reservation.setSecurityDecisionComment(normalizeOrNull(normalizedComment));
        reservation.setStatus(approved ? ReservationStatus.APPROVED : ReservationStatus.REJECTED);
        reservation.setSecurityConflict(!approved);
        reservation.setRejectionReason(approved ? null : normalizedComment);
    }

    private boolean hasRoomConflict(UUID roomId, Instant startAt, Instant endAt) {
        return reservationRepository.existsByRoom_IdAndStatusInAndStartAtLessThanAndEndAtGreaterThan(
                roomId,
                BLOCKING_STATUSES,
                endAt,
                startAt
        );
    }

    private int computeRemainingEquipmentQuantity(EquipmentEntity equipment, Instant startAt, Instant endAt) {
        int stockLimit = Math.min(equipment.getTotalQuantity(), equipment.getAvailableQuantity());
        int reserved = reservationRepository.sumEquipmentQuantityReservedOverWindow(
                equipment.getId(),
                BLOCKING_STATUSES,
                endAt,
                startAt
        );
        return Math.max(0, stockLimit - reserved);
    }

    private int resolveRequestedQuantity(Integer requested, boolean equipmentRequested) {
        if (!equipmentRequested) {
            return 1;
        }
        if (requested == null) {
            return 1;
        }
        if (requested < 1) {
            throw new BadRequestException("La quantite demandee doit etre superieure a zero");
        }
        return requested;
    }

    private boolean isRoomReservable(RoomEntity room) {
        if (!room.isActive()) {
            return false;
        }
        return room.getStatus() == RoomOperationalStatus.DISPONIBLE;
    }

    private boolean isEquipmentReservable(EquipmentEntity equipment) {
        if (!equipment.isActive()) {
            return false;
        }
        return equipment.getStatus() == EquipmentOperationalStatus.DISPONIBLE;
    }

    private ReservationEntity fetchReservation(UUID id) {
        UUID safeId = Objects.requireNonNull(id);
        return reservationRepository.findById(safeId)
                .orElseThrow(() -> new ResourceNotFoundException("Reservation introuvable: " + id));
    }

    private EventReservationContextResponse fetchEventReservationContext(UUID eventId) {
        try {
            return eventWorkflowClient.getReservationContext(
                    eventId,
                    eventWorkflowClientProperties.getInternalApiKey()
            );
        } catch (RetryableException ex) {
            throw new BadRequestException("Impossible de verifier le contexte evenement pour la reservation");
        } catch (FeignException ex) {
            throw new BadRequestException("Impossible de verifier le contexte evenement pour la reservation");
        } catch (RestClientException ex) {
            throw new BadRequestException("Impossible de verifier le contexte evenement pour la reservation");
        }
    }

    private EventReservationSummaryResponse buildEventSummary(UUID eventId, List<ReservationEntity> reservations) {
        int roomReservations = (int) reservations.stream().filter(reservation -> reservation.getRoom() != null).count();
        int equipmentReservations = (int) reservations.stream().filter(reservation -> reservation.getEquipment() != null).count();
        int pendingSecurity = (int) reservations.stream().filter(reservation -> reservation.getStatus() == ReservationStatus.PENDING).count();
        int approved = (int) reservations.stream().filter(reservation -> reservation.getStatus() == ReservationStatus.APPROVED).count();
        int rejected = (int) reservations.stream().filter(reservation -> reservation.getStatus() == ReservationStatus.REJECTED).count();
        int total = reservations.size();
        boolean hasPhysical = total > 0;
        boolean hasRoom = roomReservations > 0;
        boolean securityValidated = hasPhysical && pendingSecurity == 0;
        boolean securityApproved = hasPhysical && pendingSecurity == 0 && rejected == 0;

        return new EventReservationSummaryResponse(
                eventId,
                total,
                roomReservations,
                equipmentReservations,
                pendingSecurity,
                approved,
                rejected,
                hasPhysical,
                hasRoom,
                securityValidated,
                securityApproved
        );
    }

    private void notifyReservationCreated(ReservationEntity reservation) {
        String requester = normalize(reservation.getRequesterUsername());
        if (requester.isEmpty()) {
            return;
        }

        String scope = reservation.getRoom() != null ? "salle" : "equipement";
        String title = "Reservation enregistree";
        String message = "Votre reservation " + scope + " est en attente de validation securite.";

        sendNotificationSafely(requester, title, message);
    }

    private void notifySecurityDecision(
            ReservationEntity reservation,
            boolean approved,
            String securityUsername,
            String decisionComment
    ) {
        String requester = normalize(reservation.getRequesterUsername());
        String security = normalize(securityUsername);
        String resource = reservation.getRoom() != null
                ? "salle " + normalize(reservation.getRoom().getName())
                : "equipement " + normalize(reservation.getEquipment().getName());
        String safeResource = resource.isBlank() ? "ressource demandee" : resource;
        String comment = normalize(decisionComment);

        String requesterTitle = approved ? "Reservation approuvee" : "Reservation rejetee";
        String requesterMessage = approved
                ? "Votre reservation de " + safeResource + " a ete approuvee."
                : "Votre reservation de " + safeResource + " a ete rejetee.";
        if (!security.isEmpty()) {
            requesterMessage += " Decision prise par " + security + ".";
        }
        if (!comment.isEmpty()) {
            requesterMessage += " Motif: " + comment + ".";
        }

        String securityTitle = approved ? "Validation reservation effectuee" : "Refus reservation enregistre";
        String securityMessage = approved
                ? "Vous avez approuve la reservation de " + safeResource + "."
                : "Vous avez rejete la reservation de " + safeResource + ".";
        if (!requester.isEmpty()) {
            securityMessage += " Demandeur: " + requester + ".";
        }

        sendNotificationSafely(requester, requesterTitle, requesterMessage);
        if (!security.equalsIgnoreCase(requester)) {
            sendNotificationSafely(security, securityTitle, securityMessage);
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
            log.warn("Notification interne non envoyee pour {}", recipient, ex);
        }
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim();
    }

    private String normalizeOrNull(String value) {
        String normalized = normalize(value);
        return normalized.isEmpty() ? null : normalized;
    }

    private Specification<ReservationEntity> buildListSpecification(
            UUID eventId,
            ReservationStatus status,
            String requesterUsername,
            UUID roomId,
            UUID equipmentId,
            EventMode eventMode,
            String search
    ) {
        Specification<ReservationEntity> specification = (root, query, cb) -> cb.conjunction();
        String normalizedRequester = normalizeOrNull(requesterUsername);
        String normalizedSearch = normalizeOrNull(search);

        if (eventId != null) {
            specification = specification.and((root, query, cb) -> cb.equal(root.get("eventId"), eventId));
        }

        if (status != null) {
            specification = specification.and((root, query, cb) -> cb.equal(root.get("status"), status));
        }

        if (normalizedRequester != null) {
            specification = specification.and((root, query, cb) ->
                    cb.like(cb.lower(root.get("requesterUsername")), "%" + normalizedRequester.toLowerCase() + "%"));
        }

        if (roomId != null) {
            specification = specification.and((root, query, cb) -> cb.equal(root.get("room").get("id"), roomId));
        }

        if (equipmentId != null) {
            specification = specification.and((root, query, cb) -> cb.equal(root.get("equipment").get("id"), equipmentId));
        }

        if (eventMode != null) {
            specification = specification.and((root, query, cb) -> cb.equal(root.get("eventMode"), eventMode));
        }

        if (normalizedSearch != null) {
            specification = specification.and((root, query, cb) -> {
                String pattern = "%" + normalizedSearch.toLowerCase() + "%";
                var roomJoin = root.join("room", JoinType.LEFT);
                var equipmentJoin = root.join("equipment", JoinType.LEFT);
                return cb.or(
                        cb.like(cb.lower(root.get("purpose")), pattern),
                        cb.like(cb.lower(root.get("requesterUsername")), pattern),
                        cb.like(cb.lower(root.get("referenceCode")), pattern),
                        cb.like(cb.lower(roomJoin.get("name")), pattern),
                        cb.like(cb.lower(equipmentJoin.get("name")), pattern)
                );
            });
        }

        return specification;
    }
}
