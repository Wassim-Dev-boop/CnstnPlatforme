package com.cnstn.authuser.client.notification;

import com.cnstn.authuser.exception.ExternalServiceException;
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
public class NotificationAppClient {

    private final RestTemplate notificationRestTemplate;
    private final NotificationClientProperties properties;

    public NotificationAppClient(
            @Qualifier("notificationRestTemplate") RestTemplate notificationRestTemplate,
            NotificationClientProperties properties
    ) {
        this.notificationRestTemplate = notificationRestTemplate;
        this.properties = properties;
    }

    public void sendInAppNotification(String recipientUsername, String title, String message) {
        InternalNotificationRequest request = new InternalNotificationRequest(
                recipientUsername,
                title,
                message
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
            throw new ExternalServiceException(
                    "Failed to send internal app notification: status=" + ex.getStatusCode().value()
                            + ", body=" + ex.getResponseBodyAsString(),
                    ex
            );
        } catch (RestClientException ex) {
            throw new ExternalServiceException("Failed to send internal app notification", ex);
        }
    }
}
