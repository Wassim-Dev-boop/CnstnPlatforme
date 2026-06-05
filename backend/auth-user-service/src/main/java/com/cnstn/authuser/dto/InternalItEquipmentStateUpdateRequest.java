package com.cnstn.authuser.dto;

import jakarta.validation.constraints.NotBlank;

public record InternalItEquipmentStateUpdateRequest(
    @NotBlank(message = "State is required")
    String state
) {
}
