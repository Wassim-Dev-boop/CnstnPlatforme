package com.cnstn.ged.repository;

import com.cnstn.ged.entity.GedAuditLogEntity;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GedAuditLogRepository extends JpaRepository<GedAuditLogEntity, UUID> {

    Page<GedAuditLogEntity> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
