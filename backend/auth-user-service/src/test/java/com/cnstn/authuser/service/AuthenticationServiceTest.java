package com.cnstn.authuser.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.cnstn.authuser.client.keycloak.KeycloakProperties;
import com.cnstn.authuser.client.keycloak.KeycloakTokenResponse;
import com.cnstn.authuser.dto.LoginRequest;
import com.cnstn.authuser.dto.LoginResponse;
import com.cnstn.authuser.exception.UnauthorizedException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

@ExtendWith(MockitoExtension.class)
class AuthenticationServiceTest {

    @Mock
    private RestTemplate keycloakRestTemplate;

    private AuthenticationService authenticationService;

    @BeforeEach
    void setUp() {
        KeycloakProperties keycloakProperties = new KeycloakProperties();
        keycloakProperties.setRealm("cnstn-intranet");
        keycloakProperties.setLoginClientId("cnstn-postman");
        keycloakProperties.setLoginClientSecret("login-secret");

        authenticationService = new AuthenticationService(keycloakRestTemplate, keycloakProperties);
    }

    @Test
    void login_shouldRetryWithCnstnSuffix_whenIdentifierEndsWithLegacySuffix() {
        when(keycloakRestTemplate.exchange(
                eq("/realms/{realm}/protocol/openid-connect/token"),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(KeycloakTokenResponse.class),
                eq("cnstn-intranet")
        )).thenThrow(unauthorized())
                .thenReturn(ResponseEntity.ok(new KeycloakTokenResponse("access-token", "refresh-token")));

        LoginResponse response = authenticationService.login(new LoginRequest("employe.cnst", "User@12345"));

        assertThat(response.accessToken()).isEqualTo("access-token");
        assertThat(response.refreshToken()).isEqualTo("refresh-token");

        assertThat(extractSubmittedUsernames()).containsExactly("employe.cnst", "employe.cnstn");
    }

    @Test
    void login_shouldRetryWithDefaultDomainSuffix_whenIdentifierHasNoDot() {
        when(keycloakRestTemplate.exchange(
                eq("/realms/{realm}/protocol/openid-connect/token"),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(KeycloakTokenResponse.class),
                eq("cnstn-intranet")
        )).thenThrow(unauthorized())
                .thenReturn(ResponseEntity.ok(new KeycloakTokenResponse("access-token", "refresh-token")));

        LoginResponse response = authenticationService.login(new LoginRequest("employe", "User@12345"));

        assertThat(response.accessToken()).isEqualTo("access-token");
        assertThat(response.refreshToken()).isEqualTo("refresh-token");

        assertThat(extractSubmittedUsernames()).containsExactly("employe", "employe.cnstn");
    }

    @Test
    void login_shouldFail_whenAllCandidatesAreRejectedByKeycloak() {
        when(keycloakRestTemplate.exchange(
                eq("/realms/{realm}/protocol/openid-connect/token"),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(KeycloakTokenResponse.class),
                eq("cnstn-intranet")
        )).thenThrow(unauthorized())
                .thenThrow(unauthorized());

        assertThatThrownBy(() -> authenticationService.login(new LoginRequest("employe.cnst", "wrong")))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessage("Identifiant ou mot de passe invalide.");

        verify(keycloakRestTemplate, times(2)).exchange(
                eq("/realms/{realm}/protocol/openid-connect/token"),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(KeycloakTokenResponse.class),
                eq("cnstn-intranet")
        );
    }

    private List<String> extractSubmittedUsernames() {
        ArgumentCaptor<HttpEntity> requestCaptor = ArgumentCaptor.forClass(HttpEntity.class);
        verify(keycloakRestTemplate, times(2)).exchange(
                eq("/realms/{realm}/protocol/openid-connect/token"),
                eq(HttpMethod.POST),
                requestCaptor.capture(),
                eq(KeycloakTokenResponse.class),
                eq("cnstn-intranet")
        );

        return requestCaptor.getAllValues().stream()
                .map(HttpEntity::getBody)
                .map(body -> (MultiValueMap<String, String>) body)
                .map(formData -> formData.getFirst("username"))
                .toList();
    }

    private HttpClientErrorException unauthorized() {
        return HttpClientErrorException.create(
                HttpStatus.UNAUTHORIZED,
                "Unauthorized",
                HttpHeaders.EMPTY,
                "{\"error\":\"invalid_grant\"}".getBytes(StandardCharsets.UTF_8),
                StandardCharsets.UTF_8
        );
    }
}
