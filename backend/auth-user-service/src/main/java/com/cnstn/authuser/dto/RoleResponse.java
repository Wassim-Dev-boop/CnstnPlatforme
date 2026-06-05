package com.cnstn.authuser.dto;

import com.cnstn.authuser.entity.RoleName;
import java.time.Instant;
import java.util.UUID;

public record RoleResponse(
        UUID id,
        RoleName name,
        String description,
        boolean systemRole,
        Instant createdAt,
        Instant updatedAt
) {
}
