package com.cnstn.authuser.dto;

import com.cnstn.authuser.entity.RoleName;
import jakarta.validation.constraints.NotEmpty;
import java.util.Set;

public record AssignRolesRequest(
        @NotEmpty Set<RoleName> roles
) {
}
