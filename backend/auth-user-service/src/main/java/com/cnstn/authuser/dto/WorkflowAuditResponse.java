package com.cnstn.authuser.dto;

import com.cnstn.authuser.entity.WorkflowAuditActionType;
import com.cnstn.authuser.entity.WorkflowType;
import java.time.Instant;
import java.util.UUID;

public record WorkflowAuditResponse(
        UUID id,
        WorkflowType workflowType,
        WorkflowAuditActionType actionType,
        String actorUsername,
        String oldConfig,
        String newConfig,
        String comment,
        Instant createdAt
) {
}
