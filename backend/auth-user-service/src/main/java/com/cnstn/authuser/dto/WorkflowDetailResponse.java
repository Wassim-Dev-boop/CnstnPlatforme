package com.cnstn.authuser.dto;

import com.cnstn.authuser.entity.WorkflowType;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record WorkflowDetailResponse(
        UUID workflowId,
        WorkflowType workflowType,
        String workflowLabel,
        String moduleName,
        String description,
        boolean active,
        boolean configurationValid,
        List<String> configurationIssues,
        String updatedBy,
        Instant createdAt,
        Instant updatedAt,
        List<WorkflowStepResponse> steps
) {
}
