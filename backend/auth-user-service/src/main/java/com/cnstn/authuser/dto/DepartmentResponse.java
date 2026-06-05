package com.cnstn.authuser.dto;

import java.time.Instant;
import java.util.UUID;

public record DepartmentResponse(
        UUID id,
        String code,
        String name,
        String description,
        boolean active,
        Instant createdAt,
        Instant updatedAt
) {
}
