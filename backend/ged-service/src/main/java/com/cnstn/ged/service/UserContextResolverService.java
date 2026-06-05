package com.cnstn.ged.service;

import com.cnstn.ged.client.permission.AuthUserPermissionClient;
import com.cnstn.ged.client.permission.InternalUserSummaryResponse;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Service;

@Service
public class UserContextResolverService {

    private final AuthUserPermissionClient authUserPermissionClient;

    public UserContextResolverService(AuthUserPermissionClient authUserPermissionClient) {
        this.authUserPermissionClient = authUserPermissionClient;
    }

    public GedUserContext resolve(Authentication authentication) {
        Objects.requireNonNull(authentication, "Authentication is required");
        String username = normalize(authentication.getName());

        Set<String> roles = authentication.getAuthorities().stream()
                .map(authority -> authority.getAuthority())
                .filter(value -> value != null && value.startsWith("ROLE_"))
                .map(value -> value.substring("ROLE_".length()).toUpperCase(Locale.ROOT))
                .collect(Collectors.toSet());

        String serviceName = extractServiceFromJwt(authentication);
        InternalUserSummaryResponse summary = null;
        try {
            summary = authUserPermissionClient.fetchUserSummary(username);
        } catch (Exception ignored) {
            // Fallback: keep JWT-derived service and authentication roles.
        }

        if (summary != null) {
            if (summary.roles() != null && !summary.roles().isEmpty()) {
                roles = summary.roles().stream()
                        .filter(Objects::nonNull)
                        .map(value -> value.trim().toUpperCase(Locale.ROOT))
                        .filter(value -> !value.isEmpty())
                        .collect(Collectors.toSet());
            }
            if (isBlank(serviceName)) {
                String summaryDepartmentCode = normalize(summary.departmentCode());
                String summaryDepartmentName = normalize(summary.departmentName());
                serviceName = !summaryDepartmentCode.isEmpty()
                        ? summaryDepartmentCode
                        : summaryDepartmentName;
            }
        }

        return new GedUserContext(username, roles, normalize(serviceName));
    }

    private String extractServiceFromJwt(Authentication authentication) {
        if (!(authentication instanceof JwtAuthenticationToken token)) {
            return "";
        }

        Jwt jwt = token.getToken();
        String[] claimCandidates = {"department", "service", "department_name", "service_name"};
        for (String claim : claimCandidates) {
            Object raw = jwt.getClaim(claim);
            if (raw instanceof String value && !isBlank(value)) {
                return normalize(value);
            }
        }
        return "";
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim();
    }

    private boolean isBlank(String value) {
        return normalize(value).isEmpty();
    }
}
