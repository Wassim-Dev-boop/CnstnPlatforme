package com.cnstn.authuser.client.keycloak;

import com.cnstn.authuser.entity.RoleName;
import com.cnstn.authuser.exception.ExternalServiceException;
import java.net.URI;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.client.RestTemplate;

@Component
public class KeycloakAdminClient {

    private static final Set<String> MANAGED_ROLES = Arrays.stream(RoleName.values())
            .map(Enum::name)
            .collect(Collectors.toSet());

    private static final String DEFAULT_PASSWORD = "ChangeMe123!";

    private final RestTemplate restTemplate;
    private final KeycloakProperties properties;

    public KeycloakAdminClient(RestTemplate keycloakRestTemplate, KeycloakProperties properties) {
        this.restTemplate = keycloakRestTemplate;
        this.properties = properties;
    }

    public UUID createUser(KeycloakCreateUserRequest request, Set<RoleName> roles) {
        String token = getAdminToken();
        try {
            KeycloakUserRepresentation payload = buildCreatePayload(request);
            ResponseEntity<Void> response = restTemplate.exchange(
                    "/admin/realms/{realm}/users",
                    method(HttpMethod.POST),
                    new HttpEntity<>(payload, headerMap(jsonHeaders(token))),
                    Void.class,
                    properties.getRealm()
            );

            URI location = response.getHeaders().getLocation();
            if (location == null) {
                throw new ExternalServiceException("Keycloak did not return location header for created user");
            }

            UUID keycloakId = parseIdFromLocation(location);
            setUserRealmRoles(keycloakId, roles);
            return keycloakId;
        } catch (RestClientResponseException ex) {
            throw mapException("Failed to create user in Keycloak", ex);
        } catch (RestClientException ex) {
            throw new ExternalServiceException("Failed to create user in Keycloak", ex);
        }
    }

    public void updateUser(UUID keycloakId, KeycloakUpdateUserRequest request) {
        String token = getAdminToken();
        try {
            KeycloakUserRepresentation payload = new KeycloakUserRepresentation();
            payload.setId(keycloakId.toString());
            payload.setUsername(request.username());
            payload.setEmail(request.email());
            payload.setEnabled(request.enabled());
            payload.setFirstName(request.firstName());
            payload.setLastName(request.lastName());
            payload.setEmailVerified(true);
            payload.setAttributes(Map.of("phone", List.of(safeString(request.phone()))));

            restTemplate.exchange(
                    "/admin/realms/{realm}/users/{userId}",
                    method(HttpMethod.PUT),
                    new HttpEntity<>(payload, headerMap(jsonHeaders(token))),
                    Void.class,
                    properties.getRealm(),
                    keycloakId
            );
        } catch (RestClientResponseException ex) {
            throw mapException("Failed to update user in Keycloak", ex);
        } catch (RestClientException ex) {
            throw new ExternalServiceException("Failed to update user in Keycloak", ex);
        }
    }

    public void deleteUser(UUID keycloakId) {
        String token = getAdminToken();
        try {
            restTemplate.exchange(
                    "/admin/realms/{realm}/users/{userId}",
                    method(HttpMethod.DELETE),
                    new HttpEntity<>(headerMap(jsonHeaders(token))),
                    Void.class,
                    properties.getRealm(),
                    keycloakId
            );
        } catch (RestClientResponseException ex) {
            if (ex.getStatusCode().value() == 404) {
                return;
            }
            throw mapException("Failed to delete user in Keycloak", ex);
        } catch (RestClientException ex) {
            throw new ExternalServiceException("Failed to delete user in Keycloak", ex);
        }
    }

