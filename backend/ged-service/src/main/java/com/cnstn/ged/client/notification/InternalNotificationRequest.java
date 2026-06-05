package com.cnstn.ged.client.notification;

public record InternalNotificationRequest(
        String recipientUsername,
        String title,
        String message
) {
}
