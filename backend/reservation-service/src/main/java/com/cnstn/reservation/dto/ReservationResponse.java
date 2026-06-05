package com.cnstn.reservation.dto;

import com.cnstn.reservation.entity.EventMode;
import com.cnstn.reservation.entity.ReservationStatus;
import java.time.Instant;
import java.util.UUID;

public record ReservationResponse(
        UUID id,
        UUID eventId,
        EventMode eventMode,
        String referenceCode,
        int businessVersion,
        UUID roomId,
        UUID equipmentId,
        int quantityRequested,
        String requesterUsername,
        Instant startAt,
        Instant endAt,
        String purpose,
        ReservationStatus status,
        boolean securityConflict,
        String securityCheckedBy,
        Instant securityCheckedAt,
        String securityDecisionComment,
        String rejectionReason,
        Instant createdAt,
        Instant updatedAt
) {
}
