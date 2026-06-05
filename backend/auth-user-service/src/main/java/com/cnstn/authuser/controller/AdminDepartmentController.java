package com.cnstn.authuser.controller;

import com.cnstn.authuser.dto.DepartmentCreateRequest;
import com.cnstn.authuser.dto.DepartmentResponse;
import com.cnstn.authuser.dto.DepartmentUpdateRequest;
import com.cnstn.authuser.dto.PageResponse;
import com.cnstn.authuser.service.DepartmentService;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/departments")
@PreAuthorize("hasRole('ADMIN')")
public class AdminDepartmentController {

    private static final String VIEW_USERS_MODULE_PERMISSION = UserPermissionPolicy.VIEW_USERS_MODULE;
    private static final String UPDATE_USER_PERMISSION = UserPermissionPolicy.UPDATE_USER;

    private final DepartmentService departmentService;
    private final UserPermissionService userPermissionService;

    public AdminDepartmentController(DepartmentService departmentService, UserPermissionService userPermissionService) {
        this.departmentService = departmentService;
        this.userPermissionService = userPermissionService;
    }

    @GetMapping
    public PageResponse<DepartmentResponse> list(
            Pageable pageable,
            Authentication authentication,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Boolean active
    ) {
        assertPermission(authentication, VIEW_USERS_MODULE_PERMISSION);
        return departmentService.list(pageable, search, active);
    }

    @GetMapping("/{id}")
    public DepartmentResponse getById(@PathVariable UUID id, Authentication authentication) {
        assertPermission(authentication, VIEW_USERS_MODULE_PERMISSION);
        return departmentService.getById(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public DepartmentResponse create(@Valid @RequestBody DepartmentCreateRequest request, Authentication authentication) {
        assertPermission(authentication, VIEW_USERS_MODULE_PERMISSION);
        assertPermission(authentication, UPDATE_USER_PERMISSION);
        return departmentService.create(request);
    }

    @PutMapping("/{id}")
    public DepartmentResponse update(
            @PathVariable UUID id,
            @Valid @RequestBody DepartmentUpdateRequest request,
            Authentication authentication
    ) {
        assertPermission(authentication, VIEW_USERS_MODULE_PERMISSION);
        assertPermission(authentication, UPDATE_USER_PERMISSION);
        return departmentService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id, Authentication authentication) {
        assertPermission(authentication, VIEW_USERS_MODULE_PERMISSION);
        assertPermission(authentication, UPDATE_USER_PERMISSION);
        departmentService.delete(id);
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
