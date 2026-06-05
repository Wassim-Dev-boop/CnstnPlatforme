package com.cnstn.authuser.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record ItEquipmentCreateRequest(
    @NotBlank(message = "Name is required")
    String name,
    
    @NotBlank(message = "Serial number is required")
    String serialNumber,
    
    @NotNull(message = "Category ID is required")
    UUID categoryId,
    
    String brand,
    
    String model,

    @NotBlank(message = "State is required")
    String state,
    
    String description
) {
}
