package com.cnstn.event.repository;

import com.cnstn.event.entity.EventInvitationEntity;
import com.cnstn.event.entity.EventInvitationStatus;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EventInvitationRepository extends JpaRepository<EventInvitationEntity, UUID> {

    List<EventInvitationEntity> findAllByOrderByCreatedAtDesc();

    List<EventInvitationEntity> findByEventIdOrderByCreatedAtDesc(UUID eventId);

    List<EventInvitationEntity> findByInvitedUsernameIgnoreCaseOrderByCreatedAtDesc(String invitedUsername);

    List<EventInvitationEntity> findByInvitedEmailIgnoreCaseOrderByCreatedAtDesc(String invitedEmail);

    List<EventInvitationEntity> findByInvitedByUsernameIgnoreCaseOrderByCreatedAtDesc(String invitedByUsername);

    Optional<EventInvitationEntity> findByEventIdAndInvitedUsernameIgnoreCase(UUID eventId, String invitedUsername);

    Optional<EventInvitationEntity> findByEventIdAndInvitedEmailIgnoreCase(UUID eventId, String invitedEmail);

    List<EventInvitationEntity> findByStatusAndExpiresAtBefore(EventInvitationStatus status, Instant threshold);
}
