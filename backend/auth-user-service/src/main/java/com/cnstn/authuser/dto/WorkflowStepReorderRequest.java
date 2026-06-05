package com.cnstn.authuser.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;

public record WorkflowStepReorderRequest(
        @NotEmpty List<@NotNull UUID> stepIds,
        @Size(max = 500) String comment
) {
}
