package com.cnstn.ged.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.UUID;

public record FolderUpsertRequest(
        @NotBlank @Size(max = 160) String name,
        UUID parentId,
        @Size(max = 120) String category
) {
}
