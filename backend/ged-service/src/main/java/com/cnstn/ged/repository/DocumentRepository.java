package com.cnstn.ged.repository;

import com.cnstn.ged.entity.DocumentEntity;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DocumentRepository extends JpaRepository<DocumentEntity, UUID> {

    List<DocumentEntity> findByArchivedFalse();

    Optional<DocumentEntity> findByIdAndArchivedFalse(UUID id);
}
