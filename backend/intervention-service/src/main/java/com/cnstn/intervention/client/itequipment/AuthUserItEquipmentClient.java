package com.cnstn.intervention.client.itequipment;

import com.cnstn.intervention.client.permission.AuthUserPermissionClientProperties;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.client.RestTemplate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Component
public class AuthUserItEquipmentClient {

    private static final Logger log = LoggerFactory.getLogger(AuthUserItEquipmentClient.class);
    private static final String DOCKER_AUTH_USER_BASE_URL = "http://auth-user-service:8081";

    private final RestTemplate authUserRestTemplate;
    private final AuthUserPermissionClientProperties properties;

    public AuthUserItEquipmentClient(
        @Qualifier("authUserPermissionRestTemplate") RestTemplate authUserRestTemplate,
        AuthUserPermissionClientProperties properties
    ) {
        this.authUserRestTemplate = authUserRestTemplate;
        this.properties = properties;
    }

    public InternalItEquipmentOwnershipResponse checkOwnership(UUID equipmentId, String employeeId) {
        HttpHeaders headers = internalHeaders();
        String path = UriComponentsBuilder.fromPath("/api/v1/internal/it-equipment/{equipmentId}/ownership")
            .queryParam("employeeId", employeeId)
            .buildAndExpand(equipmentId)
            .toUriString();

        try {
            return exchange(path, HttpMethod.GET, new HttpEntity<>(headers), InternalItEquipmentOwnershipResponse.class);
        } catch (RestClientResponseException ex) {
            throw new AuthUserItEquipmentClientException(
                "Equipment ownership check failed: status=" + ex.getStatusCode().value() + ", body=" + ex.getResponseBodyAsString(),
                ex.getStatusCode().value(),
                ex.getResponseBodyAsString(),
                ex
            );
        } catch (RestClientException ex) {
            if (shouldFallbackToDockerAlias(path)) {
                String fallbackTarget = DOCKER_AUTH_USER_BASE_URL + path;
                try {
                    log.warn(
                        "IT equipment ownership check via configured base URL failed ({}). Retrying via {}.",
                        properties.getBaseUrl(),
                        DOCKER_AUTH_USER_BASE_URL,
                        ex
                    );
                    return exchange(
                        fallbackTarget,
                        HttpMethod.GET,
                        new HttpEntity<>(headers),
                        InternalItEquipmentOwnershipResponse.class
                    );
                } catch (RestClientResponseException fallbackEx) {
                    throw new AuthUserItEquipmentClientException(
                        "Equipment ownership check failed on fallback: status="
                            + fallbackEx.getStatusCode().value()
                            + ", body=" + fallbackEx.getResponseBodyAsString(),
                        fallbackEx.getStatusCode().value(),
                        fallbackEx.getResponseBodyAsString(),
                        fallbackEx
                    );
                } catch (RestClientException fallbackEx) {
                    throw new AuthUserItEquipmentClientException("Equipment ownership check failed (fallback included)", fallbackEx);
                }
            }
            throw new AuthUserItEquipmentClientException("Equipment ownership check failed", ex);
        }
    }

    public InternalItEquipmentSummaryResponse getSummary(UUID equipmentId) {
        HttpHeaders headers = internalHeaders();
        String path = "/api/v1/internal/it-equipment/" + equipmentId;

        try {
            return exchange(path, HttpMethod.GET, new HttpEntity<>(headers), InternalItEquipmentSummaryResponse.class);
        } catch (RestClientResponseException ex) {
            throw new AuthUserItEquipmentClientException(
                "Equipment summary fetch failed: status=" + ex.getStatusCode().value() + ", body=" + ex.getResponseBodyAsString(),
                ex.getStatusCode().value(),
                ex.getResponseBodyAsString(),
                ex
            );
        } catch (RestClientException ex) {
            if (shouldFallbackToDockerAlias(path)) {
                String fallbackTarget = DOCKER_AUTH_USER_BASE_URL + path;
                try {
                    log.warn(
                        "IT equipment summary fetch via configured base URL failed ({}). Retrying via {}.",
                        properties.getBaseUrl(),
                        DOCKER_AUTH_USER_BASE_URL,
                        ex
                    );
                    return exchange(
                        fallbackTarget,
                        HttpMethod.GET,
                        new HttpEntity<>(headers),
                        InternalItEquipmentSummaryResponse.class
                    );
                } catch (RestClientResponseException fallbackEx) {
                    throw new AuthUserItEquipmentClientException(
                        "Equipment summary fetch failed on fallback: status="
                            + fallbackEx.getStatusCode().value()
                            + ", body=" + fallbackEx.getResponseBodyAsString(),
                        fallbackEx.getStatusCode().value(),
                        fallbackEx.getResponseBodyAsString(),
                        fallbackEx
                    );
                } catch (RestClientException fallbackEx) {
                    throw new AuthUserItEquipmentClientException("Equipment summary fetch failed (fallback included)", fallbackEx);
                }
            }
            throw new AuthUserItEquipmentClientException("Equipment summary fetch failed", ex);
        }
    }

    public InternalItEquipmentSummaryResponse updateState(UUID equipmentId, String state) {
        HttpHeaders headers = internalHeaders();
        String path = "/api/v1/internal/it-equipment/" + equipmentId + "/state";
        InternalItEquipmentStateUpdateRequest request = new InternalItEquipmentStateUpdateRequest(state);

        try {
            return exchange(path, HttpMethod.PATCH, new HttpEntity<>(request, headers), InternalItEquipmentSummaryResponse.class);
        } catch (RestClientResponseException ex) {
            throw new AuthUserItEquipmentClientException(
                "Equipment state update failed: status=" + ex.getStatusCode().value() + ", body=" + ex.getResponseBodyAsString(),
                ex.getStatusCode().value(),
                ex.getResponseBodyAsString(),
                ex
            );
        } catch (RestClientException ex) {
            if (shouldFallbackToDockerAlias(path)) {
                String fallbackTarget = DOCKER_AUTH_USER_BASE_URL + path;
                try {
                    log.warn(
                        "IT equipment state update via configured base URL failed ({}). Retrying via {}.",
                        properties.getBaseUrl(),
                        DOCKER_AUTH_USER_BASE_URL,
                        ex
                    );
                    return exchange(
                        fallbackTarget,
                        HttpMethod.PATCH,
                        new HttpEntity<>(request, headers),
                        InternalItEquipmentSummaryResponse.class
                    );
                } catch (RestClientResponseException fallbackEx) {
                    throw new AuthUserItEquipmentClientException(
                        "Equipment state update failed on fallback: status="
                            + fallbackEx.getStatusCode().value()
                            + ", body=" + fallbackEx.getResponseBodyAsString(),
                        fallbackEx.getStatusCode().value(),
                        fallbackEx.getResponseBodyAsString(),
                        fallbackEx
                    );
                } catch (RestClientException fallbackEx) {
                    throw new AuthUserItEquipmentClientException("Equipment state update failed (fallback included)", fallbackEx);
                }
            }
            throw new AuthUserItEquipmentClientException("Equipment state update failed", ex);
        }
    }

    private HttpHeaders internalHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("X-Api-Key", properties.getInternalApiKey());
        return headers;
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

    private <T> T exchange(String pathOrUrl, HttpMethod method, HttpEntity<?> entity, Class<T> responseType) {
        return authUserRestTemplate.exchange(
            pathOrUrl,
            method,
            entity,
            responseType
        ).getBody();
    }
}
