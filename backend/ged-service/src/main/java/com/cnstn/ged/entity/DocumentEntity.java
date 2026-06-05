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
import org.hibernate.annotations.UpdateTimestamp;

@Entity
@Table(name = "documents")
public class DocumentEntity {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "reference_code", length = 24, unique = true)
    private String referenceCode;

    @Column(name = "title", nullable = false, length = 180)
    private String title;

    @Column(name = "category", nullable = false, length = 120)
    private String category;

    @Column(name = "sub_category", length = 80)
    private String subCategory;

    @Column(name = "description", length = 2000)
    private String description;

    @Column(name = "content")
    private String content;

    @Column(name = "folder_id")
    private UUID folderId;

    @Column(name = "owner_service", length = 120)
    private String ownerService;

    @Enumerated(EnumType.STRING)
    @Column(name = "confidentiality_level", nullable = false, length = 20)
    private DocumentConfidentialityLevel confidentialityLevel = DocumentConfidentialityLevel.INTERNAL;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private DocumentStatus status = DocumentStatus.DRAFT;

    @Column(name = "archived", nullable = false)
    private boolean archived = false;

    @Column(name = "current_version_number", nullable = false)
    private int currentVersionNumber = 1;

    @Column(name = "created_by", nullable = false, length = 120)
    private String createdBy;

    @Column(name = "approved_by", length = 120)
    private String approvedBy;

    @Column(name = "published_at")
    private Instant publishedAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getReferenceCode() {
        return referenceCode;
    }

    public void setReferenceCode(String referenceCode) {
        this.referenceCode = referenceCode;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public String getSubCategory() {
        return subCategory;
    }

    public void setSubCategory(String subCategory) {
        this.subCategory = subCategory;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public UUID getFolderId() {
        return folderId;
    }

    public void setFolderId(UUID folderId) {
        this.folderId = folderId;
    }

    public String getOwnerService() {
        return ownerService;
    }

    public void setOwnerService(String ownerService) {
        this.ownerService = ownerService;
    }

    public DocumentConfidentialityLevel getConfidentialityLevel() {
        return confidentialityLevel;
    }

    public void setConfidentialityLevel(DocumentConfidentialityLevel confidentialityLevel) {
        this.confidentialityLevel = confidentialityLevel;
    }

    public DocumentStatus getStatus() {
        return status;
    }

    public void setStatus(DocumentStatus status) {
        this.status = status;
    }

    public boolean isArchived() {
        return archived;
    }

    public void setArchived(boolean archived) {
        this.archived = archived;
    }

    public int getCurrentVersionNumber() {
        return currentVersionNumber;
    }

    public void setCurrentVersionNumber(int currentVersionNumber) {
        this.currentVersionNumber = currentVersionNumber;
    }

    public String getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(String createdBy) {
        this.createdBy = createdBy;
    }

    public String getApprovedBy() {
        return approvedBy;
    }

    public void setApprovedBy(String approvedBy) {
        this.approvedBy = approvedBy;
    }

    public Instant getPublishedAt() {
        return publishedAt;
    }

    public void setPublishedAt(Instant publishedAt) {
        this.publishedAt = publishedAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
