package com.cnstn.authuser.dto;

import com.cnstn.authuser.entity.RoleName;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record RoleCreateRequest(
        @NotNull RoleName name,
        @Size(max = 500) String description,
        Boolean systemRole
) {
}
