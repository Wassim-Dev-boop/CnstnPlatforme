package com.cnstn.intervention.client.permission;

import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.client.RestTemplate;

@Component
public class AuthUserPermissionClient {

    private static final Logger log = LoggerFactory.getLogger(AuthUserPermissionClient.class);
    private static final String PERMISSION_CHECK_PATH = "/api/v1/internal/permissions/check";
    private static final String DOCKER_AUTH_USER_BASE_URL = "http://auth-user-service:8081";

    private final RestTemplate authUserRestTemplate;
    private final AuthUserPermissionClientProperties properties;

    public AuthUserPermissionClient(
            @Qualifier("authUserPermissionRestTemplate") RestTemplate authUserRestTemplate,
            AuthUserPermissionClientProperties properties
    ) {
        this.authUserRestTemplate = authUserRestTemplate;
        this.properties = properties;
    }

    public boolean hasPermission(String username, String permissionCode, Set<String> roles) {
        InternalPermissionCheckRequest request = new InternalPermissionCheckRequest(
                username,
                permissionCode,
                roles
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("X-Api-Key", properties.getInternalApiKey());
        HttpEntity<InternalPermissionCheckRequest> entity = new HttpEntity<>(request, headers);

        try {
            return invokePermissionCheck(PERMISSION_CHECK_PATH, entity);
        } catch (RestClientResponseException ex) {
            throw new IllegalStateException(
                    "Permission check failed: status=" + ex.getStatusCode().value()
                            + ", body=" + ex.getResponseBodyAsString(),
                    ex
            );
        } catch (RestClientException ex) {
            if (shouldFallbackToDockerAlias(PERMISSION_CHECK_PATH)) {
                try {
                    log.warn(
                            "Permission check via configured base URL failed ({}). Retrying via {}.",
                            properties.getBaseUrl(),
                            DOCKER_AUTH_USER_BASE_URL,
                            ex
                    );
                    return invokePermissionCheck(DOCKER_AUTH_USER_BASE_URL + PERMISSION_CHECK_PATH, entity);
                } catch (RestClientResponseException fallbackEx) {
                    throw new IllegalStateException(
                            "Permission check failed on fallback: status="
                                    + fallbackEx.getStatusCode().value()
                                    + ", body=" + fallbackEx.getResponseBodyAsString(),
                            fallbackEx
                    );
                } catch (RestClientException fallbackEx) {
                    throw new IllegalStateException("Permission check failed (fallback included)", fallbackEx);
                }
            }

            throw new IllegalStateException("Permission check failed", ex);
        }
    }

    private boolean invokePermissionCheck(
            String targetUrl,
            HttpEntity<InternalPermissionCheckRequest> requestEntity
    ) {
        InternalPermissionCheckResponse response = authUserRestTemplate.exchange(
                targetUrl,
                HttpMethod.POST,
                requestEntity,
                InternalPermissionCheckResponse.class
        ).getBody();
        return response != null && response.allowed();
    }

    private boolean shouldFallbackToDockerAlias(String targetUrl) {
        if (targetUrl.startsWith("http://") || targetUrl.startsWith("https://")) {
            return false;
        }

        String baseUrl = properties.getBaseUrl();
        if (baseUrl == null) {
            return false;
        }

        String normalized = baseUrl.trim().toLowerCase();
        return normalized.startsWith("http://localhost")
                || normalized.startsWith("https://localhost")
                || normalized.startsWith("http://127.0.0.1")
                || normalized.startsWith("https://127.0.0.1");
    }
}
