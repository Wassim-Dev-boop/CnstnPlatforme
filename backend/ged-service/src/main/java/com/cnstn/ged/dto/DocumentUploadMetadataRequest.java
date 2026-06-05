package com.cnstn.ged.dto;

import com.cnstn.ged.entity.DocumentConfidentialityLevel;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;

public record DocumentUploadMetadataRequest(
        @NotNull UUID folderId,
        @NotBlank @Size(max = 180) String title,
        @NotBlank @Size(max = 120) String category,
        @Size(max = 80) String subCategory,
        @Size(max = 2000) String description,
        @NotNull DocumentConfidentialityLevel confidentialityLevel,
        List<String> allowedRoles,
        List<String> allowedServices
) {
}