    public void setUserRealmRoles(UUID keycloakId, Set<RoleName> roleNames) {
        String token = getAdminToken();
        try {
            List<KeycloakRoleRepresentation> existingManagedRoles = getUserRealmRoles(keycloakId, token)
                    .stream()
                    .filter(role -> MANAGED_ROLES.contains(role.name()))
                    .toList();

            if (!existingManagedRoles.isEmpty()) {
                restTemplate.exchange(
                        "/admin/realms/{realm}/users/{userId}/role-mappings/realm",
                        method(HttpMethod.DELETE),
                        new HttpEntity<>(existingManagedRoles, headerMap(jsonHeaders(token))),
                        Void.class,
                        properties.getRealm(),
                        keycloakId
                );
            }

            List<KeycloakRoleRepresentation> targetRoles = roleNames.stream()
                    .map(role -> getRealmRole(role.name(), token))
                    .toList();

            if (!targetRoles.isEmpty()) {
                restTemplate.exchange(
                        "/admin/realms/{realm}/users/{userId}/role-mappings/realm",
                        method(HttpMethod.POST),
                        new HttpEntity<>(targetRoles, headerMap(jsonHeaders(token))),
                        Void.class,
                        properties.getRealm(),
                        keycloakId
                );
            }
        } catch (RestClientResponseException ex) {
            throw mapException("Failed to synchronize roles in Keycloak", ex);
        } catch (RestClientException ex) {
            throw new ExternalServiceException("Failed to synchronize roles in Keycloak", ex);
        }
    }

    public void createRealmRole(RoleName roleName, String description) {
        String token = getAdminToken();
        try {
            Map<String, String> payload = Map.of(
                    "name", roleName.name(),
                    "description", safeString(description)
            );

            restTemplate.exchange(
                    "/admin/realms/{realm}/roles",
                    method(HttpMethod.POST),
                    new HttpEntity<>(payload, headerMap(jsonHeaders(token))),
                    Void.class,
                    properties.getRealm()
            );
        } catch (RestClientResponseException ex) {
            if (ex.getStatusCode().value() == 409) {
                updateRealmRole(roleName, description);
                return;
            }
            throw mapException("Failed to create role in Keycloak", ex);
        } catch (RestClientException ex) {
            throw new ExternalServiceException("Failed to create role in Keycloak", ex);
        }
    }

    public void updateRealmRole(RoleName roleName, String description) {
        String token = getAdminToken();
        try {
            Map<String, String> payload = Map.of(
                    "name", roleName.name(),
                    "description", safeString(description)
            );

            restTemplate.exchange(
                    "/admin/realms/{realm}/roles/{roleName}",
                    method(HttpMethod.PUT),
                    new HttpEntity<>(payload, headerMap(jsonHeaders(token))),
                    Void.class,
                    properties.getRealm(),
                    roleName.name()
            );
        } catch (RestClientResponseException ex) {
            throw mapException("Failed to update role in Keycloak", ex);
        } catch (RestClientException ex) {
            throw new ExternalServiceException("Failed to update role in Keycloak", ex);
        }
    }

    public void deleteRealmRole(RoleName roleName) {
        String token = getAdminToken();
        try {
            restTemplate.exchange(
                    "/admin/realms/{realm}/roles/{roleName}",
                    method(HttpMethod.DELETE),
                    new HttpEntity<>(headerMap(jsonHeaders(token))),
                    Void.class,
                    properties.getRealm(),
                    roleName.name()
            );
        } catch (RestClientResponseException ex) {
            if (ex.getStatusCode().value() == 404) {
                return;
            }
            throw mapException("Failed to delete role in Keycloak", ex);
        } catch (RestClientException ex) {
            throw new ExternalServiceException("Failed to delete role in Keycloak", ex);
        }
    }

    public void resetUserPassword(UUID keycloakId, String newPassword) {
        String token = getAdminToken();
        try {
            KeycloakCredentialRepresentation payload = new KeycloakCredentialRepresentation(
                    "password",
                    newPassword,
                    false
            );

            restTemplate.exchange(
                    "/admin/realms/{realm}/users/{userId}/reset-password",
                    method(HttpMethod.PUT),
                    new HttpEntity<>(payload, headerMap(jsonHeaders(token))),
                    Void.class,
                    properties.getRealm(),
                    keycloakId
            );
        } catch (RestClientResponseException ex) {
            throw mapException("Failed to reset user password in Keycloak", ex);
        } catch (RestClientException ex) {
            throw new ExternalServiceException("Failed to reset user password in Keycloak", ex);
        }
    }

    public Optional<UUID> findUserIdByUsernameOrEmail(String username, String email) {
        String token = getAdminToken();
        try {
            String safeUsername = normalize(username);
            if (!safeUsername.isBlank()) {
                Optional<UUID> byUsername = findUserIdByField("username", safeUsername, token);
                if (byUsername.isPresent()) {
                    return byUsername;
                }
            }

            String safeEmail = normalize(email);
            if (!safeEmail.isBlank()) {
                return findUserIdByField("email", safeEmail, token);
            }

            return Optional.empty();
        } catch (RestClientResponseException ex) {
            throw mapException("Failed to search user in Keycloak", ex);
        } catch (RestClientException ex) {
            throw new ExternalServiceException("Failed to search user in Keycloak", ex);
        }
    }

