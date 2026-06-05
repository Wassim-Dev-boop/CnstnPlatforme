package com.cnstn.event.repository;

import com.cnstn.event.entity.EventPhotoEntity;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EventPhotoRepository extends JpaRepository<EventPhotoEntity, UUID> {

    List<EventPhotoEntity> findByEventIdAndArchivedFalseOrderByCreatedAtDesc(UUID eventId);

    Optional<EventPhotoEntity> findByIdAndEventId(UUID id, UUID eventId);
}
