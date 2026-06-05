package com.cnstn.ged.dto;

import jakarta.validation.constraints.Size;

public record DocumentVersionUploadMetadataRequest(
        @Size(max = 500) String changeNote
) {
}
