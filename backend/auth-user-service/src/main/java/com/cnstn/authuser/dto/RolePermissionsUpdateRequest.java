package com.cnstn.authuser.dto;

import jakarta.validation.constraints.NotNull;
import java.util.Set;

public record RolePermissionsUpdateRequest(
        @NotNull Set<String> permissionCodes,
        Boolean applyToUsers
) {
}
