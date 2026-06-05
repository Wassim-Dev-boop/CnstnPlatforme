package com.cnstn.ged.dto;

import com.cnstn.ged.entity.DocumentConfidentialityLevel;
import com.cnstn.ged.entity.DocumentStatus;
import java.time.Instant;
import java.util.UUID;

public record DocumentResponse(
        UUID id,
        String referenceCode,
        UUID folderId,
        String title,
        String category,
        String subCategory,
        String description,
        String createdBy,
        String ownerService,
        DocumentStatus status,
        DocumentConfidentialityLevel confidentialityLevel,
        boolean archived,
        int currentVersionNumber,
        String approvedBy,
        Instant publishedAt,
        Instant createdAt,
        Instant updatedAt
) {
}
