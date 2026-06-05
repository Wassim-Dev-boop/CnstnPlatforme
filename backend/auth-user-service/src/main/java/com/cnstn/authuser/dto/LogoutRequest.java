package com.cnstn.authuser.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record LogoutRequest(
        @JsonProperty("refresh_token")
        @NotBlank
        @Size(max = 4000)
        String refreshToken
) {
}
