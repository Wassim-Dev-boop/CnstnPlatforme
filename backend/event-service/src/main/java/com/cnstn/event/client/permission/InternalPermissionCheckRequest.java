package com.cnstn.event.client.permission;

import java.util.Set;

public record InternalPermissionCheckRequest(
        String username,
        String permissionCode,
        Set<String> roles
) {
}
