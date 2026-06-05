package com.cnstn.reservation.dto;

public record ReservationDocumentContent(
        String fileName,
        String mimeType,
        byte[] content
) {
}
