package com.cnstn.notification.dto;

import java.util.Set;

public record InternalUserSummaryResponse(
        String username,
        String email,
        String departmentCode,
        String departmentName,
        Set<String> roles,
        boolean active
) {
}

