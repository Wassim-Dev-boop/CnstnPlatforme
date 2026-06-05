package com.cnstn.event.dto;

import jakarta.validation.constraints.Size;

public record EventSubmissionRequest(
        @Size(max = 500) String comment
) {
}
