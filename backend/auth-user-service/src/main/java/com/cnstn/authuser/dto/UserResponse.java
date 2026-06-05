package com.cnstn.authuser.dto;

import com.cnstn.authuser.entity.RoleName;
import java.time.Instant;
import java.util.Set;
import java.util.UUID;

public record UserResponse(
        UUID id,
        UUID keycloakId,
        String username,
        String email,
        String firstName,
        String lastName,
        String phone,
        boolean enabled,
        DepartmentResponse department,
        Set<RoleName> roles,
        boolean permissionsCustomized,
        Set<String> permissions,
        Instant createdAt,
        Instant updatedAt
) {
}
