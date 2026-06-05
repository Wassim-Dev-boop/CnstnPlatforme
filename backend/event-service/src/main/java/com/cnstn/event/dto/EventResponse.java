package com.cnstn.event.dto;

import com.cnstn.event.entity.EventMode;
import com.cnstn.event.entity.EventStatus;
import com.cnstn.event.entity.EventType;
import com.cnstn.event.entity.EventWorkflowStep;
import java.time.Instant;
import java.util.UUID;

public record EventResponse(
        UUID id,
        String title,
        String description,
        Instant startAt,
        Instant endAt,
        String location,
        EventType eventType,
        EventMode eventMode,
        Boolean onlineEvent,
        String onlineMeetingProvider,
        String onlineMeetingLink,
        String onlineMeetingId,
        String onlineMeetingPassword,
        String meetingRoomId,
        String requestedBy,
        EventStatus status,
        EventWorkflowStep workflowStep,
        int businessVersion,
        String referenceCode,
        String decisionComment,
        String decidedBy,
        String rejectionReason,
        boolean hasExternalPartners,
        Instant createdAt,
        Instant updatedAt
) {
}
