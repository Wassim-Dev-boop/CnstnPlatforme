package com.cnstn.ged.client.permission;

import java.util.Set;

public record InternalUserSummaryResponse(
        String username,
        String departmentCode,
        String departmentName,
        Set<String> roles,
        boolean active
) {
}
