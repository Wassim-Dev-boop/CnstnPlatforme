package com.cnstn.reservation.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record EventSecurityValidationRequest(
        @NotNull Boolean approved,
        @Size(max = 500) String decisionComment,
        @Size(max = 500) String decidedBy
) {
}
