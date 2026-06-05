package com.cnstn.authuser.dto;

import java.time.Instant;
import java.util.UUID;

public record InternalItEquipmentSummaryResponse(
    UUID equipmentId,
    String equipmentName,
    String serialNumber,
    String categoryName,
    String employeeId,
    String employeeName,
    String state,
    String assignmentStatus,
    Instant assignedAt
) {
}
