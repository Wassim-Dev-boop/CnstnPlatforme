package com.cnstn.authuser.dto;

import com.cnstn.authuser.entity.WorkflowType;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record WorkflowSummaryResponse(
        UUID workflowId,
        WorkflowType workflowType,
        String workflowLabel,
        String moduleName,
        String description,
        boolean active,
        int stepCount,
        int activeStepCount,
        List<String> involvedRoles,
        boolean configurationValid,
        String configurationStatus,
        String updatedBy,
        Instant createdAt,
        Instant lastModifiedAt
) {
}
