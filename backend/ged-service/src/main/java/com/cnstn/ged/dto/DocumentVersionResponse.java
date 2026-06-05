package com.cnstn.ged.dto;

import java.time.Instant;
import java.util.UUID;

public record DocumentVersionResponse(
        UUID id,
        UUID documentId,
        int versionNumber,
        String fileName,
        String mimeType,
        long fileSize,
        String changeNote,
        String createdBy,
        Instant createdAt,
        boolean current
) {
}
