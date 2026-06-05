package com.cnstn.authuser.controller;

import com.cnstn.authuser.dto.PageResponse;
import com.cnstn.authuser.dto.RoleCreateRequest;
import com.cnstn.authuser.dto.RoleResponse;
import com.cnstn.authuser.dto.RoleUpdateRequest;
import com.cnstn.authuser.service.RoleService;
import com.cnstn.authuser.service.UserPermissionPolicy;
import com.cnstn.authuser.service.UserPermissionService;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/roles")
@PreAuthorize("hasRole('ADMIN')")
public class AdminRoleController {

    private static final String VIEW_USERS_MODULE_PERMISSION = UserPermissionPolicy.VIEW_USERS_MODULE;
    private static final String UPDATE_USER_PERMISSION = UserPermissionPolicy.UPDATE_USER;

    private final RoleService roleService;
    private final UserPermissionService userPermissionService;

    public AdminRoleController(RoleService roleService, UserPermissionService userPermissionService) {
        this.roleService = roleService;
        this.userPermissionService = userPermissionService;
    }

    @GetMapping
    public PageResponse<RoleResponse> list(Pageable pageable, Authentication authentication) {
        assertPermission(authentication, VIEW_USERS_MODULE_PERMISSION);
        return roleService.list(pageable);
    }

    @GetMapping("/{id}")
    public RoleResponse getById(@PathVariable UUID id, Authentication authentication) {
        assertPermission(authentication, VIEW_USERS_MODULE_PERMISSION);
        return roleService.getById(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public RoleResponse create(@Valid @RequestBody RoleCreateRequest request, Authentication authentication) {
        assertPermission(authentication, VIEW_USERS_MODULE_PERMISSION);
        assertPermission(authentication, UPDATE_USER_PERMISSION);
        return roleService.create(request);
    }

    @PutMapping("/{id}")
    public RoleResponse update(
            @PathVariable UUID id,
            @Valid @RequestBody RoleUpdateRequest request,
            Authentication authentication
    ) {
        assertPermission(authentication, VIEW_USERS_MODULE_PERMISSION);
        assertPermission(authentication, UPDATE_USER_PERMISSION);
        return roleService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id, Authentication authentication) {
        assertPermission(authentication, VIEW_USERS_MODULE_PERMISSION);
        assertPermission(authentication, UPDATE_USER_PERMISSION);
        roleService.delete(id);
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
