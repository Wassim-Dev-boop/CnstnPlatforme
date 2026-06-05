package com.cnstn.event.dto;

import java.time.Instant;
import java.util.UUID;

public record PartnerInviteResponse(
        UUID id,
        UUID eventId,
        String partnerName,
        String partnerEmail,
        boolean accessApproved,
        Instant createdAt
) {
}
