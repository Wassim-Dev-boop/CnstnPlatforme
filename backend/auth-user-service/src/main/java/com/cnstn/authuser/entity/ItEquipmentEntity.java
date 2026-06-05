package com.cnstn.authuser.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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
@Table(name = "it_equipment")
public class ItEquipmentEntity {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "name", nullable = false, length = 200)
    private String name;

    @Column(name = "serial_number", nullable = false, unique = true, length = 120)
    private String serialNumber;

    @ManyToOne(optional = false)
    @JoinColumn(
        name = "category_id",
        nullable = false,
        foreignKey = @ForeignKey(name = "fk_it_equipment_category")
    )
    private ItEquipmentCategoryEntity category;

    @Column(name = "brand", length = 120)
    private String brand;

    @Column(name = "model", length = 120)
    private String model;

    @Enumerated(EnumType.STRING)
    @Column(name = "state", nullable = false, length = 32)
    private ItEquipmentState state = ItEquipmentState.OPERATIONAL;

    @Column(name = "assignment_status", nullable = false, length = 32)
    private String assignmentStatus = "NOT_ASSIGNED";

    @Column(name = "description", length = 1000)
    private String description;

    @Column(name = "current_employee_id", length = 36)
    private String currentEmployeeId;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public ItEquipmentEntity() {
    }

    public ItEquipmentEntity(String name, String serialNumber, ItEquipmentCategoryEntity category) {
        this.name = name;
        this.serialNumber = serialNumber;
        this.category = category;
        this.state = ItEquipmentState.OPERATIONAL;
        this.assignmentStatus = "NOT_ASSIGNED";
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getSerialNumber() {
        return serialNumber;
    }

    public void setSerialNumber(String serialNumber) {
        this.serialNumber = serialNumber;
    }

    public ItEquipmentCategoryEntity getCategory() {
        return category;
    }

    public void setCategory(ItEquipmentCategoryEntity category) {
        this.category = category;
    }

    public String getBrand() {
        return brand;
    }

    public void setBrand(String brand) {
        this.brand = brand;
    }

    public String getModel() {
        return model;
    }

    public void setModel(String model) {
        this.model = model;
    }

    public ItEquipmentState getState() {
        return state;
    }

    public void setState(ItEquipmentState state) {
        this.state = state;
    }

    public String getAssignmentStatus() {
        return assignmentStatus;
    }

    public void setAssignmentStatus(String assignmentStatus) {
        this.assignmentStatus = assignmentStatus;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getCurrentEmployeeId() {
        return currentEmployeeId;
    }

    public void setCurrentEmployeeId(String currentEmployeeId) {
        this.currentEmployeeId = currentEmployeeId;
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
