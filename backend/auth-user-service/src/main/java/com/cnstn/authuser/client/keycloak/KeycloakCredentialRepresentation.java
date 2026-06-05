package com.cnstn.authuser.client.keycloak;

public record KeycloakCredentialRepresentation(
        String type,
        String value,
        Boolean temporary
) {
}
