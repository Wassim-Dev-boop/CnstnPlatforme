package com.cnstn.authuser.entity;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

@Entity
@Table(name = "workflow_steps")
public class WorkflowStepEntity {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "workflow_id", nullable = false)
    private WorkflowDefinitionEntity workflow;

    @Enumerated(EnumType.STRING)
    @Column(name = "step_code", nullable = false, length = 80)
    private WorkflowStepCode stepCode;

    @Column(name = "step_name", nullable = false, length = 160)
    private String stepName;

    @Column(name = "step_order", nullable = false)
    private int stepOrder;

    @Enumerated(EnumType.STRING)
    @Column(name = "responsible_role", nullable = false, length = 64)
    private RoleName responsibleRole;

    @Column(name = "required", nullable = false)
    private boolean required = false;

    @Column(name = "refusal_reason_required", nullable = false)
    private boolean refusalReasonRequired = false;

    @Column(name = "active", nullable = false)
    private boolean active = true;

    @Column(name = "critical", nullable = false)
    private boolean critical = false;

    @Enumerated(EnumType.STRING)
    @Column(name = "condition_type", nullable = false, length = 64)
    private WorkflowConditionType conditionType = WorkflowConditionType.TOUJOURS;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "workflow_step_actions", joinColumns = @JoinColumn(name = "step_id"))
    @Column(name = "action_type", nullable = false, length = 64)
    @Enumerated(EnumType.STRING)
    private Set<WorkflowActionType> allowedActions = new HashSet<>();

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

    public WorkflowDefinitionEntity getWorkflow() {
        return workflow;
    }

    public void setWorkflow(WorkflowDefinitionEntity workflow) {
        this.workflow = workflow;
    }

    public WorkflowStepCode getStepCode() {
        return stepCode;
    }

    public void setStepCode(WorkflowStepCode stepCode) {
        this.stepCode = stepCode;
    }

    public String getStepName() {
        return stepName;
    }

    public void setStepName(String stepName) {
        this.stepName = stepName;
    }

    public int getStepOrder() {
        return stepOrder;
    }

    public void setStepOrder(int stepOrder) {
        this.stepOrder = stepOrder;
    }

    public RoleName getResponsibleRole() {
        return responsibleRole;
    }

    public void setResponsibleRole(RoleName responsibleRole) {
        this.responsibleRole = responsibleRole;
    }

    public boolean isRequired() {
        return required;
    }

    public void setRequired(boolean required) {
        this.required = required;
    }

    public boolean isRefusalReasonRequired() {
        return refusalReasonRequired;
    }

    public void setRefusalReasonRequired(boolean refusalReasonRequired) {
        this.refusalReasonRequired = refusalReasonRequired;
    }

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }

    public boolean isCritical() {
        return critical;
    }

    public void setCritical(boolean critical) {
        this.critical = critical;
    }

    public WorkflowConditionType getConditionType() {
        return conditionType;
    }

    public void setConditionType(WorkflowConditionType conditionType) {
        this.conditionType = conditionType;
    }

    public Set<WorkflowActionType> getAllowedActions() {
        return allowedActions;
    }

    public void setAllowedActions(Set<WorkflowActionType> allowedActions) {
        this.allowedActions = allowedActions;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
