package com.cnstn.authuser.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.ForeignKey;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

@Entity
@Table(name = "it_equipment_assignments")
public class ItEquipmentAssignmentEntity {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(optional = false)
    @JoinColumn(
        name = "equipment_id",
        nullable = false,
        foreignKey = @ForeignKey(name = "fk_assignment_equipment")
    )
    private ItEquipmentEntity equipment;

    @Column(name = "employee_id", nullable = false, length = 36)
    private String employeeId;

    @Column(name = "employee_name", length = 240)
    private String employeeName;

    @Column(name = "assigned_at", nullable = false)
    private Instant assignedAt;

    @Column(name = "returned_at")
    private Instant returnedAt;

    @Column(name = "assigned_by", length = 120)
    private String assignedBy;

    @Column(name = "status", nullable = false, length = 32)
    private String status = "ACTIVE";

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public ItEquipmentAssignmentEntity() {
    }

    public ItEquipmentAssignmentEntity(
        ItEquipmentEntity equipment,
        String employeeId,
        String employeeName,
        String assignedBy
    ) {
        this.equipment = equipment;
        this.employeeId = employeeId;
        this.employeeName = employeeName;
        this.assignedBy = assignedBy;
        this.assignedAt = Instant.now();
        this.status = "ACTIVE";
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public ItEquipmentEntity getEquipment() {
        return equipment;
    }

    public void setEquipment(ItEquipmentEntity equipment) {
        this.equipment = equipment;
    }

    public String getEmployeeId() {
        return employeeId;
    }

    public void setEmployeeId(String employeeId) {
        this.employeeId = employeeId;
    }

    public String getEmployeeName() {
        return employeeName;
    }

    public void setEmployeeName(String employeeName) {
        this.employeeName = employeeName;
    }

    public Instant getAssignedAt() {
        return assignedAt;
    }

    public void setAssignedAt(Instant assignedAt) {
        this.assignedAt = assignedAt;
    }

    public Instant getReturnedAt() {
        return returnedAt;
    }

    public void setReturnedAt(Instant returnedAt) {
        this.returnedAt = returnedAt;
    }

    public String getAssignedBy() {
        return assignedBy;
    }

    public void setAssignedBy(String assignedBy) {
        this.assignedBy = assignedBy;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}
