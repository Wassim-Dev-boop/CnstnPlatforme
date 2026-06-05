package com.cnstn.ged.dto;

import java.util.List;
import java.util.UUID;

public record FolderTreeResponse(
        UUID id,
        String name,
        UUID parentId,
        String category,
        boolean archived,
        int documentCount,
        List<FolderTreeResponse> children
) {
}
