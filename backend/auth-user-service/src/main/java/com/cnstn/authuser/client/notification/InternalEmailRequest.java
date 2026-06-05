package com.cnstn.authuser.client.notification;

public record InternalEmailRequest(
        String to,
        String subject,
        String body,
        Boolean html
) {
}

