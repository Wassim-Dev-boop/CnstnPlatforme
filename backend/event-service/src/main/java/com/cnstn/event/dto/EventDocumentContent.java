package com.cnstn.event.dto;

public record EventDocumentContent(
        String fileName,
        String mimeType,
        byte[] content
) {
}
