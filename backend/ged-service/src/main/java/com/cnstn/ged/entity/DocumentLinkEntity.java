package com.cnstn.ged.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(name = "document_links")
public class DocumentLinkEntity {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "source_document_id", nullable = false)
    private UUID sourceDocumentId;

    @Column(name = "linked_document_id", nullable = false)
    private UUID linkedDocumentId;

    @Enumerated(EnumType.STRING)
    @Column(name = "relation_type", nullable = false, length = 30)
    private DocumentLinkType relationType = DocumentLinkType.RELATED;

    @Column(name = "created_by", nullable = false, length = 120)
    private String createdBy;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getSourceDocumentId() {
        return sourceDocumentId;
    }

    public void setSourceDocumentId(UUID sourceDocumentId) {
        this.sourceDocumentId = sourceDocumentId;
    }

    public UUID getLinkedDocumentId() {
        return linkedDocumentId;
    }

    public void setLinkedDocumentId(UUID linkedDocumentId) {
        this.linkedDocumentId = linkedDocumentId;
    }

    public DocumentLinkType getRelationType() {
        return relationType;
    }

    public void setRelationType(DocumentLinkType relationType) {
        this.relationType = relationType;
    }

    public String getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(String createdBy) {
        this.createdBy = createdBy;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
