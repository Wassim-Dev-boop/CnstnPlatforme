package com.cnstn.authuser.controller;

import com.cnstn.authuser.dto.UserPermissionsResponse;
import com.cnstn.authuser.dto.UserPermissionsUpdateRequest;
import com.cnstn.authuser.service.UserPermissionPolicy;
import com.cnstn.authuser.service.UserPermissionService;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/users/{id}/permissions")
@PreAuthorize("hasRole('ADMIN')")
public class AdminUserPermissionController {

    private static final String VIEW_USERS_MODULE_PERMISSION = UserPermissionPolicy.VIEW_USERS_MODULE;
    private static final String UPDATE_USER_PERMISSION = UserPermissionPolicy.UPDATE_USER;

    private final UserPermissionService userPermissionService;

    public AdminUserPermissionController(UserPermissionService userPermissionService) {
        this.userPermissionService = userPermissionService;
    }

    @GetMapping
    public UserPermissionsResponse getUserPermissions(@PathVariable UUID id, Authentication authentication) {
        assertPermission(authentication, VIEW_USERS_MODULE_PERMISSION);
        return userPermissionService.getUserPermissions(id);
    }

    @PutMapping
    public UserPermissionsResponse updateUserPermissions(
            @PathVariable UUID id,
            Authentication authentication,
            @Valid @RequestBody UserPermissionsUpdateRequest request
    ) {
        assertPermission(authentication, VIEW_USERS_MODULE_PERMISSION);
        assertPermission(authentication, UPDATE_USER_PERMISSION);
        return userPermissionService.updateUserPermissions(id, request.permissionCodes());
    }

    @DeleteMapping
    public UserPermissionsResponse resetUserPermissions(@PathVariable UUID id, Authentication authentication) {
        assertPermission(authentication, VIEW_USERS_MODULE_PERMISSION);
        assertPermission(authentication, UPDATE_USER_PERMISSION);
        return userPermissionService.resetUserPermissions(id);
    }

    private void assertPermission(Authentication authentication, String permissionCode) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new AccessDeniedException("Authentication is required");
        }

        boolean allowed = userPermissionService.hasPermission(
                authentication.getName(),
                permissionCode,
                java.util.Collections.emptySet()
        );
        if (!allowed) {
            throw new AccessDeniedException("Permission denied: " + permissionCode);
        }
    }
}
