package com.cnstn.notification.entity;

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
@Table(name = "notifications")
public class NotificationEntity {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "recipient_username", nullable = false, length = 120)
    private String recipientUsername;

    @Column(name = "title", nullable = false, length = 180)
    private String title;

    @Column(name = "message", nullable = false, length = 2000)
    private String message;

    @Column(name = "read_flag", nullable = false)
    private boolean readFlag = false;

    @Enumerated(EnumType.STRING)
    @Column(name = "email_delivery_status", length = 20)
    private EmailDeliveryStatus emailDeliveryStatus;

    @Column(name = "email_last_attempt_at")
    private Instant emailLastAttemptAt;

    @Column(name = "email_last_error", length = 1200)
    private String emailLastError;

    @Column(name = "action_url", length = 500)
    private String actionUrl;

    @Enumerated(EnumType.STRING)
    @Column(name = "priority", length = 20, nullable = false)
    private NotificationPriority priority = NotificationPriority.NORMAL;

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

    public String getRecipientUsername() {
        return recipientUsername;
    }

    public void setRecipientUsername(String recipientUsername) {
        this.recipientUsername = recipientUsername;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public boolean isReadFlag() {
        return readFlag;
    }

    public void setReadFlag(boolean readFlag) {
        this.readFlag = readFlag;
    }

    public EmailDeliveryStatus getEmailDeliveryStatus() {
        return emailDeliveryStatus;
    }

    public void setEmailDeliveryStatus(EmailDeliveryStatus emailDeliveryStatus) {
        this.emailDeliveryStatus = emailDeliveryStatus;
    }

    public Instant getEmailLastAttemptAt() {
        return emailLastAttemptAt;
    }

    public void setEmailLastAttemptAt(Instant emailLastAttemptAt) {
        this.emailLastAttemptAt = emailLastAttemptAt;
    }

    public String getEmailLastError() {
        return emailLastError;
    }

    public void setEmailLastError(String emailLastError) {
        this.emailLastError = emailLastError;
    }

    public String getActionUrl() {
        return actionUrl;
    }

    public void setActionUrl(String actionUrl) {
        this.actionUrl = actionUrl;
    }

    public NotificationPriority getPriority() {
        return priority;
    }

    public void setPriority(NotificationPriority priority) {
        this.priority = priority;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
