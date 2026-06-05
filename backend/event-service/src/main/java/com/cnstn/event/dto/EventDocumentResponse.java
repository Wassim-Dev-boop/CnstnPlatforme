package com.cnstn.event.dto;

import com.cnstn.event.entity.EventOfficialDocumentType;
import java.time.Instant;
import java.util.UUID;

public record EventDocumentResponse(
        UUID id,
        EventOfficialDocumentType documentType,
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
