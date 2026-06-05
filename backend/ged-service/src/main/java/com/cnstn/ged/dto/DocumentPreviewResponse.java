package com.cnstn.ged.dto;

import java.util.List;
import java.util.UUID;

public record DocumentPreviewResponse(
        UUID documentId,
        String referenceCode,
        String title,
        int versionNumber,
        String fileName,
        String mimeType,
        int totalPages,
        int currentPage,
        int pageSize,
        int zoomPercent,
        String query,
        List<Integer> matchedPages,
        String pageContent,
        boolean canDownload
) {
}
