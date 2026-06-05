package com.cnstn.authuser.controller;

import com.cnstn.authuser.client.notification.NotificationClientProperties;
import com.cnstn.authuser.dto.InternalPermissionCheckRequest;
import com.cnstn.authuser.dto.InternalPermissionCheckResponse;
import com.cnstn.authuser.exception.UnauthorizedException;
import com.cnstn.authuser.service.UserPermissionPolicy;
import com.cnstn.authuser.service.UserPermissionService;
import jakarta.validation.Valid;
import com.cnstn.authuser.entity.RoleName;
import java.util.Set;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/internal/permissions")
public class InternalPermissionController {

    private final UserPermissionService userPermissionService;
    private final NotificationClientProperties notificationClientProperties;

    public InternalPermissionController(
            UserPermissionService userPermissionService,
            NotificationClientProperties notificationClientProperties
    ) {
        this.userPermissionService = userPermissionService;
        this.notificationClientProperties = notificationClientProperties;
    }

    @PostMapping("/check")
    public InternalPermissionCheckResponse check(
            @RequestHeader(name = "X-Api-Key", required = false) String apiKey,
            @Valid @RequestBody InternalPermissionCheckRequest request
    ) {
        validateApiKey(apiKey);

        Set<RoleName> roles = UserPermissionPolicy.normalizeRoles(
                UserPermissionPolicy.parseRoles(request.roles())
        );
        boolean allowed = userPermissionService.hasPermission(
                request.username(),
                request.permissionCode(),
                roles
        );
        return new InternalPermissionCheckResponse(allowed);
    }

    private void validateApiKey(String providedApiKey) {
        String expected = notificationClientProperties.getInternalApiKey();
        if (expected == null || expected.isBlank() || !expected.equals(providedApiKey)) {
            throw new UnauthorizedException("Invalid internal API key");
        }
    }
}
