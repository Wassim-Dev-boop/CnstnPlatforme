package com.cnstn.ged.repository;

import com.cnstn.ged.entity.DocumentLinkEntity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DocumentLinkRepository extends JpaRepository<DocumentLinkEntity, UUID> {

    List<DocumentLinkEntity> findBySourceDocumentIdOrderByCreatedAtDesc(UUID sourceDocumentId);

    void deleteBySourceDocumentIdOrLinkedDocumentId(UUID sourceDocumentId, UUID linkedDocumentId);
}
