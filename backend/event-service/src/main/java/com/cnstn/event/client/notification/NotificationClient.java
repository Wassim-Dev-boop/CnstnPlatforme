package com.cnstn.event.client.notification;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.client.RestTemplate;

@Component
public class NotificationClient {

    private final RestTemplate notificationRestTemplate;
    private final NotificationClientProperties properties;

    public NotificationClient(
            @Qualifier("notificationRestTemplate") RestTemplate notificationRestTemplate,
            NotificationClientProperties properties
    ) {
        this.notificationRestTemplate = notificationRestTemplate;
        this.properties = properties;
    }

    public void sendInternalNotification(String recipientUsername, String title, String message) {
        sendInternalNotification(recipientUsername, title, message, null);
    }

    public void sendInternalNotification(String recipientUsername, String title, String message, String actionUrl) {
        InternalNotificationRequest request = new InternalNotificationRequest(
                recipientUsername,
                title,
                message,
                actionUrl
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("X-Api-Key", properties.getInternalApiKey());

        try {
            notificationRestTemplate.exchange(
                    "/internal/v1/notifications/send",
                    HttpMethod.POST,
                    new HttpEntity<>(request, headers),
                    Void.class
            );
        } catch (RestClientResponseException ex) {
            throw new IllegalStateException(
                    "Failed to send internal notification: status=" + ex.getStatusCode().value()
                            + ", body=" + ex.getResponseBodyAsString(),
                    ex
            );
        } catch (RestClientException ex) {
            throw new IllegalStateException("Failed to send internal notification", ex);
        }
    }

    public void sendInternalEmail(String to, String subject, String body, boolean html) {
        InternalEmailRequest request = new InternalEmailRequest(
                to,
                subject,
                body,
                html
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("X-Api-Key", properties.getInternalApiKey());

        try {
            notificationRestTemplate.exchange(
                    "/internal/v1/emails/send",
                    HttpMethod.POST,
                    new HttpEntity<>(request, headers),
                    Void.class
            );
        } catch (RestClientResponseException ex) {
            throw new IllegalStateException(
                    "Failed to send internal email: status=" + ex.getStatusCode().value()
                            + ", body=" + ex.getResponseBodyAsString(),
                    ex
            );
        } catch (RestClientException ex) {
            throw new IllegalStateException("Failed to send internal email", ex);
        }
    }
}

