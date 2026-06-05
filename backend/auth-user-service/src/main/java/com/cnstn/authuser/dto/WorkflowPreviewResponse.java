package com.cnstn.authuser.dto;

import java.util.List;

public record WorkflowPreviewResponse(
        String workflowLabel,
        String scenarioLabel,
        String previewPath,
        List<WorkflowPreviewStepResponse> selectedSteps
) {
}
