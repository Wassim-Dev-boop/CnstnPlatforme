package com.cnstn.authuser.dto;

import com.cnstn.authuser.entity.RoleName;
import com.cnstn.authuser.entity.WorkflowActionType;
import com.cnstn.authuser.entity.WorkflowConditionType;
import com.cnstn.authuser.entity.WorkflowStepCode;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.Set;

public record WorkflowStepUpsertRequest(
        @NotNull WorkflowStepCode stepCode,
        @NotNull @Size(min = 2, max = 160) String stepLabel,
        @NotNull @Min(1) Integer stepOrder,
        @NotNull RoleName responsibleRole,
        Boolean required,
        Boolean refusalReasonRequired,
        Boolean active,
        @NotNull WorkflowConditionType conditionType,
        @NotEmpty Set<WorkflowActionType> allowedActions
) {
}
