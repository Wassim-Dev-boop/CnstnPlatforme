package com.cnstn.authuser.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.Set;

public record InternalPermissionCheckRequest(
        @NotBlank String username,
        @NotBlank String permissionCode,
        @NotNull Set<String> roles
) {
}
