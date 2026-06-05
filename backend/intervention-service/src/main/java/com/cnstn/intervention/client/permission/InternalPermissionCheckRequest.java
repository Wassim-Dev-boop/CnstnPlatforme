package com.cnstn.intervention.client.permission;

import java.util.Set;

public record InternalPermissionCheckRequest(
        String username,
        String permissionCode,
        Set<String> roles
) {
}
