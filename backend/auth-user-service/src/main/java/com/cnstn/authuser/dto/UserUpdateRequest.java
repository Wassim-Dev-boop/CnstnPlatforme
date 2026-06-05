package com.cnstn.authuser.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.UUID;

public record UserUpdateRequest(
        @NotBlank @Email @Size(max = 190) String email,
        @NotBlank @Size(max = 120) String firstName,
        @NotBlank @Size(max = 120) String lastName,
        @Size(max = 32) String phone,
        @NotNull UUID departmentId,
        @NotNull Boolean enabled
) {
}
