package com.cnstn.ged.dto;

import com.cnstn.ged.entity.DocumentLinkType;
import java.time.Instant;
import java.util.UUID;

public record DocumentLinkResponse(
        UUID id,
        UUID sourceDocumentId,
        UUID linkedDocumentId,
        String linkedDocumentReference,
        String linkedDocumentTitle,
        DocumentLinkType relationType,
        String createdBy,
        Instant createdAt
) {
}
