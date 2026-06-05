package com.cnstn.authuser.dto;

import com.cnstn.authuser.entity.RoleName;
import com.cnstn.authuser.entity.WorkflowActionType;
import com.cnstn.authuser.entity.WorkflowConditionType;
import com.cnstn.authuser.entity.WorkflowStepCode;
import java.util.Set;

public record WorkflowStepTemplateResponse(
        WorkflowStepCode stepCode,
        String label,
        String description,
        RoleName defaultRole,
        WorkflowConditionType defaultCondition,
        Set<WorkflowActionType> defaultActions,
        boolean required,
        boolean refusalReasonRequired,
        boolean critical
) {
}
