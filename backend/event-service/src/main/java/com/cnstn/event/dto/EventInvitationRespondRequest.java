package com.cnstn.event.dto;

import jakarta.validation.constraints.Size;

public record EventInvitationRespondRequest(
        @Size(max = 500) String reason
) {
}

