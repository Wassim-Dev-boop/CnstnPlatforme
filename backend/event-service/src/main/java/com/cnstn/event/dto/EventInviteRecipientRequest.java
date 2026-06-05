package com.cnstn.event.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record EventInviteRecipientRequest(
        @NotBlank @Size(max = 120) String username,
        @NotBlank @Email @Size(max = 190) String email,
        @NotBlank @Size(max = 150) String displayName
) {
}

