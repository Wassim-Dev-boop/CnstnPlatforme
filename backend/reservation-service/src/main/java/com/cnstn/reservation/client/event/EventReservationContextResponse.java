package com.cnstn.reservation.client.event;

import com.cnstn.reservation.entity.EventMode;
import java.util.UUID;

public record EventReservationContextResponse(
        UUID eventId,
        EventMode eventMode,
        String workflowStep,
        String status,
        boolean reservationAllowed
) {
}
