package com.cnstn.reservation.dto;

import com.cnstn.reservation.entity.ReservationOfficialDocumentType;
import java.time.Instant;
import java.util.UUID;

public record ReservationDocumentResponse(
        UUID id,
        ReservationOfficialDocumentType documentType,
        String documentReference,
        int businessVersion,
        String fileName,
        String mimeType,
        String generatedBy,
        Instant generatedAt,
        String decisionRole,
        String decisionName,
        Instant decisionAt,
        String decisionValue,
        String decisionComment,
        String rejectionReason
) {
}
