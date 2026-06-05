package com.cnstn.authuser.dto;

import java.util.Set;
import java.util.UUID;

public record UserPermissionsResponse(
        UUID userId,
        boolean customized,
        Set<String> assignedPermissions,
        Set<String> roleDerivedPermissions,
        Set<String> effectivePermissions
) {
}
