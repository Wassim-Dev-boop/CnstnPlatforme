package com.cnstn.intervention.entity;

import com.cnstn.intervention.entity.converter.UuidStringAttributeConverter;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
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
@Table(name = "interventions")
public class InterventionEntity {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "title", nullable = false, length = 150)
    private String title;

    @Column(name = "description", length = 2000)
    private String description;

    @Column(name = "intervention_type", length = 40)
    private String interventionType;

    @Column(name = "priority", length = 20)
    private String priority;

    @Column(name = "location", length = 200)
    private String location;

    @Column(name = "requested_by", nullable = false, length = 120)
    private String requestedBy;

    @Column(name = "assigned_to", length = 120)
    private String assignedTo;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private InterventionStatus status = InterventionStatus.REQUESTED;

    @Column(name = "validation_note", length = 500)
    private String validationNote;

    @Column(name = "validated_by", length = 120)
    private String validatedBy;

    @Column(name = "resolution", length = 2000)
    private String resolution;

    @Column(name = "satisfaction_rating")
    private Integer satisfactionRating;

    @Column(name = "resolved_at")
    private Instant resolvedAt;

    // IT Workflow fields
    @Column(name = "equipment_id")
    @Convert(converter = UuidStringAttributeConverter.class)
    private UUID equipmentId;

    @Column(name = "it_priority", length = 32)
    private String itPriority;

    @Enumerated(EnumType.STRING)
    @Column(name = "it_workflow_status", length = 64)
    private ItWorkflowStatus itWorkflowStatus;

    @Column(name = "manager_approved")
    private Boolean managerApproved = false;

    @Column(name = "manager_approved_at")
    private Instant managerApprovedAt;

    @Column(name = "manager_approval_note", length = 1000)
    private String managerApprovalNote;

    @Column(name = "manager_id", length = 120)
    private String managerId;

    @Column(name = "dsn_approved")
    private Boolean dsnApproved = false;

    @Column(name = "dsn_approved_at")
    private Instant dsnApprovedAt;

    @Column(name = "dsn_approval_note", length = 1000)
    private String dsnApprovalNote;

    @Column(name = "dsn_id", length = 120)
    private String dsnId;

    @Column(name = "it_responsible_id", length = 120)
    private String itResponsibleId;

    @Column(name = "it_processing_started_at")
    private Instant itProcessingStartedAt;

    @Column(name = "it_diagnostic_comment", length = 2000)
    private String itDiagnosticComment;

    @Column(name = "is_it_workflow")
    private Boolean isItWorkflow = false;

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

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getInterventionType() {
        return interventionType;
    }

    public void setInterventionType(String interventionType) {
        this.interventionType = interventionType;
    }

    public String getPriority() {
        return priority;
    }

    public void setPriority(String priority) {
        this.priority = priority;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public String getRequestedBy() {
        return requestedBy;
    }

    public void setRequestedBy(String requestedBy) {
        this.requestedBy = requestedBy;
    }

    public String getAssignedTo() {
        return assignedTo;
    }

    public void setAssignedTo(String assignedTo) {
        this.assignedTo = assignedTo;
    }

    public InterventionStatus getStatus() {
        return status;
    }

    public void setStatus(InterventionStatus status) {
        this.status = status;
    }

    public String getValidationNote() {
        return validationNote;
    }

    public void setValidationNote(String validationNote) {
        this.validationNote = validationNote;
    }

    public String getValidatedBy() {
        return validatedBy;
    }

    public void setValidatedBy(String validatedBy) {
        this.validatedBy = validatedBy;
    }

    public String getResolution() {
        return resolution;
    }

    public void setResolution(String resolution) {
        this.resolution = resolution;
    }

    public Integer getSatisfactionRating() {
        return satisfactionRating;
    }

    public void setSatisfactionRating(Integer satisfactionRating) {
        this.satisfactionRating = satisfactionRating;
    }

    public Instant getResolvedAt() {
        return resolvedAt;
    }

    public void setResolvedAt(Instant resolvedAt) {
        this.resolvedAt = resolvedAt;
    }

    public UUID getEquipmentId() {
        return equipmentId;
    }

    public void setEquipmentId(UUID equipmentId) {
        this.equipmentId = equipmentId;
    }

    public String getItPriority() {
        return itPriority;
    }

    public void setItPriority(String itPriority) {
        this.itPriority = itPriority;
    }

    public ItWorkflowStatus getItWorkflowStatus() {
        return itWorkflowStatus;
    }

    public void setItWorkflowStatus(ItWorkflowStatus itWorkflowStatus) {
        this.itWorkflowStatus = itWorkflowStatus;
    }

    public Boolean getManagerApproved() {
        return managerApproved;
    }

    public void setManagerApproved(Boolean managerApproved) {
        this.managerApproved = managerApproved;
    }

    public Instant getManagerApprovedAt() {
        return managerApprovedAt;
    }

    public void setManagerApprovedAt(Instant managerApprovedAt) {
        this.managerApprovedAt = managerApprovedAt;
    }

    public String getManagerApprovalNote() {
        return managerApprovalNote;
    }

    public void setManagerApprovalNote(String managerApprovalNote) {
        this.managerApprovalNote = managerApprovalNote;
    }

    public String getManagerId() {
        return managerId;
    }

    public void setManagerId(String managerId) {
        this.managerId = managerId;
    }

    public Boolean getDsnApproved() {
        return dsnApproved;
    }

    public void setDsnApproved(Boolean dsnApproved) {
        this.dsnApproved = dsnApproved;
    }

    public Instant getDsnApprovedAt() {
        return dsnApprovedAt;
    }

    public void setDsnApprovedAt(Instant dsnApprovedAt) {
        this.dsnApprovedAt = dsnApprovedAt;
    }

    public String getDsnApprovalNote() {
        return dsnApprovalNote;
    }

    public void setDsnApprovalNote(String dsnApprovalNote) {
        this.dsnApprovalNote = dsnApprovalNote;
    }

    public String getDsnId() {
        return dsnId;
    }

    public void setDsnId(String dsnId) {
        this.dsnId = dsnId;
    }

    public String getItResponsibleId() {
        return itResponsibleId;
    }

    public void setItResponsibleId(String itResponsibleId) {
        this.itResponsibleId = itResponsibleId;
    }

    public Instant getItProcessingStartedAt() {
        return itProcessingStartedAt;
    }

    public void setItProcessingStartedAt(Instant itProcessingStartedAt) {
        this.itProcessingStartedAt = itProcessingStartedAt;
    }

    public String getItDiagnosticComment() {
        return itDiagnosticComment;
    }

    public void setItDiagnosticComment(String itDiagnosticComment) {
        this.itDiagnosticComment = itDiagnosticComment;
    }

    public Boolean getIsItWorkflow() {
        return isItWorkflow;
    }

    public void setIsItWorkflow(Boolean isItWorkflow) {
        this.isItWorkflow = isItWorkflow;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
