package com.cnstn.event.dto;

public record EventPhotoContent(
        String fileName,
        String contentType,
        byte[] content
) {
}
