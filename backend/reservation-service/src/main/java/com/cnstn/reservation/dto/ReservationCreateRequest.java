package com.cnstn.reservation.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.UUID;

public record ReservationCreateRequest(
        UUID eventId,
        UUID roomId,
        UUID equipmentId,
        @Min(1) Integer quantityRequested,
        @NotNull @Future Instant startAt,
        @NotNull @Future Instant endAt,
        @Size(max = 500) String purpose
) {
}
