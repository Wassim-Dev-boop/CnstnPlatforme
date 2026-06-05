package com.cnstn.authuser.dto;

public record PermissionDefinitionResponse(
        String code,
        String module,
        String action,
        String label,
        String description
) {
}
