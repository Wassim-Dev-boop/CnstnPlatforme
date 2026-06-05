package com.cnstn.event.entity;

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
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "event_official_documents")
public class EventOfficialDocumentEntity {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "event_id", nullable = false)
    private UUID eventId;

    @Enumerated(EnumType.STRING)
    @Column(name = "document_type", nullable = false, length = 60)
    private EventOfficialDocumentType documentType;

    @Column(name = "document_reference", nullable = false, length = 60)
    private String documentReference;

    @Column(name = "business_version", nullable = false)
    private int businessVersion;

    @Column(name = "file_name", nullable = false, length = 220)
    private String fileName;

    @Column(name = "mime_type", nullable = false, length = 100)
    private String mimeType;

    @Column(name = "generated_by", nullable = false, length = 120)
    private String generatedBy;

    @CreationTimestamp
    @Column(name = "generated_at", nullable = false, updatable = false)
    private Instant generatedAt;

    @Column(name = "decision_role", length = 80)
    private String decisionRole;

    @Column(name = "decision_name", length = 120)
    private String decisionName;

    @Column(name = "decision_at")
    private Instant decisionAt;

    @Column(name = "decision_value", length = 20)
    private String decisionValue;

    @Column(name = "decision_comment", length = 500)
    private String decisionComment;

    @Column(name = "rejection_reason", length = 500)
    private String rejectionReason;

    @JdbcTypeCode(SqlTypes.BINARY)
    @Column(name = "content", nullable = false, columnDefinition = "bytea")
    private byte[] content;

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getEventId() {
        return eventId;
    }

    public void setEventId(UUID eventId) {
        this.eventId = eventId;
    }

    public EventOfficialDocumentType getDocumentType() {
        return documentType;
    }

    public void setDocumentType(EventOfficialDocumentType documentType) {
        this.documentType = documentType;
    }

    public String getDocumentReference() {
        return documentReference;
    }

    public void setDocumentReference(String documentReference) {
        this.documentReference = documentReference;
    }

    public int getBusinessVersion() {
        return businessVersion;
    }

    public void setBusinessVersion(int businessVersion) {
        this.businessVersion = businessVersion;
    }

    public String getFileName() {
        return fileName;
    }

    public void setFileName(String fileName) {
        this.fileName = fileName;
    }

    public String getMimeType() {
        return mimeType;
    }

    public void setMimeType(String mimeType) {
        this.mimeType = mimeType;
    }

    public String getGeneratedBy() {
        return generatedBy;
    }

    public void setGeneratedBy(String generatedBy) {
        this.generatedBy = generatedBy;
    }

    public Instant getGeneratedAt() {
        return generatedAt;
    }

    public String getDecisionRole() {
        return decisionRole;
    }

    public void setDecisionRole(String decisionRole) {
        this.decisionRole = decisionRole;
    }

    public String getDecisionName() {
        return decisionName;
    }

    public void setDecisionName(String decisionName) {
        this.decisionName = decisionName;
    }

    public Instant getDecisionAt() {
        return decisionAt;
    }

    public void setDecisionAt(Instant decisionAt) {
        this.decisionAt = decisionAt;
    }

    public String getDecisionValue() {
        return decisionValue;
    }

    public void setDecisionValue(String decisionValue) {
        this.decisionValue = decisionValue;
    }

    public String getDecisionComment() {
        return decisionComment;
    }

    public void setDecisionComment(String decisionComment) {
        this.decisionComment = decisionComment;
    }

    public String getRejectionReason() {
        return rejectionReason;
    }

    public void setRejectionReason(String rejectionReason) {
        this.rejectionReason = rejectionReason;
    }

    public byte[] getContent() {
        return content;
    }

    public void setContent(byte[] content) {
        this.content = content;
    }
}