    private List<KeycloakRoleRepresentation> getUserRealmRoles(UUID keycloakId, String token) {
        ResponseEntity<KeycloakRoleRepresentation[]> response = restTemplate.exchange(
                "/admin/realms/{realm}/users/{userId}/role-mappings/realm",
                method(HttpMethod.GET),
                new HttpEntity<>(headerMap(jsonHeaders(token))),
                KeycloakRoleRepresentation[].class,
                properties.getRealm(),
                keycloakId
        );

        KeycloakRoleRepresentation[] roles = response.getBody();
        if (roles == null) {
            return Collections.emptyList();
        }
        return List.of(roles);
    }

    private KeycloakRoleRepresentation getRealmRole(String roleName, String token) {
        try {
            ResponseEntity<KeycloakRoleRepresentation> response = restTemplate.exchange(
                    "/admin/realms/{realm}/roles/{roleName}",
                    method(HttpMethod.GET),
                    new HttpEntity<>(headerMap(jsonHeaders(token))),
                    KeycloakRoleRepresentation.class,
                    properties.getRealm(),
                    roleName
            );

            KeycloakRoleRepresentation role = response.getBody();
            if (role == null || role.name() == null) {
                throw new ExternalServiceException("Role not found in Keycloak: " + roleName);
            }
            return role;
        } catch (RestClientResponseException ex) {
            if (ex.getStatusCode().value() == 404 && MANAGED_ROLES.contains(roleName)) {
                createMissingRealmRole(roleName, token);
                ResponseEntity<KeycloakRoleRepresentation> retry = restTemplate.exchange(
                        "/admin/realms/{realm}/roles/{roleName}",
                        method(HttpMethod.GET),
                        new HttpEntity<>(headerMap(jsonHeaders(token))),
                        KeycloakRoleRepresentation.class,
                        properties.getRealm(),
                        roleName
                );
                KeycloakRoleRepresentation role = retry.getBody();
                if (role == null || role.name() == null) {
                    throw new ExternalServiceException("Role not found in Keycloak after creation: " + roleName);
                }
                return role;
            }
            throw mapException("Failed to load role from Keycloak", ex);
        }
    }

    private @NonNull String getAdminToken() {
        try {
            MultiValueMap<String, String> formData = new LinkedMultiValueMap<>();
            formData.add("grant_type", "client_credentials");
            formData.add("client_id", properties.getClientId());
            formData.add("client_secret", properties.getClientSecret());

            HttpHeaders tokenHeaders = new HttpHeaders();
            tokenHeaders.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

            ResponseEntity<KeycloakTokenResponse> response = restTemplate.exchange(
                    "/realms/{realm}/protocol/openid-connect/token",
                    method(HttpMethod.POST),
                    new HttpEntity<>(formData, headerMap(tokenHeaders)),
                    KeycloakTokenResponse.class,
                    properties.getAdminRealm()
            );

            KeycloakTokenResponse tokenResponse = response.getBody();
            if (tokenResponse == null || tokenResponse.accessToken() == null || tokenResponse.accessToken().isBlank()) {
                throw new ExternalServiceException("Keycloak token response is empty");
            }
            return tokenResponse.accessToken();
        } catch (RestClientResponseException ex) {
            throw mapException("Failed to authenticate against Keycloak", ex);
        } catch (RestClientException ex) {
            throw new ExternalServiceException("Failed to authenticate against Keycloak", ex);
        }
    }

    private KeycloakUserRepresentation buildCreatePayload(KeycloakCreateUserRequest request) {
        List<KeycloakCredentialRepresentation> credentials = List.of(new KeycloakCredentialRepresentation(
                "password",
                request.initialPassword() == null || request.initialPassword().isBlank()
                        ? DEFAULT_PASSWORD
                        : request.initialPassword(),
                request.temporaryPassword()
        ));

        KeycloakUserRepresentation payload = new KeycloakUserRepresentation();
        payload.setUsername(request.username());
        payload.setEmail(request.email());
        payload.setEnabled(request.enabled());
        payload.setFirstName(request.firstName());
        payload.setLastName(request.lastName());
        payload.setCredentials(credentials);
        payload.setEmailVerified(true);
        if (request.forcePasswordUpdate()) {
            payload.setRequiredActions(List.of("UPDATE_PASSWORD"));
        } else {
            payload.setRequiredActions(Collections.emptyList());
        }
        payload.setAttributes(Map.of("phone", List.of(safeString(request.phone()))));
        return payload;
    }

