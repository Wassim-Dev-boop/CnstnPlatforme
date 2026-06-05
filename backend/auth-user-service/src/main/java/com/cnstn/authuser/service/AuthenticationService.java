package com.cnstn.authuser.service;

import com.cnstn.authuser.client.keycloak.KeycloakProperties;
import com.cnstn.authuser.client.keycloak.KeycloakTokenResponse;
import com.cnstn.authuser.dto.LoginRequest;
import com.cnstn.authuser.dto.LoginResponse;
import com.cnstn.authuser.exception.BadRequestException;
import com.cnstn.authuser.exception.ExternalServiceException;
import com.cnstn.authuser.exception.UnauthorizedException;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.regex.Pattern;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.client.RestTemplate;

@Service
public class AuthenticationService {

    private static final Pattern SUSPICIOUS_IDENTIFIER_PATTERN = Pattern.compile("['\";]|--|/\\*|\\*/");
    private static final String LEGACY_CNST_SUFFIX = ".cnst";
    private static final String CURRENT_CNST_SUFFIX = ".cnstn";

    private final RestTemplate keycloakRestTemplate;
    private final KeycloakProperties keycloakProperties;

    public AuthenticationService(
            @Qualifier("keycloakRestTemplate") RestTemplate keycloakRestTemplate,
            KeycloakProperties keycloakProperties
    ) {
        this.keycloakRestTemplate = keycloakRestTemplate;
        this.keycloakProperties = keycloakProperties;
    }

    public LoginResponse login(LoginRequest request) {
        String identifier = normalize(request.identifier());
        String password = normalize(request.password());
        if (identifier.isBlank() || password.isBlank()) {
            throw new BadRequestException("Identifiant et mot de passe obligatoires.");
        }
        if (SUSPICIOUS_IDENTIFIER_PATTERN.matcher(identifier).find()) {
            throw new BadRequestException("Identifiant invalide.");
        }

        UnauthorizedException lastUnauthorizedException = null;
        for (String loginCandidate : resolveLoginCandidates(identifier)) {
            try {
                return loginAgainstKeycloak(loginCandidate, password);
            } catch (UnauthorizedException ex) {
                lastUnauthorizedException = ex;
            }
        }

        if (lastUnauthorizedException != null) {
            throw lastUnauthorizedException;
        }

        throw new UnauthorizedException("Identifiant ou mot de passe invalide.");
    }

    private LoginResponse loginAgainstKeycloak(String identifier, String password) {
        try {
            MultiValueMap<String, String> formData = new LinkedMultiValueMap<>();
            formData.add("grant_type", "password");
            formData.add("client_id", keycloakProperties.getLoginClientId());
            String loginClientSecret = Objects.requireNonNullElse(keycloakProperties.getLoginClientSecret(), "");
            if (!loginClientSecret.isBlank()) {
                formData.add("client_secret", loginClientSecret);
            }
            formData.add("username", identifier);
            formData.add("password", password);

            HttpHeaders tokenHeaders = new HttpHeaders();
            tokenHeaders.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

            ResponseEntity<KeycloakTokenResponse> response = keycloakRestTemplate.exchange(
                    "/realms/{realm}/protocol/openid-connect/token",
                    HttpMethod.POST,
                    new HttpEntity<>(formData, tokenHeaders),
                    KeycloakTokenResponse.class,
                    keycloakProperties.getRealm()
            );

            KeycloakTokenResponse tokenResponse = response.getBody();
            if (tokenResponse == null || tokenResponse.accessToken() == null || tokenResponse.accessToken().isBlank()) {
                throw new ExternalServiceException("Keycloak token response is empty");
            }

            return new LoginResponse(
                    tokenResponse.accessToken().trim(),
                    normalizeOrNull(tokenResponse.refreshToken())
            );
        } catch (RestClientResponseException ex) {
            int status = ex.getStatusCode().value();
            if (status == 400 || status == 401) {
                String body = normalize(ex.getResponseBodyAsString()).toLowerCase();
                if (body.contains("account_disabled")
                        || body.contains("account disabled")
                        || body.contains("user_disabled")
                        || body.contains("user disabled")) {
                    throw new UnauthorizedException("Compte desactive.");
                }
                throw new UnauthorizedException("Identifiant ou mot de passe invalide.");
            }

            throw new ExternalServiceException(
                    "Failed to authenticate against Keycloak: status=" + status + ", body=" + ex.getResponseBodyAsString(),
                    ex
            );
        } catch (RestClientException ex) {
            throw new ExternalServiceException("Failed to authenticate against Keycloak", ex);
        }
    }

    private List<String> resolveLoginCandidates(String identifier) {
        List<String> candidates = new ArrayList<>();
        addCandidate(candidates, identifier);

        String lowerCaseIdentifier = identifier.toLowerCase(Locale.ROOT);
        if (!identifier.contains("@") && lowerCaseIdentifier.endsWith(LEGACY_CNST_SUFFIX)) {
            addCandidate(candidates, identifier + "n");
        }

        if (!identifier.contains("@")
                && !identifier.contains(".")
                && !identifier.isBlank()) {
            addCandidate(candidates, identifier + CURRENT_CNST_SUFFIX);
        }

        return candidates;
    }

    private void addCandidate(List<String> candidates, String candidate) {
        String normalizedCandidate = normalize(candidate);
        if (normalizedCandidate.isBlank()) {
            return;
        }

        boolean alreadyExists = candidates.stream()
                .anyMatch(existingCandidate -> existingCandidate.equalsIgnoreCase(normalizedCandidate));
        if (!alreadyExists) {
            candidates.add(normalizedCandidate);
        }
    }

    public void logout(String refreshToken) {
        String safeRefreshToken = normalize(refreshToken);
        if (safeRefreshToken.isBlank()) {
            throw new BadRequestException("refresh_token obligatoire.");
        }

        MultiValueMap<String, String> formData = new LinkedMultiValueMap<>();
        formData.add("client_id", keycloakProperties.getLoginClientId());
        String loginClientSecret = Objects.requireNonNullElse(keycloakProperties.getLoginClientSecret(), "");
        if (!loginClientSecret.isBlank()) {
            formData.add("client_secret", loginClientSecret);
        }
        formData.add("refresh_token", safeRefreshToken);

        HttpHeaders tokenHeaders = new HttpHeaders();
        tokenHeaders.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        try {
            keycloakRestTemplate.exchange(
                    "/realms/{realm}/protocol/openid-connect/logout",
                    HttpMethod.POST,
                    new HttpEntity<>(formData, tokenHeaders),
                    Void.class,
                    keycloakProperties.getRealm()
            );
        } catch (RestClientResponseException ex) {
            int status = ex.getStatusCode().value();
            String body = normalize(ex.getResponseBodyAsString()).toLowerCase();
            if (status == 400 && body.contains("invalid_grant")) {
                // Already logged out / token already invalidated: keep endpoint idempotent.
                return;
            }
            if (status == 401) {
                throw new UnauthorizedException("Token expire ou invalide.");
            }
            throw new ExternalServiceException(
                    "Failed to logout against Keycloak: status=" + status + ", body=" + ex.getResponseBodyAsString(),
                    ex
            );
        } catch (RestClientException ex) {
            throw new ExternalServiceException("Failed to logout against Keycloak", ex);
        }
    }

    private String normalize(String value) {
        return Objects.requireNonNullElse(value, "").trim();
    }

    private String normalizeOrNull(String value) {
        String normalized = normalize(value);
        return normalized.isBlank() ? null : normalized;
    }
}
