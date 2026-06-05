package com.cnstn.event.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record EventDecisionRequest(
        @NotNull Boolean approved,
        @Size(max = 500) String decisionComment,
        @Size(max = 500) String rejectionReason
) {
}
