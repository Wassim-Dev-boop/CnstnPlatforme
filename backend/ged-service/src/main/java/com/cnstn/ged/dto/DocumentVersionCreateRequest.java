package com.cnstn.ged.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record DocumentVersionCreateRequest(
        @NotBlank String content,
        @NotBlank @Size(max = 220) String fileName,
        @NotBlank @Size(max = 120) String mimeType,
        @Size(max = 500) String changeNote
) {
}
