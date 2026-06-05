package com.cnstn.authuser.dto;

import com.cnstn.authuser.entity.RoleName;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.Set;
import java.util.UUID;

public record UserCreateRequest(
        @NotBlank @Size(max = 120) String username,
        @NotBlank @Email @Size(max = 190) String email,
        @NotBlank @Size(max = 120) String firstName,
        @NotBlank @Size(max = 120) String lastName,
        @Size(max = 32) String phone,
        @NotNull UUID departmentId,
        @NotEmpty Set<RoleName> roles,
        Boolean enabled,
        @Size(max = 128) String initialPassword
) {
}
