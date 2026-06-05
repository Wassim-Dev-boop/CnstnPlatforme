package com.cnstn.event.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

@Entity
@Table(name = "events")
public class EventEntity {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "title", nullable = false, length = 150)
    private String title;

    @Column(name = "description", length = 2000)
    private String description;

    @Column(name = "start_at", nullable = false)
    private Instant startAt;

    @Column(name = "end_at", nullable = false)
    private Instant endAt;

    @Column(name = "location", length = 150)
    private String location;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false, length = 30)
    private EventType eventType = EventType.REUNION;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_mode", nullable = false, length = 20)
    private EventMode eventMode = EventMode.PRESENTIEL;

    @Column(name = "online_event", nullable = false)
    private Boolean onlineEvent = Boolean.FALSE;

    @Column(name = "online_meeting_provider", length = 60)
    private String onlineMeetingProvider;

    @Column(name = "online_meeting_link", length = 500)
    private String onlineMeetingLink;

    @Column(name = "online_meeting_id", length = 80)
    private String onlineMeetingId;

    @Column(name = "online_meeting_password", length = 120)
    private String onlineMeetingPassword;

    @Column(name = "meeting_room_id", length = 120)
    private String meetingRoomId;

    @Column(name = "requested_by", nullable = false, length = 120)
    private String requestedBy;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private EventStatus status = EventStatus.DRAFT;

    @Enumerated(EnumType.STRING)
    @Column(name = "workflow_step", nullable = false, length = 40)
    private EventWorkflowStep workflowStep = EventWorkflowStep.BROUILLON;

    @Column(name = "business_version", nullable = false)
    private int businessVersion = 1;

    @Column(name = "reference_code", nullable = false, length = 20, unique = true)
    private String referenceCode;

    @Column(name = "has_external_partners", nullable = false)
    private boolean hasExternalPartners;

    @Column(name = "submitted_by", length = 120)
    private String submittedBy;

    @Column(name = "submitted_at")
    private Instant submittedAt;

    @Column(name = "manager_decision_comment", length = 500)
    private String managerDecisionComment;

    @Column(name = "manager_decision_by", length = 120)
    private String managerDecisionBy;

    @Column(name = "manager_decision_at")
    private Instant managerDecisionAt;

    @Column(name = "security_decision_comment", length = 500)
    private String securityDecisionComment;

    @Column(name = "security_decision_by", length = 120)
    private String securityDecisionBy;

    @Column(name = "security_decision_at")
    private Instant securityDecisionAt;

    @Column(name = "dsn_decision_comment", length = 500)
    private String dsnDecisionComment;

    @Column(name = "dsn_decision_by", length = 120)
    private String dsnDecisionBy;

    @Column(name = "dsn_decision_at")
    private Instant dsnDecisionAt;

    @Column(name = "decision_comment", length = 500)
    private String decisionComment;

    @Column(name = "decided_by", length = 120)
    private String decidedBy;

    @Column(name = "rejection_reason", length = 500)
    private String rejectionReason;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @OneToMany(mappedBy = "event")
    private Set<PartnerInvitationEntity> partnerInvitations = new HashSet<>();

    @OneToMany(mappedBy = "event")
    private Set<EventInvitationEntity> invitations = new HashSet<>();

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

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public EventType getEventType() {
        return eventType;
    }

    public void setEventType(EventType eventType) {
        this.eventType = eventType;
    }

    public EventMode getEventMode() {
        return eventMode;
    }

    public void setEventMode(EventMode eventMode) {
        this.eventMode = eventMode;
    }

    public Boolean getOnlineEvent() {
        return onlineEvent;
    }

    public void setOnlineEvent(Boolean onlineEvent) {
        this.onlineEvent = onlineEvent;
    }

    public String getOnlineMeetingProvider() {
        return onlineMeetingProvider;
    }

    public void setOnlineMeetingProvider(String onlineMeetingProvider) {
        this.onlineMeetingProvider = onlineMeetingProvider;
    }

    public String getOnlineMeetingLink() {
        return onlineMeetingLink;
    }

    public void setOnlineMeetingLink(String onlineMeetingLink) {
        this.onlineMeetingLink = onlineMeetingLink;
    }

    public String getOnlineMeetingId() {
        return onlineMeetingId;
    }

    public void setOnlineMeetingId(String onlineMeetingId) {
        this.onlineMeetingId = onlineMeetingId;
    }

    public String getOnlineMeetingPassword() {
        return onlineMeetingPassword;
    }

    public void setOnlineMeetingPassword(String onlineMeetingPassword) {
        this.onlineMeetingPassword = onlineMeetingPassword;
    }

    public String getMeetingRoomId() {
        return meetingRoomId;
    }

    public void setMeetingRoomId(String meetingRoomId) {
        this.meetingRoomId = meetingRoomId;
    }

    public String getRequestedBy() {
        return requestedBy;
    }

    public void setRequestedBy(String requestedBy) {
        this.requestedBy = requestedBy;
    }

    public EventStatus getStatus() {
        return status;
    }

    public void setStatus(EventStatus status) {
        this.status = status;
    }

    public EventWorkflowStep getWorkflowStep() {
        return workflowStep;
    }

    public void setWorkflowStep(EventWorkflowStep workflowStep) {
        this.workflowStep = workflowStep;
    }

    public int getBusinessVersion() {
        return businessVersion;
    }

    public void setBusinessVersion(int businessVersion) {
        this.businessVersion = businessVersion;
    }

    public String getReferenceCode() {
        return referenceCode;
    }

    public void setReferenceCode(String referenceCode) {
        this.referenceCode = referenceCode;
    }

    public boolean isHasExternalPartners() {
        return hasExternalPartners;
    }

    public void setHasExternalPartners(boolean hasExternalPartners) {
        this.hasExternalPartners = hasExternalPartners;
    }

    public String getSubmittedBy() {
        return submittedBy;
    }

    public void setSubmittedBy(String submittedBy) {
        this.submittedBy = submittedBy;
    }

    public Instant getSubmittedAt() {
        return submittedAt;
    }

    public void setSubmittedAt(Instant submittedAt) {
        this.submittedAt = submittedAt;
    }

    public String getManagerDecisionComment() {
        return managerDecisionComment;
    }

    public void setManagerDecisionComment(String managerDecisionComment) {
        this.managerDecisionComment = managerDecisionComment;
    }

    public String getManagerDecisionBy() {
        return managerDecisionBy;
    }

    public void setManagerDecisionBy(String managerDecisionBy) {
        this.managerDecisionBy = managerDecisionBy;
    }

    public Instant getManagerDecisionAt() {
        return managerDecisionAt;
    }

    public void setManagerDecisionAt(Instant managerDecisionAt) {
        this.managerDecisionAt = managerDecisionAt;
    }

    public String getSecurityDecisionComment() {
        return securityDecisionComment;
    }

    public void setSecurityDecisionComment(String securityDecisionComment) {
        this.securityDecisionComment = securityDecisionComment;
    }

    public String getSecurityDecisionBy() {
        return securityDecisionBy;
    }

    public void setSecurityDecisionBy(String securityDecisionBy) {
        this.securityDecisionBy = securityDecisionBy;
    }

    public Instant getSecurityDecisionAt() {
        return securityDecisionAt;
    }

    public void setSecurityDecisionAt(Instant securityDecisionAt) {
        this.securityDecisionAt = securityDecisionAt;
    }

    public String getDsnDecisionComment() {
        return dsnDecisionComment;
    }

    public void setDsnDecisionComment(String dsnDecisionComment) {
        this.dsnDecisionComment = dsnDecisionComment;
    }

    public String getDsnDecisionBy() {
        return dsnDecisionBy;
    }

    public void setDsnDecisionBy(String dsnDecisionBy) {
        this.dsnDecisionBy = dsnDecisionBy;
    }

    public Instant getDsnDecisionAt() {
        return dsnDecisionAt;
    }

    public void setDsnDecisionAt(Instant dsnDecisionAt) {
        this.dsnDecisionAt = dsnDecisionAt;
    }

    public String getDecisionComment() {
        return decisionComment;
    }

    public void setDecisionComment(String decisionComment) {
        this.decisionComment = decisionComment;
    }

    public String getDecidedBy() {
        return decidedBy;
    }

    public void setDecidedBy(String decidedBy) {
        this.decidedBy = decidedBy;
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

    public Set<PartnerInvitationEntity> getPartnerInvitations() {
        return partnerInvitations;
    }

    public void setPartnerInvitations(Set<PartnerInvitationEntity> partnerInvitations) {
        this.partnerInvitations = partnerInvitations;
    }

    public Set<EventInvitationEntity> getInvitations() {
        return invitations;
    }

    public void setInvitations(Set<EventInvitationEntity> invitations) {
        this.invitations = invitations;
    }
}
