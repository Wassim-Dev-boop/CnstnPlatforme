package com.cnstn.reservation.dto;

import com.cnstn.reservation.entity.EquipmentOperationalStatus;
import java.time.Instant;
import java.util.UUID;

public record EquipmentResponse(
        UUID id,
        String name,
        String serialNumber,
        String description,
        String type,
        String location,
        int totalQuantity,
        int availableQuantity,
        EquipmentOperationalStatus status,
        boolean active,
        Instant createdAt,
        Instant updatedAt
) {
}
