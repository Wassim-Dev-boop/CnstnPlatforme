package com.cnstn.reservation.dto;

import com.cnstn.reservation.entity.RoomOperationalStatus;
import java.time.Instant;
import java.util.UUID;

public record RoomResponse(
        UUID id,
        String name,
        String location,
        String description,
        String imageUrl,
        int capacity,
        RoomOperationalStatus status,
        boolean active,
        Instant createdAt,
        Instant updatedAt
) {
}
