package com.cnstn.reservation.dto;

import java.util.UUID;

public record EventReservationSummaryResponse(
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
