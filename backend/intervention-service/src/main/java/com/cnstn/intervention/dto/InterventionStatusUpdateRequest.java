package com.cnstn.intervention.dto;

import com.cnstn.intervention.entity.InterventionStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record InterventionStatusUpdateRequest(
        @NotNull InterventionStatus status,
        @Size(max = 120) String assignedTo,
        @Size(max = 2000) String resolution,
        Integer satisfactionRating
) {
}
