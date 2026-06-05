package com.cnstn.notification.repository;

import com.cnstn.notification.entity.NotificationEmailLogEntity;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface NotificationEmailLogRepository
        extends JpaRepository<NotificationEmailLogEntity, UUID>, JpaSpecificationExecutor<NotificationEmailLogEntity> {

    Optional<NotificationEmailLogEntity> findTopByNotificationIdOrderByAttemptedAtDesc(UUID notificationId);
}

