package com.cnstn.authuser.dto;

import com.cnstn.authuser.entity.RoleName;
import com.cnstn.authuser.entity.WorkflowActionType;
import com.cnstn.authuser.entity.WorkflowConditionType;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.Set;

public record WorkflowStepUpdateRequest(
        @NotNull @Size(min = 2, max = 160) String stepLabel,
        @NotNull RoleName responsibleRole,
        Boolean required,
        Boolean refusalReasonRequired,
        Boolean active,
        @NotNull WorkflowConditionType conditionType,
        @NotEmpty Set<WorkflowActionType> allowedActions,
        Boolean confirmCriticalChange,
        @Size(max = 500) String comment
) {
}
