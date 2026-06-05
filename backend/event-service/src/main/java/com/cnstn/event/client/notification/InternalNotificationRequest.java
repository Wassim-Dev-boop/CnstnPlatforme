package com.cnstn.event.client.notification;

public record InternalNotificationRequest(
        String recipientUsername,
        String title,
        String message,
        String actionUrl
) {
}

