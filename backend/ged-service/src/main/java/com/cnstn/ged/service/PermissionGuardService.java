package com.cnstn.ged.service;

import com.cnstn.ged.client.permission.AuthUserPermissionClient;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

@Service
public class PermissionGuardService {

    private final AuthUserPermissionClient authUserPermissionClient;

    public PermissionGuardService(AuthUserPermissionClient authUserPermissionClient) {
        this.authUserPermissionClient = authUserPermissionClient;
    }

    public void check(Authentication authentication, String permissionCode) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new AccessDeniedException("Authentication is required");
        }

        Set<String> roles = authentication.getAuthorities().stream()
                .map(authority -> authority.getAuthority())
                .filter(value -> value != null && value.startsWith("ROLE_"))
                .map(value -> value.substring("ROLE_".length()))
                .collect(Collectors.toSet());

        boolean allowed = authUserPermissionClient.hasPermission(
                authentication.getName(),
                permissionCode,
                roles
        );

        if (!allowed) {
            throw new AccessDeniedException("Permission denied: " + permissionCode);
        }
    }
}
