package com.cnstn.notification.dto;

import java.time.Instant;
import java.util.UUID;

public record NotificationResponse(
        UUID id,
        String recipientUsername,
        String title,
        String message,
        boolean read,
        String emailDeliveryStatus,
        String emailDeliveryError,
        Instant emailLastAttemptAt,
        String actionUrl,
        String priority,
        Instant createdAt,
        Instant updatedAt
) {
}
