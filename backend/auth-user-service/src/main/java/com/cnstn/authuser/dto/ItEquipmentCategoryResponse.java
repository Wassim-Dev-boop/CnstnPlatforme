package com.cnstn.authuser.dto;

import java.time.Instant;
import java.util.UUID;

public record ItEquipmentCategoryResponse(
    UUID id,
    String name,
    String description,
    Boolean active,
    Instant createdAt,
    Instant updatedAt
) {
}
