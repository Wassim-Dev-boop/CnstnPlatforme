package com.cnstn.notification.repository;

import com.cnstn.notification.entity.NotificationEntity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface NotificationRepository extends JpaRepository<NotificationEntity, UUID>, JpaSpecificationExecutor<NotificationEntity> {

    List<NotificationEntity> findByRecipientUsernameIgnoreCaseAndReadFlagFalseOrderByCreatedAtDesc(String username);

    long countByRecipientUsernameIgnoreCaseAndReadFlagFalse(String username);
}
