package com.cnstn.authuser.dto;

import java.util.List;

public record WorkflowCatalogResponse(
        List<WorkflowStepTemplateResponse> stepTemplates,
        List<WorkflowOptionResponse> roles,
        List<WorkflowOptionResponse> conditions,
        List<WorkflowOptionResponse> actions
) {
}
