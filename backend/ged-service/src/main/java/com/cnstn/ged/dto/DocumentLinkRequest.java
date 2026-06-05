package com.cnstn.ged.dto;

import com.cnstn.ged.entity.DocumentLinkType;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record DocumentLinkRequest(
        @NotNull UUID linkedDocumentId,
        @NotNull DocumentLinkType relationType
) {
}
