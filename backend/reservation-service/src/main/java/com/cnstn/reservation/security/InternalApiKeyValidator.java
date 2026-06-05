package com.cnstn.reservation.security;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;

@Component
public class InternalApiKeyValidator {

    private final InternalApiKeyProperties properties;

    public InternalApiKeyValidator(InternalApiKeyProperties properties) {
        this.properties = properties;
    }

    public void validate(String providedApiKey) {
        String expectedApiKey = properties.getApiKey();
        if (providedApiKey == null || !providedApiKey.equals(expectedApiKey)) {
            throw new AccessDeniedException("Cle API interne invalide");
        }
    }
}
