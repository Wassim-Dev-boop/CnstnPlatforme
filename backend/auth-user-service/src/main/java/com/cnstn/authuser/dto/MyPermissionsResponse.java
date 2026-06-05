package com.cnstn.authuser.dto;

import java.util.Set;

public record MyPermissionsResponse(
        boolean customized,
        Set<String> effectivePermissions
) {
}
