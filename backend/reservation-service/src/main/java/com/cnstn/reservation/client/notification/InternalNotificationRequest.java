package com.cnstn.reservation.client.notification;

public record InternalNotificationRequest(
        String recipientUsername,
        String title,
        String message
) {
}

