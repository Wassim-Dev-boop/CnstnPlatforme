package com.cnstn.ged.repository;

import com.cnstn.ged.entity.GedFolderEntity;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GedFolderRepository extends JpaRepository<GedFolderEntity, UUID> {

    List<GedFolderEntity> findByArchivedFalseOrderByNameAsc();

    List<GedFolderEntity> findByParentIdAndArchivedFalseOrderByNameAsc(UUID parentId);

    Optional<GedFolderEntity> findByIdAndArchivedFalse(UUID id);
}
