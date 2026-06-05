package com.cnstn.intervention.dto;

import java.time.Instant;
import java.util.UUID;

public record ItInterventionTransitionResponse(
    UUID id,
    String fromStatus,
    String toStatus,
    String actorId,
    String actorRole,
    String note,
    Instant createdAt
) {
}
