package com.cnstn.authuser.entity;

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
@Table(name = "workflow_audit_logs")
public class WorkflowAuditLogEntity {

    @Id
    @GeneratedValue
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(name = "workflow_type", nullable = false, length = 64)
    private WorkflowType workflowType;

    @Enumerated(EnumType.STRING)
    @Column(name = "action_type", nullable = false, length = 64)
    private WorkflowAuditActionType actionType;

    @Column(name = "actor_username", nullable = false, length = 120)
    private String actorUsername;

    @Column(name = "old_config")
    private String oldConfig;

    @Column(name = "new_config")
    private String newConfig;

    @Column(name = "comment", length = 500)
    private String comment;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public WorkflowType getWorkflowType() {
        return workflowType;
    }

    public void setWorkflowType(WorkflowType workflowType) {
        this.workflowType = workflowType;
    }

    public WorkflowAuditActionType getActionType() {
        return actionType;
    }

    public void setActionType(WorkflowAuditActionType actionType) {
        this.actionType = actionType;
    }

    public String getActorUsername() {
        return actorUsername;
    }

    public void setActorUsername(String actorUsername) {
        this.actorUsername = actorUsername;
    }

    public String getOldConfig() {
        return oldConfig;
    }

    public void setOldConfig(String oldConfig) {
        this.oldConfig = oldConfig;
    }

    public String getNewConfig() {
        return newConfig;
    }

    public void setNewConfig(String newConfig) {
        this.newConfig = newConfig;
    }

    public String getComment() {
        return comment;
    }

    public void setComment(String comment) {
        this.comment = comment;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
