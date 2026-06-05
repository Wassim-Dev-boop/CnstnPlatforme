package com.cnstn.event.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import java.util.List;

public record EventInviteRequest(
        @NotEmpty @Valid List<EventInviteRecipientRequest> recipients,
        @Size(max = 1000) String message
) {
}

