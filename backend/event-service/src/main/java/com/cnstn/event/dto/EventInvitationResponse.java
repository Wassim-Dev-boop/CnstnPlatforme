package com.cnstn.event.dto;

import com.cnstn.event.entity.EventInvitationStatus;
import com.cnstn.event.entity.EventMode;
import java.time.Instant;
import java.util.UUID;

public record EventInvitationResponse(
        UUID id,
        UUID eventId,
        String eventTitle,
        Instant eventStartAt,
        Instant eventEndAt,
        EventMode eventMode,
        String eventLocation,
        String onlineMeetingLink,
        String invitedUsername,
        String invitedEmail,
        String invitedDisplayName,
        String invitedByUsername,
        String invitedByDisplayName,
        EventInvitationStatus status,
        String message,
        String responseReason,
        Instant respondedAt,
        Instant expiresAt,
        Instant createdAt
) {
}

