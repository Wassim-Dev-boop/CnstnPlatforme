package com.cnstn.intervention.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record InterventionValidationRequest(
        @NotNull Boolean approved,
        @Size(max = 500) String note
) {
}
