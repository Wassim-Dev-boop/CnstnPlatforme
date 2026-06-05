package com.cnstn.ged.dto;

public record DocumentDownloadContent(
        String fileName,
        String mimeType,
        byte[] content
) {
}
