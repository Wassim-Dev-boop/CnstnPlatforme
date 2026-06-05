package com.cnstn.notification.client;

import com.cnstn.notification.dto.InternalUserSummaryResponse;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

@Component
public class UserDirectoryClient {

    private final RestTemplate restTemplate;
    private final String internalApiKey;

    public UserDirectoryClient(
            RestTemplateBuilder restTemplateBuilder,
            @Value("${app.auth-user-service.base-url:${AUTH_USER_SERVICE_URL:http://localhost:8081}}")
            String authUserServiceBaseUrl,
            @Value("${app.internal.api-key:change-me}") String internalApiKey
    ) {
        this.restTemplate = restTemplateBuilder.rootUri(authUserServiceBaseUrl).build();
        this.internalApiKey = internalApiKey;
    }

    public Optional<InternalUserSummaryResponse> findByUsername(String username) {
        HttpHeaders headers = new HttpHeaders();
        headers.set("X-Api-Key", internalApiKey);

        try {
            ResponseEntity<InternalUserSummaryResponse> response = restTemplate.exchange(
                    "/api/v1/internal/users/{username}/summary",
                    HttpMethod.GET,
                    new HttpEntity<>(headers),
                    InternalUserSummaryResponse.class,
                    username
            );
            return Optional.ofNullable(response.getBody());
        } catch (RestClientException ex) {
            return Optional.empty();
        }
    }
}

