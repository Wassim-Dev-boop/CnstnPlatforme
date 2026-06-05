package com.cnstn.notification.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record EmailSendRequest(
        @NotBlank @Email @Size(max = 190) String to,
        @NotBlank @Size(max = 200) String subject,
        @NotBlank @Size(max = 10000) String body,
        Boolean html
) {
}

