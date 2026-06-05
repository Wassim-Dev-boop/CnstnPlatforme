package com.cnstn.notification.service;

import com.cnstn.notification.client.UserDirectoryClient;
import com.cnstn.notification.dto.EmailTemplatePayload;
import com.cnstn.notification.dto.InternalUserSummaryResponse;
import com.cnstn.notification.dto.NotificationCreateRequest;
import com.cnstn.notification.entity.EmailDeliveryStatus;
import com.cnstn.notification.entity.NotificationEmailLogEntity;
import com.cnstn.notification.entity.NotificationEntity;
import com.cnstn.notification.entity.NotificationPriority;
import com.cnstn.notification.repository.NotificationEmailLogRepository;
import java.time.Instant;
import java.util.Locale;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class NotificationEmailDispatchService {

    private final NotificationEmailLogRepository emailLogRepository;
    private final EmailService emailService;
    private final EmailTemplateService templateService;
    private final UserDirectoryClient userDirectoryClient;
    private final boolean mailEnabled;
    private final NotificationPriority minEmailPriority;

    public NotificationEmailDispatchService(
            NotificationEmailLogRepository emailLogRepository,
            EmailService emailService,
            EmailTemplateService templateService,
            UserDirectoryClient userDirectoryClient,
            @Value("${app.mail.enabled:${MAIL_ENABLED:true}}") boolean mailEnabled,
            @Value("${app.mail.min-priority:${MAIL_MIN_PRIORITY:HIGH}}") String minPriorityRaw
    ) {
        this.emailLogRepository = emailLogRepository;
        this.emailService = emailService;
        this.templateService = templateService;
        this.userDirectoryClient = userDirectoryClient;
        this.mailEnabled = mailEnabled;
        this.minEmailPriority = parsePriority(minPriorityRaw, NotificationPriority.HIGH);
    }

    @Transactional
    public EmailDispatchResult dispatchForNotification(NotificationEntity notification, NotificationCreateRequest request) {
        if (Boolean.TRUE.equals(request.inAppOnly())) {
            return persistSkipped(notification, request, "Notification configuree en mode in-app only");
        }

        if (!mailEnabled) {
            return persistSkipped(notification, request, "Envoi email desactive par configuration");
        }

        NotificationPriority effectivePriority = request.effectivePriority();
        if (!effectivePriority.atLeast(minEmailPriority)) {
            return persistSkipped(
                    notification,
                    request,
                    "Priorite " + effectivePriority + " inferieure au seuil email (" + minEmailPriority + ")"
            );
        }

        ResolvedRecipient recipient = resolveRecipient(notification.getRecipientUsername(), request.recipientEmail());
        if (recipient.email() == null || recipient.email().isBlank()) {
            return persistSkipped(notification, request, "Aucun email disponible pour le destinataire");
        }

        NotificationEmailLogEntity log = new NotificationEmailLogEntity();
        log.setNotificationId(notification.getId());
        log.setRecipientUsername(notification.getRecipientUsername());
        log.setRecipientEmail(recipient.email());
        log.setNotificationType(normalizeType(request.notificationType()));
        log.setStatus(EmailDeliveryStatus.PENDING);

        EmailTemplatePayload template = templateService.buildTemplate(notification, request.notificationType());
        log.setEmailSubject(template.subject());
        log.setAttemptedAt(Instant.now());
        NotificationEmailLogEntity persisted = emailLogRepository.save(log);

        try {
            emailService.sendEmail(recipient.email(), template.subject(), template.htmlBody(), true);
            persisted.setStatus(EmailDeliveryStatus.SENT);
            persisted.setFailureReason(null);
            persisted.setAttemptedAt(Instant.now());
            emailLogRepository.save(persisted);
            return new EmailDispatchResult(EmailDeliveryStatus.SENT, null, persisted.getAttemptedAt());
        } catch (RuntimeException ex) {
            String reason = truncate(ex.getMessage(), 1100);
            persisted.setStatus(EmailDeliveryStatus.FAILED);
            persisted.setFailureReason(reason);
            persisted.setAttemptedAt(Instant.now());
            emailLogRepository.save(persisted);
            return new EmailDispatchResult(EmailDeliveryStatus.FAILED, reason, persisted.getAttemptedAt());
        }
    }

    @Transactional
    public EmailDispatchResult resend(NotificationEntity notification) {
        NotificationCreateRequest request = new NotificationCreateRequest(
                notification.getRecipientUsername(),
                notification.getTitle(),
                notification.getMessage(),
                null,
                inferNotificationType(notification.getTitle(), notification.getMessage()),
                null,
                false,
                notification.getPriority() == null ? NotificationPriority.NORMAL : notification.getPriority()
        );
        return dispatchForNotification(notification, request);
    }

    private EmailDispatchResult persistSkipped(
            NotificationEntity notification,
            NotificationCreateRequest request,
            String reason
    ) {
        NotificationEmailLogEntity log = new NotificationEmailLogEntity();
        log.setNotificationId(notification.getId());
        log.setRecipientUsername(notification.getRecipientUsername());
        log.setRecipientEmail(sanitize(request.recipientEmail()));
        log.setNotificationType(normalizeType(request.notificationType()));
        log.setStatus(EmailDeliveryStatus.SKIPPED);
        log.setFailureReason(reason);
        log.setEmailSubject("[CNSTN] " + truncate(notification.getTitle(), 180));
        log.setAttemptedAt(Instant.now());
        NotificationEmailLogEntity saved = emailLogRepository.save(log);
        return new EmailDispatchResult(EmailDeliveryStatus.SKIPPED, reason, saved.getAttemptedAt());
    }

    private ResolvedRecipient resolveRecipient(String username, String providedEmail) {
        String safeProvided = sanitize(providedEmail);
        if (safeProvided != null && !safeProvided.isBlank()) {
            return new ResolvedRecipient(safeProvided);
        }

        Optional<InternalUserSummaryResponse> summary = userDirectoryClient.findByUsername(username);
        if (summary.isEmpty()) {
            return new ResolvedRecipient(null);
        }
        return new ResolvedRecipient(sanitize(summary.get().email()));
    }

    private NotificationPriority parsePriority(String raw, NotificationPriority fallback) {
        if (raw == null || raw.isBlank()) {
            return fallback;
        }
        try {
            return NotificationPriority.valueOf(raw.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            return fallback;
        }
    }

    private String sanitize(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        return normalized.isBlank() ? null : normalized;
    }

    private String truncate(String value, int maxLength) {
        if (value == null) {
            return null;
        }
        return value.length() <= maxLength ? value : value.substring(0, maxLength);
    }

    private String normalizeType(String type) {
        if (type == null || type.isBlank()) {
            return null;
        }
        return type.trim().toUpperCase(Locale.ROOT);
    }

    private String inferNotificationType(String title, String message) {
        String text = (title + " " + message).toLowerCase(Locale.ROOT);
        if (text.contains("compte")) {
            return "ACCOUNT";
        }
        if (text.contains("evenement")) {
            return "EVENT";
        }
        if (text.contains("reservation")) {
            return "RESERVATION";
        }
        if (text.contains("intervention")) {
            return "INTERVENTION";
        }
        if (text.contains("document") || text.contains("acl")) {
            return "GED";
        }
        if (text.contains("partenaire")) {
            return "PARTNER_ACCESS";
        }
        return "SYSTEM_ALERT";
    }

    private record ResolvedRecipient(String email) {
    }

    public record EmailDispatchResult(
            EmailDeliveryStatus status,
            String errorReason,
            Instant attemptedAt
    ) {
    }
}
