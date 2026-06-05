package com.cnstn.authuser.controller;

import com.cnstn.authuser.dto.RolePermissionsResponse;
import com.cnstn.authuser.dto.RolePermissionsUpdateRequest;
import com.cnstn.authuser.service.RolePermissionService;
import com.cnstn.authuser.service.UserPermissionPolicy;
import com.cnstn.authuser.service.UserPermissionService;
import jakarta.validation.Valid;
import java.util.Collections;
import java.util.UUID;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/roles/{id}/permissions")
@PreAuthorize("hasRole('ADMIN')")
public class AdminRolePermissionController {

    private static final String VIEW_USERS_MODULE_PERMISSION = UserPermissionPolicy.VIEW_USERS_MODULE;
    private static final String UPDATE_USER_PERMISSION = UserPermissionPolicy.UPDATE_USER;

    private final RolePermissionService rolePermissionService;
    private final UserPermissionService userPermissionService;

    public AdminRolePermissionController(
            RolePermissionService rolePermissionService,
            UserPermissionService userPermissionService
    ) {
        this.rolePermissionService = rolePermissionService;
        this.userPermissionService = userPermissionService;
    }

    @GetMapping
    public RolePermissionsResponse getRolePermissions(@PathVariable UUID id, Authentication authentication) {
        assertPermission(authentication, VIEW_USERS_MODULE_PERMISSION);
        return rolePermissionService.getRolePermissions(id);
    }

    @PutMapping
    public RolePermissionsResponse updateRolePermissions(
            @PathVariable UUID id,
            Authentication authentication,
            @Valid @RequestBody RolePermissionsUpdateRequest request
    ) {
        assertPermission(authentication, VIEW_USERS_MODULE_PERMISSION);
        assertPermission(authentication, UPDATE_USER_PERMISSION);

        boolean applyToUsers = request.applyToUsers() != null && request.applyToUsers();
        return rolePermissionService.updateRolePermissions(id, request.permissionCodes(), applyToUsers);
    }

    private void assertPermission(Authentication authentication, String permissionCode) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new AccessDeniedException("Authentication is required");
        }

        boolean allowed = userPermissionService.hasPermission(
                authentication.getName(),
                permissionCode,
                Collections.emptySet()
        );
        if (!allowed) {
            throw new AccessDeniedException("Permission denied: " + permissionCode);
        }
    }
}
