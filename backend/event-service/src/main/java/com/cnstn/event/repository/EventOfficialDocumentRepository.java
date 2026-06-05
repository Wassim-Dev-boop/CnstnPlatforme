package com.cnstn.event.repository;

import com.cnstn.event.entity.EventOfficialDocumentEntity;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EventOfficialDocumentRepository extends JpaRepository<EventOfficialDocumentEntity, UUID> {

    List<EventOfficialDocumentEntity> findByEventIdOrderByGeneratedAtDesc(UUID eventId);

    Optional<EventOfficialDocumentEntity> findByIdAndEventId(UUID id, UUID eventId);

    Optional<EventOfficialDocumentEntity> findFirstByEventIdOrderByGeneratedAtDesc(UUID eventId);
}
