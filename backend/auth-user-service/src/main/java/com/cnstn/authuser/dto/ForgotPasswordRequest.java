package com.cnstn.authuser.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ForgotPasswordRequest(
        @NotBlank(message = "L email est obligatoire")
        @Email(message = "Le format de l email est invalide")
        @Size(max = 190, message = "L email est trop long")
        String email
) {
}

