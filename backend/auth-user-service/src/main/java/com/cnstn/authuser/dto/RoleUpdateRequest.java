package com.cnstn.authuser.dto;

import jakarta.validation.constraints.Size;

public record RoleUpdateRequest(
        @Size(max = 500) String description,
        Boolean systemRole
) {
}
