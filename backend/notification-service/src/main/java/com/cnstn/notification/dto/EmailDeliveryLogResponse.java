package com.cnstn.notification.dto;

import java.time.Instant;
import java.util.UUID;

public record EmailDeliveryLogResponse(
        UUID id,
        UUID notificationId,
        String recipientUsername,
        String recipientEmail,
        String notificationType,
        String emailSubject,
        String status,
        String failureReason,
        Instant attemptedAt,
        Instant createdAt
) {
}

