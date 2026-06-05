package com.cnstn.authuser.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record LoginRequest(
        @NotBlank @Size(max = 190) String identifier,
        @NotBlank @Size(max = 128) String password
) {
}
