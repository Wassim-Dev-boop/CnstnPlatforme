package com.cnstn.event.client.permission;

import java.util.Set;
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

        try {
            InternalPermissionCheckResponse response = authUserRestTemplate.exchange(
                    "/api/v1/internal/permissions/check",
                    HttpMethod.POST,
                    new HttpEntity<>(request, headers),
                    InternalPermissionCheckResponse.class
            ).getBody();

            return response != null && response.allowed();
        } catch (RestClientResponseException ex) {
            throw new IllegalStateException(
                    "Permission check failed: status=" + ex.getStatusCode().value()
                            + ", body=" + ex.getResponseBodyAsString(),
                    ex
            );
        } catch (RestClientException ex) {
            throw new IllegalStateException("Permission check failed", ex);
        }
    }
}
