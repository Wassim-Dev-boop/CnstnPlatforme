package com.cnstn.event.repository;

import com.cnstn.event.entity.PartnerInvitationEntity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PartnerInvitationRepository extends JpaRepository<PartnerInvitationEntity, UUID> {

    List<PartnerInvitationEntity> findByEventId(UUID eventId);

    boolean existsByEventId(UUID eventId);
}
