package com.cnstn.intervention.client.notification;

public record InternalNotificationRequest(
        String recipientUsername,
        String title,
        String message
) {
}
