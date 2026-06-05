package com.cnstn.authuser.client.notification;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record InternalNotificationRequest(
        @NotBlank @Size(max = 120) String recipientUsername,
        @NotBlank @Size(max = 180) String title,
        @NotBlank @Size(max = 2000) String message
) {
}
