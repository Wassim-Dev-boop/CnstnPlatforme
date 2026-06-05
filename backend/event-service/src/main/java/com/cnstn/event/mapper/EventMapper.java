package com.cnstn.event.mapper;

import com.cnstn.event.dto.EventResponse;
import com.cnstn.event.dto.EventInvitationResponse;
import com.cnstn.event.dto.PartnerInviteResponse;
import com.cnstn.event.entity.EventEntity;
import com.cnstn.event.entity.EventInvitationEntity;
import com.cnstn.event.entity.PartnerInvitationEntity;

public final class EventMapper {

    private EventMapper() {
    }

    public static EventResponse toResponse(EventEntity entity) {
        return new EventResponse(
                entity.getId(),
                entity.getTitle(),
                entity.getDescription(),
                entity.getStartAt(),
                entity.getEndAt(),
                entity.getLocation(),
                entity.getEventType(),
                entity.getEventMode(),
                entity.getOnlineEvent(),
                entity.getOnlineMeetingProvider(),
                entity.getOnlineMeetingLink(),
                entity.getOnlineMeetingId(),
                entity.getOnlineMeetingPassword(),
                entity.getMeetingRoomId(),
                entity.getRequestedBy(),
                entity.getStatus(),
                entity.getWorkflowStep(),
                entity.getBusinessVersion(),
                entity.getReferenceCode(),
                entity.getDecisionComment(),
                entity.getDecidedBy(),
                entity.getRejectionReason(),
                entity.isHasExternalPartners(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }

    public static PartnerInviteResponse toResponse(PartnerInvitationEntity entity) {
        return new PartnerInviteResponse(
                entity.getId(),
                entity.getEvent().getId(),
                entity.getPartnerName(),
                entity.getPartnerEmail(),
                entity.isAccessApproved(),
                entity.getCreatedAt()
        );
    }

    public static EventInvitationResponse toResponse(EventInvitationEntity entity) {
        EventEntity event = entity.getEvent();
        return new EventInvitationResponse(
                entity.getId(),
                event.getId(),
                event.getTitle(),
                event.getStartAt(),
                event.getEndAt(),
                event.getEventMode(),
                event.getLocation(),
                event.getOnlineMeetingLink(),
                entity.getInvitedUsername(),
                entity.getInvitedEmail(),
                entity.getInvitedDisplayName(),
                entity.getInvitedByUsername(),
                entity.getInvitedByDisplayName(),
                entity.getStatus(),
                entity.getMessage(),
                entity.getResponseReason(),
                entity.getRespondedAt(),
                entity.getExpiresAt(),
                entity.getCreatedAt()
        );
    }
}
