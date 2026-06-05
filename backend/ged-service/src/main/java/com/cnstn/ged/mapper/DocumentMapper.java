package com.cnstn.ged.mapper;

import com.cnstn.ged.dto.DocumentResponse;
import com.cnstn.ged.dto.DocumentVersionResponse;
import com.cnstn.ged.dto.GedAuditLogResponse;
import com.cnstn.ged.entity.DocumentEntity;
import com.cnstn.ged.entity.DocumentVersionEntity;
import com.cnstn.ged.entity.GedAuditLogEntity;

public final class DocumentMapper {

    private DocumentMapper() {
    }

    public static DocumentResponse toResponse(DocumentEntity entity) {
        return new DocumentResponse(
                entity.getId(),
                entity.getReferenceCode(),
                entity.getFolderId(),
                entity.getTitle(),
                entity.getCategory(),
                entity.getSubCategory(),
                entity.getDescription(),
                entity.getCreatedBy(),
                entity.getOwnerService(),
                entity.getStatus(),
                entity.getConfidentialityLevel(),
                entity.isArchived(),
                entity.getCurrentVersionNumber(),
                entity.getApprovedBy(),
                entity.getPublishedAt(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }

    public static DocumentVersionResponse toResponse(DocumentVersionEntity entity) {
        return new DocumentVersionResponse(
                entity.getId(),
                entity.getDocumentId(),
                entity.getVersionNumber(),
                entity.getFileName(),
                entity.getMimeType(),
                entity.getFileSize(),
                entity.getChangeNote(),
                entity.getCreatedBy(),
                entity.getCreatedAt(),
                entity.isCurrent()
        );
    }

    public static GedAuditLogResponse toResponse(GedAuditLogEntity entity) {
        return new GedAuditLogResponse(
                entity.getId(),
                entity.getEntityType(),
                entity.getEntityId(),
                entity.getAction(),
                entity.getActorUsername(),
                entity.getActorRoles(),
                entity.getActorService(),
                entity.getDetailsJson(),
                entity.getCreatedAt()
        );
    }
}
