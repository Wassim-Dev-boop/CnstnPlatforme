package com.cnstn.notification.dto;

import com.cnstn.notification.entity.NotificationPriority;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record NotificationCreateRequest(
        @NotBlank @Size(max = 120) String recipientUsername,
        @NotBlank @Size(max = 180) String title,
        @NotBlank @Size(max = 2000) String message,
        @Email @Size(max = 190) String recipientEmail,
        @Size(max = 120) String notificationType,
        @Size(max = 500) String actionUrl,
        Boolean inAppOnly,
        NotificationPriority priority
) {
    public NotificationPriority effectivePriority() {
        return priority == null ? NotificationPriority.NORMAL : priority;
    }
}
