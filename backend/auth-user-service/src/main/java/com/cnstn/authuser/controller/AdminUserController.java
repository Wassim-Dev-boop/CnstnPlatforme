package com.cnstn.authuser.controller;

import com.cnstn.authuser.dto.AssignRolesRequest;
import com.cnstn.authuser.dto.PageResponse;
import com.cnstn.authuser.dto.UserCreateRequest;
import com.cnstn.authuser.dto.UserResponse;
import com.cnstn.authuser.dto.UserUpdateRequest;
import com.cnstn.authuser.entity.RoleName;
import com.cnstn.authuser.service.UserAdminService;
import com.cnstn.authuser.service.UserPermissionPolicy;
import com.cnstn.authuser.service.UserPermissionService;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/users")
@PreAuthorize("hasRole('ADMIN')")
public class AdminUserController {

    private static final String VIEW_USERS_MODULE_PERMISSION = UserPermissionPolicy.VIEW_USERS_MODULE;

    private final UserAdminService userAdminService;
    private final UserPermissionService userPermissionService;

    public AdminUserController(UserAdminService userAdminService, UserPermissionService userPermissionService) {
        this.userAdminService = userAdminService;
        this.userPermissionService = userPermissionService;
    }

    @GetMapping
    public PageResponse<UserResponse> list(
            Pageable pageable,
            Authentication authentication,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Boolean enabled,
            @RequestParam(required = false) UUID departmentId,
            @RequestParam(required = false) RoleName role
    ) {
        assertPermission(authentication, VIEW_USERS_MODULE_PERMISSION);
        return userAdminService.list(pageable, search, enabled, departmentId, role);
    }

    @GetMapping("/{id}")
    public UserResponse getById(@PathVariable UUID id, Authentication authentication) {
        assertPermission(authentication, VIEW_USERS_MODULE_PERMISSION);
        return userAdminService.getById(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public UserResponse create(@Valid @RequestBody UserCreateRequest request, Authentication authentication) {
        assertPermission(authentication, VIEW_USERS_MODULE_PERMISSION);
        assertPermission(authentication, UserPermissionPolicy.CREATE_USER);
        return userAdminService.create(request);
    }

    @PutMapping("/{id}")
    public UserResponse update(@PathVariable UUID id, @Valid @RequestBody UserUpdateRequest request, Authentication authentication) {
        assertPermission(authentication, VIEW_USERS_MODULE_PERMISSION);
        assertPermission(authentication, UserPermissionPolicy.UPDATE_USER);
        return userAdminService.update(id, request);
    }

    @PutMapping("/{id}/roles")
    public UserResponse assignRoles(@PathVariable UUID id, @Valid @RequestBody AssignRolesRequest request, Authentication authentication) {
        assertPermission(authentication, VIEW_USERS_MODULE_PERMISSION);
        assertPermission(authentication, UserPermissionPolicy.UPDATE_USER);
        return userAdminService.assignRoles(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id, Authentication authentication) {
        assertPermission(authentication, VIEW_USERS_MODULE_PERMISSION);
        assertPermission(authentication, UserPermissionPolicy.UPDATE_USER);
        userAdminService.delete(id);
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
