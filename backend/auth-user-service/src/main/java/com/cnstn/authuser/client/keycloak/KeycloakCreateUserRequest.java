package com.cnstn.authuser.client.keycloak;

public record KeycloakCreateUserRequest(
        String username,
        String email,
        String firstName,
        String lastName,
        boolean enabled,
        String phone,
        String initialPassword,
        boolean temporaryPassword,
        boolean forcePasswordUpdate
) {
}
