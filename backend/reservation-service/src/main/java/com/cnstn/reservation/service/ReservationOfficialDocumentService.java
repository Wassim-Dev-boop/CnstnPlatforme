package com.cnstn.reservation.service;

import com.cnstn.reservation.dto.ReservationDocumentContent;
import com.cnstn.reservation.dto.ReservationDocumentResponse;
import com.cnstn.reservation.entity.ReservationEntity;
import com.cnstn.reservation.entity.ReservationOfficialDocumentEntity;
import com.cnstn.reservation.entity.ReservationOfficialDocumentType;
import com.cnstn.reservation.exception.ResourceNotFoundException;
import com.cnstn.reservation.repository.ReservationOfficialDocumentRepository;
import java.time.Instant;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ReservationOfficialDocumentService {

    private static final String MIME_PDF = "application/pdf";

    private final ReservationOfficialDocumentRepository documentRepository;
    private final ReservationOfficialPdfRenderer pdfRenderer;

    public ReservationOfficialDocumentService(
            ReservationOfficialDocumentRepository documentRepository,
            ReservationOfficialPdfRenderer pdfRenderer
    ) {
        this.documentRepository = documentRepository;
        this.pdfRenderer = pdfRenderer;
    }

    @Transactional
    public ReservationDocumentResponse generateRequestDocument(ReservationEntity reservation, String generatedBy) {
        ReservationEntity safeReservation = Objects.requireNonNull(reservation);
        String reservationReference = requireReservationReference(safeReservation);
        int businessVersion = resolveBusinessVersion(safeReservation);

        String documentReference = reservationReference + "-v" + businessVersion;
        Instant generatedAt = Instant.now();
        String safeGeneratedBy = normalizeOrFallback(generatedBy, safeReservation.getRequesterUsername());

        byte[] pdf = pdfRenderer.renderRequestPdf(
                safeReservation,
                documentReference,
                businessVersion,
                safeGeneratedBy,
                safeReservation.getPurpose(),
                generatedAt
        );

        ReservationOfficialDocumentEntity entity = new ReservationOfficialDocumentEntity();
        entity.setReservationId(safeReservation.getId());
        entity.setEventId(safeReservation.getEventId());
        entity.setDocumentType(ReservationOfficialDocumentType.DEMANDE_RESERVATION);
        entity.setDocumentReference(documentReference);
        entity.setBusinessVersion(businessVersion);
        entity.setFileName(documentReference + ".pdf");
        entity.setMimeType(MIME_PDF);
        entity.setGeneratedBy(safeGeneratedBy);
        entity.setDecisionValue("SOUMISSION");
        entity.setContent(pdf);

        ReservationOfficialDocumentEntity saved = documentRepository.save(entity);
        return toResponse(saved);
    }

    @Transactional
    public ReservationDocumentResponse generateSecurityDecisionDocument(
            ReservationEntity reservation,
            boolean approved,
            String decisionName,
            String decisionComment,
            Instant decisionAt
    ) {
        return generateSecurityDecisionDocument(
                reservation,
                approved,
                decisionName,
                "RESPONSABLE_SECURITE",
                decisionComment,
                decisionAt
        );
    }

    public ReservationDocumentResponse generateSecurityDecisionDocument(
            ReservationEntity reservation,
            boolean approved,
            String decisionName,
            String decisionRole,
            String decisionComment,
            Instant decisionAt
    ) {
        ReservationEntity safeReservation = Objects.requireNonNull(reservation);
        String reservationReference = requireReservationReference(safeReservation);
        int businessVersion = resolveBusinessVersion(safeReservation);

        String documentReference = reservationReference + "-SEC-v" + businessVersion;
        String decisionValue = approved ? "APPROUVE" : "REFUSE";
        Instant safeDecisionAt = decisionAt == null ? Instant.now() : decisionAt;
        String safeDecisionName = normalizeOrFallback(decisionName, "security.cnstn");
        String safeDecisionRole = normalizeOrFallback(decisionRole, "RESPONSABLE_SECURITE");

        byte[] pdf = pdfRenderer.renderDecisionPdf(
                safeReservation,
                ReservationOfficialDocumentType.DECISION_SECURITE,
                documentReference,
                businessVersion,
                safeDecisionName,
                safeDecisionRole,
                safeDecisionName,
                decisionValue,
                decisionComment,
                approved ? null : decisionComment,
                safeDecisionAt
        );

        ReservationOfficialDocumentEntity entity = new ReservationOfficialDocumentEntity();
        entity.setReservationId(safeReservation.getId());
        entity.setEventId(safeReservation.getEventId());
        entity.setDocumentType(ReservationOfficialDocumentType.DECISION_SECURITE);
        entity.setDocumentReference(documentReference);
        entity.setBusinessVersion(businessVersion);
        entity.setFileName(documentReference + ".pdf");
        entity.setMimeType(MIME_PDF);
        entity.setGeneratedBy(safeDecisionName);
        entity.setDecisionRole(safeDecisionRole);
        entity.setDecisionName(safeDecisionName);
        entity.setDecisionAt(safeDecisionAt);
        entity.setDecisionValue(decisionValue);
        entity.setDecisionComment(normalizeOrNull(decisionComment));
        entity.setRejectionReason(approved ? null : normalizeOrNull(decisionComment));
        entity.setContent(pdf);

        ReservationOfficialDocumentEntity saved = documentRepository.save(entity);
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<ReservationDocumentResponse> listByReservation(UUID reservationId) {
        return documentRepository.findByReservationIdOrderByGeneratedAtDesc(Objects.requireNonNull(reservationId))
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public ReservationDocumentContent download(UUID reservationId, UUID documentId) {
        ReservationOfficialDocumentEntity entity = documentRepository.findByIdAndReservationId(
                        Objects.requireNonNull(documentId),
                        Objects.requireNonNull(reservationId)
                )
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Document officiel reservation introuvable: " + documentId
                ));

        return new ReservationDocumentContent(entity.getFileName(), entity.getMimeType(), entity.getContent());
    }

    @Transactional(readOnly = true)
    public ReservationDocumentContent downloadLatest(UUID reservationId) {
        ReservationOfficialDocumentEntity entity = documentRepository.findFirstByReservationIdOrderByGeneratedAtDesc(
                        Objects.requireNonNull(reservationId)
                )
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Aucun document officiel disponible pour la reservation: " + reservationId
                ));

        return new ReservationDocumentContent(entity.getFileName(), entity.getMimeType(), entity.getContent());
    }

    private ReservationDocumentResponse toResponse(ReservationOfficialDocumentEntity entity) {
        return new ReservationDocumentResponse(
                entity.getId(),
                entity.getDocumentType(),
                entity.getDocumentReference(),
                entity.getBusinessVersion(),
                entity.getFileName(),
                entity.getMimeType(),
                entity.getGeneratedBy(),
                entity.getGeneratedAt(),
                entity.getDecisionRole(),
                entity.getDecisionName(),
                entity.getDecisionAt(),
                entity.getDecisionValue(),
                entity.getDecisionComment(),
                entity.getRejectionReason()
        );
    }

    private String requireReservationReference(ReservationEntity reservation) {
        String reference = normalizeOrNull(reservation.getReferenceCode());
        if (reference == null) {
            throw new IllegalStateException("Reference reservation absente: impossible de generer le document officiel");
        }
        return reference;
    }

    private int resolveBusinessVersion(ReservationEntity reservation) {
        return Math.max(1, reservation.getBusinessVersion());
    }

    private String normalizeOrFallback(String value, String fallback) {
        String normalized = normalizeOrNull(value);
        if (normalized != null) {
            return normalized;
        }
        String fallbackNormalized = normalizeOrNull(fallback);
        return fallbackNormalized == null ? "systeme" : fallbackNormalized;
    }

    private String normalizeOrNull(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }
}
