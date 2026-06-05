package com.cnstn.intervention.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record InterventionCreateRequest(
        @NotBlank @Size(max = 150) String title,
        @NotBlank @Size(max = 1000) String description,
        @Size(max = 40) String type,
        @Size(max = 20) String priority,
        @Size(max = 200) String location
) {
}
