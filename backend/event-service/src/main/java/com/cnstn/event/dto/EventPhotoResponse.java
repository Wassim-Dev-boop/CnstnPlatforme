package com.cnstn.event.dto;

import java.time.Instant;
import java.util.UUID;

public record EventPhotoResponse(
        UUID id,
        UUID eventId,
        String fileName,
        String contentType,
        long fileSize,
        String uploadedBy,
        Instant uploadedAt
) {
}
