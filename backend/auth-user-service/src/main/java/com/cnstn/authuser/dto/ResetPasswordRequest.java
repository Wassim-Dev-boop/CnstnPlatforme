package com.cnstn.authuser.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ResetPasswordRequest(
        @NotBlank(message = "Le token de reinitialisation est obligatoire")
        @Size(min = 20, max = 512, message = "Le token de reinitialisation est invalide")
        String token,
        @NotBlank(message = "Le nouveau mot de passe est obligatoire")
        @Size(min = 8, max = 120, message = "Le nouveau mot de passe doit contenir entre 8 et 120 caracteres")
        String newPassword,
        @NotBlank(message = "La confirmation du mot de passe est obligatoire")
        @Size(min = 8, max = 120, message = "La confirmation du mot de passe doit contenir entre 8 et 120 caracteres")
        String confirmPassword
) {
}

