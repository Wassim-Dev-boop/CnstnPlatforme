package com.cnstn.authuser.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record ItEquipmentAssignmentCreateRequest(
    @NotNull(message = "Equipment ID is required")
    UUID equipmentId,
    
    @NotBlank(message = "Employee ID is required")
    String employeeId
) {
}
