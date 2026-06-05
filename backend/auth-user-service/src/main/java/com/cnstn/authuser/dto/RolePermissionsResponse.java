package com.cnstn.authuser.dto;

import java.util.Set;
import java.util.UUID;

public record RolePermissionsResponse(
        UUID roleId,
        String roleName,
        Set<String> assignedPermissions,
        long usersInRole,
        long usersUsingRoleDefaults,
        long usersCustomized
) {
}
