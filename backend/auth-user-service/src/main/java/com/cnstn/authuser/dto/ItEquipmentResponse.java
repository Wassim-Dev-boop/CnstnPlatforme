package com.cnstn.authuser.dto;

import java.time.Instant;
import java.util.UUID;

public record ItEquipmentResponse(
    UUID id,
    UUID categoryId,
    String name,
    String serialNumber,
    String categoryName,
    String brand,
    String model,
    String state,
    String assignmentStatus,
    String description,
    String currentEmployeeId,
    String currentEmployeeName,
    Instant assignedAt,
    Instant createdAt,
    Instant updatedAt
) {
}
