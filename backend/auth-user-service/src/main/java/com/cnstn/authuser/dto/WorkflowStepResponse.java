package com.cnstn.authuser.dto;

import com.cnstn.authuser.entity.RoleName;
import com.cnstn.authuser.entity.WorkflowActionType;
import com.cnstn.authuser.entity.WorkflowConditionType;
import com.cnstn.authuser.entity.WorkflowStepCode;
import java.util.Set;
import java.util.UUID;

public record WorkflowStepResponse(
        UUID id,
        WorkflowStepCode stepCode,
        String stepLabel,
        int stepOrder,
        RoleName responsibleRole,
        String responsibleRoleLabel,
        boolean required,
        boolean refusalReasonRequired,
        boolean active,
        boolean critical,
        WorkflowConditionType conditionType,
        Set<WorkflowActionType> allowedActions
) {
}
