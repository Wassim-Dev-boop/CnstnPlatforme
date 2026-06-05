package com.cnstn.notification.service;

import com.cnstn.notification.dto.EmailTemplatePayload;
import com.cnstn.notification.entity.NotificationEntity;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import org.springframework.stereotype.Service;

@Service
public class EmailTemplateService {

    private static final DateTimeFormatter DATE_FORMATTER =
            DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm", Locale.FRENCH).withZone(ZoneId.of("Africa/Lagos"));

    public EmailTemplatePayload buildTemplate(NotificationEntity notification, String notificationType) {
        String safeType = normalizeType(notificationType, notification.getTitle());
        String subject = "[CNSTN] " + buildSubjectLabel(safeType, notification.getTitle());
        Instant sentAt = notification.getCreatedAt() == null ? Instant.now() : notification.getCreatedAt();
        String body = """
                <div style="font-family: Arial, sans-serif; line-height:1.5; color:#1f2937;">
                  <h2 style="margin:0 0 12px 0;">Plateforme intranet CNSTN</h2>
                  <p style="margin:0 0 10px 0;"><strong>%s</strong></p>
                  <p style="margin:0 0 12px 0;">%s</p>
                  <table style="border-collapse:collapse; margin-bottom:16px;">
                    <tr><td style="padding:4px 10px 4px 0;"><strong>Type</strong></td><td style="padding:4px 0;">%s</td></tr>
                    <tr><td style="padding:4px 10px 4px 0;"><strong>Date</strong></td><td style="padding:4px 0;">%s</td></tr>
                  </table>
                  <p style="margin:0;">Ceci est un message automatique de la plateforme intranet CNSTN.</p>
                </div>
                """.formatted(
                escapeHtml(notification.getTitle()),
                escapeHtml(notification.getMessage()),
                escapeHtml(formatTypeLabel(safeType)),
                DATE_FORMATTER.format(sentAt)
        );
        return new EmailTemplatePayload(subject, body);
    }

    private String normalizeType(String notificationType, String title) {
        if (notificationType != null && !notificationType.isBlank()) {
            return notificationType.trim().toUpperCase(Locale.ROOT);
        }
        if (title == null) {
            return "SYSTEM_ALERT";
        }
        String normalized = title.toLowerCase(Locale.ROOT);
        if (normalized.contains("compte")) {
            return "ACCOUNT";
        }
        if (normalized.contains("evenement")) {
            return "EVENT";
        }
        if (normalized.contains("reservation")) {
            return "RESERVATION";
        }
        if (normalized.contains("intervention")) {
            return "INTERVENTION";
        }
        if (normalized.contains("document") || normalized.contains("acl")) {
            return "GED";
        }
        if (normalized.contains("partenaire")) {
            return "PARTNER_ACCESS";
        }
        return "SYSTEM_ALERT";
    }

    private String buildSubjectLabel(String notificationType, String fallbackTitle) {
        return switch (notificationType) {
            case "ACCOUNT" -> "Mise a jour de votre compte";
            case "EVENT" -> "Mise a jour evenement";
            case "RESERVATION" -> "Mise a jour reservation";
            case "INTERVENTION" -> "Mise a jour intervention";
            case "GED" -> "Mise a jour documentaire";
            case "PARTNER_ACCESS" -> "Mise a jour acces partenaire";
            default -> fallbackTitle == null ? "Notification systeme" : fallbackTitle;
        };
    }

    private String formatTypeLabel(String notificationType) {
        return switch (notificationType) {
            case "ACCOUNT" -> "Compte utilisateur";
            case "EVENT" -> "Evenement";
            case "RESERVATION" -> "Reservation";
            case "INTERVENTION" -> "Intervention";
            case "GED" -> "Document GED";
            case "PARTNER_ACCESS" -> "Acces partenaire";
            default -> "Systeme";
        };
    }

    private String escapeHtml(String value) {
        if (value == null) {
            return "";
        }
        return value
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;");
    }
}
