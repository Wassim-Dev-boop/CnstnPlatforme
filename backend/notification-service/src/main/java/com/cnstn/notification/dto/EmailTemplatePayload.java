package com.cnstn.notification.dto;

public record EmailTemplatePayload(
        String subject,
        String htmlBody
) {
}

