package com.cnstn.authuser.controller;

import com.cnstn.authuser.dto.PermissionDefinitionResponse;
import com.cnstn.authuser.service.UserPermissionPolicy;
import com.cnstn.authuser.service.UserPermissionService;
import java.util.List;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/permissions")
@PreAuthorize("hasRole('ADMIN')")
public class AdminPermissionController {

    private static final String VIEW_USERS_MODULE_PERMISSION = UserPermissionPolicy.VIEW_USERS_MODULE;

    private final UserPermissionService userPermissionService;

    public AdminPermissionController(UserPermissionService userPermissionService) {
        this.userPermissionService = userPermissionService;
    }

    @GetMapping("/catalog")
    public List<PermissionDefinitionResponse> catalog(Authentication authentication) {
        assertPermission(authentication, VIEW_USERS_MODULE_PERMISSION);
        return userPermissionService.listCatalog();
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
