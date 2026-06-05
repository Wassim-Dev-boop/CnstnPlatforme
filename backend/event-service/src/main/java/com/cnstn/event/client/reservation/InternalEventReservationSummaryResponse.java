package com.cnstn.event.client.reservation;

import java.util.UUID;

public record InternalEventReservationSummaryResponse(
        UUID eventId,
        int totalReservations,
        int roomReservations,
        int equipmentReservations,
        int pendingSecurityCount,
        int approvedCount,
        int rejectedCount,
        boolean hasPhysicalReservation,
        boolean hasRoomReservation,
        boolean securityValidated,
        boolean securityApproved
) {
}
