package com.cnstn.ged.repository;

import com.cnstn.ged.entity.DocumentAclEntryEntity;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DocumentAclEntryRepository extends JpaRepository<DocumentAclEntryEntity, UUID> {

    List<DocumentAclEntryEntity> findByDocumentIdOrderByAclTypeAscAclValueAsc(UUID documentId);

    List<DocumentAclEntryEntity> findByDocumentIdIn(Collection<UUID> documentIds);

    void deleteByDocumentId(UUID documentId);
}
