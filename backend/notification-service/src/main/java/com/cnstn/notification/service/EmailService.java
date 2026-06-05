package com.cnstn.notification.service;

import com.cnstn.notification.dto.EmailSendRequest;
import com.cnstn.notification.exception.EmailDeliveryException;
import com.cnstn.notification.exception.InvalidInternalApiKeyException;
import java.util.Objects;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private final JavaMailSender mailSender;
    private final String internalApiKey;
    private final String fromAddress;

    public EmailService(
            JavaMailSender mailSender,
            @Value("${app.internal.api-key:change-me}") String internalApiKey,
            @Value("${app.mail.from:no-reply@cnstn.local}") String fromAddress
    ) {
        this.mailSender = mailSender;
        this.internalApiKey = internalApiKey;
        this.fromAddress = fromAddress;
    }

    public void sendInternalEmail(String providedApiKey, EmailSendRequest request) {
        if (providedApiKey == null || !Objects.equals(internalApiKey, providedApiKey)) {
            throw new InvalidInternalApiKeyException();
        }

        sendEmail(request.to().trim(), request.subject().trim(), request.body().trim(), Boolean.TRUE.equals(request.html()));
    }

    public void sendEmail(String to, String subject, String body, boolean html) {
        try {
            var mimeMessage = mailSender.createMimeMessage();
            var helper = new MimeMessageHelper(mimeMessage, false, "UTF-8");
            helper.setFrom(fromAddress);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(body, html);
            mailSender.send(mimeMessage);
        } catch (jakarta.mail.MessagingException | MailException ex) {
            throw new EmailDeliveryException("Failed to deliver email", ex);
        }
    }
}
