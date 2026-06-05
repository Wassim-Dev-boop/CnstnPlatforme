package com.cnstn.authuser.dto;

import java.time.Instant;
import java.util.UUID;

public record ItEquipmentAssignmentResponse(
    UUID id,
    UUID equipmentId,
    String equipmentName,
    String equipmentSerialNumber,
    String equipmentCategoryName,
    String employeeId,
    String employeeName,
    String status,
    Instant assignedAt,
    Instant returnedAt,
    String assignedBy,
    Instant createdAt,
    Instant updatedAt
) {
}
