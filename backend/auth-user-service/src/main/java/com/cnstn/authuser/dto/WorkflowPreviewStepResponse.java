package com.cnstn.authuser.dto;

import java.util.UUID;

public record WorkflowPreviewStepResponse(
        UUID stepId,
        String stepCode,
        String stepLabel,
        int stepOrder,
        String responsibleRoleLabel,
        String conditionLabel
) {
}
