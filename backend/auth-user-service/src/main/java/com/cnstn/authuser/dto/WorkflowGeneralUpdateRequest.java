package com.cnstn.authuser.dto;

import jakarta.validation.constraints.Size;

public record WorkflowGeneralUpdateRequest(
        @Size(min = 3, max = 160) String workflowLabel,
        @Size(max = 500) String description,
        Boolean active,
        @Size(max = 500) String comment
) {
}
