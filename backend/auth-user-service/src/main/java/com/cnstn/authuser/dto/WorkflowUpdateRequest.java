package com.cnstn.authuser.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import java.util.List;

public record WorkflowUpdateRequest(
        @Size(max = 500) String description,
        Boolean active,
        @NotEmpty @Valid List<WorkflowStepUpsertRequest> steps,
        Boolean confirmCriticalChange
) {
}
