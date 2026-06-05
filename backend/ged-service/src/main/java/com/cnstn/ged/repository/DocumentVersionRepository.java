package com.cnstn.ged.repository;

import com.cnstn.ged.entity.DocumentVersionEntity;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DocumentVersionRepository extends JpaRepository<DocumentVersionEntity, UUID> {

    List<DocumentVersionEntity> findByDocumentIdOrderByVersionNumberDesc(UUID documentId);

    Optional<DocumentVersionEntity> findByDocumentIdAndVersionNumber(UUID documentId, int versionNumber);

    Optional<DocumentVersionEntity> findByDocumentIdAndCurrentTrue(UUID documentId);

    void deleteByDocumentId(UUID documentId);
}
