package com.cnstn.notification.mapper;

import com.cnstn.notification.dto.NotificationResponse;
import com.cnstn.notification.entity.NotificationEntity;

public final class NotificationMapper {

    private NotificationMapper() {
    }

    public static NotificationResponse toResponse(NotificationEntity entity) {
        return new NotificationResponse(
                entity.getId(),
                entity.getRecipientUsername(),
                entity.getTitle(),
                entity.getMessage(),
                entity.isReadFlag(),
                entity.getEmailDeliveryStatus() == null ? null : entity.getEmailDeliveryStatus().name(),
                entity.getEmailLastError(),
                entity.getEmailLastAttemptAt(),
                entity.getActionUrl(),
                entity.getPriority() == null ? null : entity.getPriority().name(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }
}
