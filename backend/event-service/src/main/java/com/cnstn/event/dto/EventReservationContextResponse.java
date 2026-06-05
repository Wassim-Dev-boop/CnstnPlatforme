package com.cnstn.event.dto;

import com.cnstn.event.entity.EventMode;
import com.cnstn.event.entity.EventStatus;
import com.cnstn.event.entity.EventWorkflowStep;
import java.util.UUID;

public record EventReservationContextResponse(
        UUID eventId,
        EventMode eventMode,
        EventWorkflowStep workflowStep,
        EventStatus status,
        boolean reservationAllowed
) {
}
