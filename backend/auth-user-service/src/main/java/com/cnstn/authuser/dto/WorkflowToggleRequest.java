package com.cnstn.authuser.dto;

import jakarta.validation.constraints.NotNull;

public record WorkflowToggleRequest(
        @NotNull Boolean active,
        Boolean confirmCriticalChange
) {
}