    private ExternalServiceException mapException(String message, RestClientResponseException ex) {
        return new ExternalServiceException(
                message + ": status=" + ex.getStatusCode().value() + ", body=" + ex.getResponseBodyAsString(),
                ex
        );
    }

    private UUID parseIdFromLocation(URI location) {
        String path = location.getPath();
        if (path == null || !path.contains("/")) {
            throw new ExternalServiceException("Invalid Keycloak location header: " + location);
        }

        String rawId = path.substring(path.lastIndexOf('/') + 1);
        try {
            return UUID.fromString(rawId);
        } catch (IllegalArgumentException ex) {
            throw new ExternalServiceException("Invalid Keycloak user id format: " + rawId, ex);
        }
    }

    private @NonNull HttpHeaders jsonHeaders(@NonNull String token) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(token);
        return headers;
    }

    private @NonNull HttpMethod method(@NonNull HttpMethod httpMethod) {
        return Objects.requireNonNull(httpMethod);
    }

    private @NonNull MultiValueMap<String, String> headerMap(@NonNull HttpHeaders headers) {
        return Objects.requireNonNull(headers);
    }

    private @NonNull String safeString(String value) {
        return Objects.requireNonNullElse(value, "");
    }

    private void createMissingRealmRole(String roleName, String token) {
        try {
            Map<String, String> payload = Map.of(
                    "name", roleName,
                    "description", defaultRoleDescription(roleName)
            );

            restTemplate.exchange(
                    "/admin/realms/{realm}/roles",
                    method(HttpMethod.POST),
                    new HttpEntity<>(payload, headerMap(jsonHeaders(token))),
                    Void.class,
                    properties.getRealm()
            );
        } catch (RestClientResponseException ex) {
            if (ex.getStatusCode().value() == 409) {
                return;
            }
            throw mapException("Failed to create missing role in Keycloak", ex);
        } catch (RestClientException ex) {
            throw new ExternalServiceException("Failed to create missing role in Keycloak", ex);
        }
    }

    private String defaultRoleDescription(String roleName) {
        return switch (roleName) {
            case "ADMIN" -> "Administrateur global";
            case "EMPLOYE" -> "Employe CNSTN";
            case "CHEF_HIERARCHIQUE" -> "Chef hierarchique";
            case "RESPONSABLE_SALLE" -> "Responsable salle";
            case "RESPONSABLE_SECURITE" -> "Responsable securite";
            case "RESPONSABLE_IT" -> "Responsable IT";
            case "DIRECTEUR_DSN" -> "Directeur DSN";
            case "RESPONSABLE_QUALITE" -> "Responsable qualite";
            default -> roleName.replace('_', ' ');
        };
    }

    private Optional<UUID> findUserIdByField(String fieldName, String value, String token) {
        ResponseEntity<KeycloakUserRepresentation[]> response = restTemplate.exchange(
                "/admin/realms/{realm}/users?{fieldName}={value}&exact=true",
                method(HttpMethod.GET),
                new HttpEntity<>(headerMap(jsonHeaders(token))),
                KeycloakUserRepresentation[].class,
                Map.of(
                        "realm", properties.getRealm(),
                        "fieldName", fieldName,
                        "value", value
                )
        );

        KeycloakUserRepresentation[] users = response.getBody();
        if (users == null || users.length == 0) {
            return Optional.empty();
        }

        return Arrays.stream(users)
                .map(KeycloakUserRepresentation::getId)
                .map(this::parseUuidSafely)
                .flatMap(Optional::stream)
                .findFirst();
    }

    private Optional<UUID> parseUuidSafely(String rawId) {
        String safeId = normalize(rawId);
        if (safeId.isBlank()) {
            return Optional.empty();
        }

        try {
            return Optional.of(UUID.fromString(safeId));
        } catch (IllegalArgumentException ex) {
            return Optional.empty();
        }
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim();
    }
}
