package com.cnstn.notification.dto;

import java.time.Instant;
import java.util.UUID;

public record EmailDeliveryStatusResponse(
        UUID notificationId,
        String emailDeliveryStatus,
        String emailDeliveryError,
        Instant emailLastAttemptAt
) {
}

