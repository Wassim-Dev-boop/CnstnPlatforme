package com.cnstn.intervention.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record ItInterventionCreateRequest(
    @NotBlank(message = "Title is required")
    String title,
    
    @NotBlank(message = "Description is required")
    String description,
    
    @NotNull(message = "Equipment ID is required")
    UUID equipmentId,
    
    @NotBlank(message = "Priority is required")
    String priority
) {
}
