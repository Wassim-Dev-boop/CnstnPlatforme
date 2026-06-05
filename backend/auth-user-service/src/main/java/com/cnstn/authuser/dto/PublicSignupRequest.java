package com.cnstn.authuser.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.UUID;

public record PublicSignupRequest(
        @NotBlank @Size(max = 120) String firstName,
        @NotBlank @Size(max = 120) String lastName,
        @NotBlank @Email @Size(max = 190) String email,
        @Size(max = 32) String phone,
        UUID departmentId,
        @NotBlank @Size(min = 8, max = 128) String password,
        @NotBlank @Size(min = 8, max = 128) String confirmPassword
) {
}
