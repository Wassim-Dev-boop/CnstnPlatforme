package com.cnstn.reservation.entity;

import jakarta.persistence.Column;
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
import java.util.UUID;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

@Entity
@Table(name = "reservations")
public class ReservationEntity {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "event_id")
    private UUID eventId;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_mode", nullable = false, length = 20)
    private EventMode eventMode;

    @Column(name = "reference_code", nullable = false, length = 20, unique = true)
    private String referenceCode;

    @Column(name = "business_version", nullable = false)
    private int businessVersion = 1;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_id")
    private RoomEntity room;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "equipment_id")
    private EquipmentEntity equipment;

    @Column(name = "quantity_requested", nullable = false)
    private int quantityRequested = 1;

    @Column(name = "requester_username", nullable = false, length = 120)
    private String requesterUsername;

    @Column(name = "start_at", nullable = false)
    private Instant startAt;

    @Column(name = "end_at", nullable = false)
    private Instant endAt;

    @Column(name = "purpose", length = 500)
    private String purpose;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private ReservationStatus status = ReservationStatus.PENDING;

    @Column(name = "security_conflict", nullable = false)
    private boolean securityConflict;

    @Column(name = "security_checked_by", length = 120)
    private String securityCheckedBy;

    @Column(name = "security_checked_at")
    private Instant securityCheckedAt;

    @Column(name = "security_decision_comment", length = 500)
    private String securityDecisionComment;

    @Column(name = "rejection_reason", length = 500)
    private String rejectionReason;

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

    public UUID getEventId() {
        return eventId;
    }

    public void setEventId(UUID eventId) {
        this.eventId = eventId;
    }

    public EventMode getEventMode() {
        return eventMode;
    }

    public void setEventMode(EventMode eventMode) {
        this.eventMode = eventMode;
    }

    public String getReferenceCode() {
        return referenceCode;
    }

    public void setReferenceCode(String referenceCode) {
        this.referenceCode = referenceCode;
    }

    public int getBusinessVersion() {
        return businessVersion;
    }

    public void setBusinessVersion(int businessVersion) {
        this.businessVersion = businessVersion;
    }

    public RoomEntity getRoom() {
        return room;
    }

    public void setRoom(RoomEntity room) {
        this.room = room;
    }

    public EquipmentEntity getEquipment() {
        return equipment;
    }

    public void setEquipment(EquipmentEntity equipment) {
        this.equipment = equipment;
    }

    public int getQuantityRequested() {
        return quantityRequested;
    }

    public void setQuantityRequested(int quantityRequested) {
        this.quantityRequested = quantityRequested;
    }

    public String getRequesterUsername() {
        return requesterUsername;
    }

    public void setRequesterUsername(String requesterUsername) {
        this.requesterUsername = requesterUsername;
    }

    public Instant getStartAt() {
        return startAt;
    }

    public void setStartAt(Instant startAt) {
        this.startAt = startAt;
    }

    public Instant getEndAt() {
        return endAt;
    }

    public void setEndAt(Instant endAt) {
        this.endAt = endAt;
    }

    public String getPurpose() {
        return purpose;
    }

    public void setPurpose(String purpose) {
        this.purpose = purpose;
    }

    public ReservationStatus getStatus() {
        return status;
    }

    public void setStatus(ReservationStatus status) {
        this.status = status;
    }

    public boolean isSecurityConflict() {
        return securityConflict;
    }

    public void setSecurityConflict(boolean securityConflict) {
        this.securityConflict = securityConflict;
    }

    public String getSecurityCheckedBy() {
        return securityCheckedBy;
    }

    public void setSecurityCheckedBy(String securityCheckedBy) {
        this.securityCheckedBy = securityCheckedBy;
    }

    public Instant getSecurityCheckedAt() {
        return securityCheckedAt;
    }

    public void setSecurityCheckedAt(Instant securityCheckedAt) {
        this.securityCheckedAt = securityCheckedAt;
    }

    public String getSecurityDecisionComment() {
        return securityDecisionComment;
    }

    public void setSecurityDecisionComment(String securityDecisionComment) {
        this.securityDecisionComment = securityDecisionComment;
    }

    public String getRejectionReason() {
        return rejectionReason;
    }

    public void setRejectionReason(String rejectionReason) {
        this.rejectionReason = rejectionReason;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
