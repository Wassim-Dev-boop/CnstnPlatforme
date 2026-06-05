package com.cnstn.event.service;

import com.cnstn.event.dto.EventDocumentContent;
import com.cnstn.event.dto.EventDocumentResponse;
import com.cnstn.event.entity.EventEntity;
import com.cnstn.event.entity.EventOfficialDocumentEntity;
import com.cnstn.event.entity.EventOfficialDocumentType;
import com.cnstn.event.exception.ResourceNotFoundException;
import com.cnstn.event.repository.EventOfficialDocumentRepository;
import java.time.Instant;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class EventOfficialDocumentService {

    private static final String MIME_PDF = "application/pdf";

    private final EventOfficialDocumentRepository documentRepository;
    private final EventOfficialPdfRenderer pdfRenderer;

    public EventOfficialDocumentService(
            EventOfficialDocumentRepository documentRepository,
            EventOfficialPdfRenderer pdfRenderer
    ) {
        this.documentRepository = documentRepository;
        this.pdfRenderer = pdfRenderer;
    }

    @Transactional
    public EventDocumentResponse generateSubmissionDocument(EventEntity event, String generatedBy, String submissionComment) {
        EventEntity safeEvent = Objects.requireNonNull(event);
        String eventReference = requireEventReference(safeEvent);
        int businessVersion = resolveBusinessVersion(safeEvent);

        String documentReference = eventReference + "-v" + businessVersion;
        Instant generatedAt = Instant.now();
        byte[] pdfContent = pdfRenderer.renderSubmissionPdf(
                safeEvent,
                documentReference,
                businessVersion,
                normalizeOrFallback(generatedBy, safeEvent.getRequestedBy()),
                submissionComment,
                generatedAt
        );

        EventOfficialDocumentEntity entity = new EventOfficialDocumentEntity();
        entity.setEventId(safeEvent.getId());
        entity.setDocumentType(EventOfficialDocumentType.SOUMISSION_EVENEMENT);
        entity.setDocumentReference(documentReference);
        entity.setBusinessVersion(businessVersion);
        entity.setFileName(documentReference + ".pdf");
        entity.setMimeType(MIME_PDF);
        entity.setGeneratedBy(normalizeOrFallback(generatedBy, safeEvent.getRequestedBy()));
        entity.setDecisionValue("SOUMISSION");
        entity.setContent(pdfContent);

        EventOfficialDocumentEntity saved = documentRepository.save(entity);
        return toResponse(saved);
    }

    @Transactional
    public EventDocumentResponse generateDecisionDocument(
            EventEntity event,
            EventOfficialDocumentType documentType,
            boolean approved,
            String decisionRole,
            String decisionName,
            String decisionComment,
            String rejectionReason,
            Instant decisionAt
    ) {
        EventEntity safeEvent = Objects.requireNonNull(event);
        EventOfficialDocumentType safeType = Objects.requireNonNull(documentType);
        String eventReference = requireEventReference(safeEvent);
        int businessVersion = resolveBusinessVersion(safeEvent);

        String suffix = switch (safeType) {
            case DECISION_MANAGER -> "-MGR";
            case DECISION_SECURITE -> "-SEC";
            case DECISION_DSN -> "-DSN";
            case DECISION_SALLE -> "-SAL";
            default -> "-DEC";
        };
        String documentReference = eventReference + suffix + "-v" + businessVersion;
        String decisionValue = approved ? "APPROUVE" : "REFUSE";
        Instant safeDecisionAt = decisionAt == null ? Instant.now() : decisionAt;
        String safeDecisionName = normalizeOrFallback(decisionName, "Systeme CNSTN");

        byte[] pdfContent = pdfRenderer.renderDecisionPdf(
                safeEvent,
                safeType,
                documentReference,
                businessVersion,
                safeDecisionName,
                normalizeOrFallback(decisionRole, "N/A"),
                safeDecisionName,
                decisionValue,
                decisionComment,
                rejectionReason,
                safeDecisionAt
        );

        EventOfficialDocumentEntity entity = new EventOfficialDocumentEntity();
        entity.setEventId(safeEvent.getId());
        entity.setDocumentType(safeType);
        entity.setDocumentReference(documentReference);
        entity.setBusinessVersion(businessVersion);
        entity.setFileName(documentReference + ".pdf");
        entity.setMimeType(MIME_PDF);
        entity.setGeneratedBy(safeDecisionName);
        entity.setDecisionRole(normalizeOrNull(decisionRole));
        entity.setDecisionName(safeDecisionName);
        entity.setDecisionAt(safeDecisionAt);
        entity.setDecisionValue(decisionValue);
        entity.setDecisionComment(normalizeOrNull(decisionComment));
        entity.setRejectionReason(normalizeOrNull(rejectionReason));
        entity.setContent(pdfContent);

        EventOfficialDocumentEntity saved = documentRepository.save(entity);
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<EventDocumentResponse> listByEvent(UUID eventId) {
        return documentRepository.findByEventIdOrderByGeneratedAtDesc(Objects.requireNonNull(eventId))
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public EventDocumentContent download(EventEntity event, UUID documentId) {
        EventEntity safeEvent = Objects.requireNonNull(event);
        EventOfficialDocumentEntity entity = documentRepository.findByIdAndEventId(
                        Objects.requireNonNull(documentId),
                        safeEvent.getId()
                )
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Document officiel evenement introuvable: " + documentId
                ));

        return new EventDocumentContent(entity.getFileName(), entity.getMimeType(), renderFromMetadata(safeEvent, entity));
    }

    @Transactional(readOnly = true)
    public EventDocumentContent downloadLatest(EventEntity event) {
        EventEntity safeEvent = Objects.requireNonNull(event);
        EventOfficialDocumentEntity entity = documentRepository.findFirstByEventIdOrderByGeneratedAtDesc(
                        safeEvent.getId()
                )
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Aucun document officiel disponible pour l evenement: " + safeEvent.getId()
                ));

        return new EventDocumentContent(entity.getFileName(), entity.getMimeType(), renderFromMetadata(safeEvent, entity));
    }

    private EventDocumentResponse toResponse(EventOfficialDocumentEntity entity) {
        return new EventDocumentResponse(
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

    private byte[] renderFromMetadata(EventEntity event, EventOfficialDocumentEntity entity) {
        if (entity.getDocumentType() == EventOfficialDocumentType.SOUMISSION_EVENEMENT) {
            return pdfRenderer.renderSubmissionPdf(
                    event,
                    entity.getDocumentReference(),
                    entity.getBusinessVersion(),
                    normalizeOrFallback(entity.getGeneratedBy(), event.getRequestedBy()),
                    normalizeOrFallback(entity.getDecisionComment(), "Aucun commentaire"),
                    normalizeInstant(entity.getGeneratedAt())
            );
        }

        return pdfRenderer.renderDecisionPdf(
                event,
                entity.getDocumentType(),
                entity.getDocumentReference(),
                entity.getBusinessVersion(),
                normalizeOrFallback(entity.getGeneratedBy(), "Systeme CNSTN"),
                normalizeOrFallback(entity.getDecisionRole(), "N/A"),
                normalizeOrFallback(entity.getDecisionName(), entity.getGeneratedBy()),
                normalizeOrFallback(entity.getDecisionValue(), "N/A"),
                entity.getDecisionComment(),
                entity.getRejectionReason(),
                normalizeInstant(entity.getDecisionAt() == null ? entity.getGeneratedAt() : entity.getDecisionAt())
        );
    }

    private String requireEventReference(EventEntity event) {
        String reference = normalizeOrNull(event.getReferenceCode());
        if (reference == null) {
            throw new IllegalStateException("Reference evenement absente: impossible de generer le document officiel");
        }
        return reference;
    }

    private int resolveBusinessVersion(EventEntity event) {
        return Math.max(1, event.getBusinessVersion());
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

    private Instant normalizeInstant(Instant value) {
        return value == null ? Instant.now() : value;
    }
}
