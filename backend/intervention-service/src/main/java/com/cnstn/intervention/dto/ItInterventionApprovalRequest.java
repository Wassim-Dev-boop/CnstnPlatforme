package com.cnstn.intervention.dto;

import jakarta.validation.constraints.NotNull;

public record ItInterventionApprovalRequest(
    @NotNull(message = "Approval decision is required")
    Boolean approved,
    
    String note
) {
}
