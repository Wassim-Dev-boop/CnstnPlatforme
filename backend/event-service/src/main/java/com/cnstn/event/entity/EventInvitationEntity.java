package com.cnstn.event.entity;

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
@Table(name = "event_invitations")
public class EventInvitationEntity {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "event_id", nullable = false)
    private EventEntity event;

    @Column(name = "invited_username", nullable = false, length = 120)
    private String invitedUsername;

    @Column(name = "invited_email", nullable = false, length = 190)
    private String invitedEmail;

    @Column(name = "invited_display_name", nullable = false, length = 150)
    private String invitedDisplayName;

    @Column(name = "invited_by_username", nullable = false, length = 120)
    private String invitedByUsername;

    @Column(name = "invited_by_display_name", nullable = false, length = 150)
    private String invitedByDisplayName;

    @Column(name = "message", length = 1000)
    private String message;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private EventInvitationStatus status = EventInvitationStatus.PENDING;

    @Column(name = "response_reason", length = 500)
    private String responseReason;

    @Column(name = "responded_at")
    private Instant respondedAt;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

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

    public EventEntity getEvent() {
        return event;
    }

    public void setEvent(EventEntity event) {
        this.event = event;
    }

    public String getInvitedUsername() {
        return invitedUsername;
    }

    public void setInvitedUsername(String invitedUsername) {
        this.invitedUsername = invitedUsername;
    }

    public String getInvitedEmail() {
        return invitedEmail;
    }

    public void setInvitedEmail(String invitedEmail) {
        this.invitedEmail = invitedEmail;
    }

    public String getInvitedDisplayName() {
        return invitedDisplayName;
    }

    public void setInvitedDisplayName(String invitedDisplayName) {
        this.invitedDisplayName = invitedDisplayName;
    }

    public String getInvitedByUsername() {
        return invitedByUsername;
    }

    public void setInvitedByUsername(String invitedByUsername) {
        this.invitedByUsername = invitedByUsername;
    }

    public String getInvitedByDisplayName() {
        return invitedByDisplayName;
    }

    public void setInvitedByDisplayName(String invitedByDisplayName) {
        this.invitedByDisplayName = invitedByDisplayName;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public EventInvitationStatus getStatus() {
        return status;
    }

    public void setStatus(EventInvitationStatus status) {
        this.status = status;
    }

    public String getResponseReason() {
        return responseReason;
    }

    public void setResponseReason(String responseReason) {
        this.responseReason = responseReason;
    }

    public Instant getRespondedAt() {
        return respondedAt;
    }

    public void setRespondedAt(Instant respondedAt) {
        this.respondedAt = respondedAt;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(Instant expiresAt) {
        this.expiresAt = expiresAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}

