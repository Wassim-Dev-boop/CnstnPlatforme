package com.cnstn.reservation.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record SecurityValidationRequest(
        @NotNull Boolean approved,
        @Size(max = 500) String decisionComment
) {
}
