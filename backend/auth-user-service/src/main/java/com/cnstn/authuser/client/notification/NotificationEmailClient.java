package com.cnstn.authuser.client.notification;

import com.cnstn.authuser.exception.ExternalServiceException;
import java.util.Objects;
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
public class NotificationEmailClient {

    private final RestTemplate notificationRestTemplate;
    private final NotificationClientProperties properties;

    public NotificationEmailClient(
            @Qualifier("notificationRestTemplate") RestTemplate notificationRestTemplate,
            NotificationClientProperties properties
    ) {
        this.notificationRestTemplate = notificationRestTemplate;
        this.properties = properties;
    }

    public void sendPasswordResetEmail(String to, String fullName, String resetLink, long expiryMinutes) {
        String safeName = (fullName == null || fullName.isBlank()) ? "Utilisateur" : fullName.trim();
        String subject = "Reinitialisation de mot de passe CNSTN";
        String body = """
                Bonjour %s,

                Vous avez demande la reinitialisation de votre mot de passe.
                Cliquez sur ce lien pour definir un nouveau mot de passe:
                %s

                Ce lien est valide pendant %d minutes.
                Si vous n'etes pas a l'origine de cette demande, ignorez ce message.
                """.formatted(safeName, Objects.requireNonNull(resetLink), expiryMinutes);

        InternalEmailRequest request = new InternalEmailRequest(
                Objects.requireNonNull(to),
                subject,
                body,
                false
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
            throw new ExternalServiceException(
                    "Failed to send reset password email: status=" + ex.getStatusCode().value()
                            + ", body=" + ex.getResponseBodyAsString(),
                    ex
            );
        } catch (RestClientException ex) {
            throw new ExternalServiceException("Failed to send reset password email", ex);
        }
    }
}

