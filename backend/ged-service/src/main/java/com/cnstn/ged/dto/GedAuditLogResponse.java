package com.cnstn.ged.dto;

import java.time.Instant;
import java.util.UUID;

public record GedAuditLogResponse(
        UUID id,
        String entityType,
        UUID entityId,
        String action,
        String actorUsername,
        String actorRoles,
        String actorService,
        String detailsJson,
        Instant createdAt
) {
}
