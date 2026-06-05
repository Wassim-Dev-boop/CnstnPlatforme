package com.cnstn.authuser.dto;

import jakarta.validation.constraints.NotNull;
import java.util.Set;

public record UserPermissionsUpdateRequest(
        @NotNull Set<String> permissionCodes
) {
}
