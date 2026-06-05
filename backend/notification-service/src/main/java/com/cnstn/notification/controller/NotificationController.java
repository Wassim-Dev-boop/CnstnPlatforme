package com.cnstn.notification.controller;

import com.cnstn.notification.dto.EmailDeliveryLogResponse;
import com.cnstn.notification.dto.EmailDeliveryStatusResponse;
import com.cnstn.notification.dto.NotificationCreateRequest;
import com.cnstn.notification.dto.NotificationResponse;
import com.cnstn.notification.dto.PageResponse;
import com.cnstn.notification.dto.UnreadCountResponse;
import com.cnstn.notification.service.NotificationService;
import jakarta.validation.Valid;
import java.security.Principal;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/api/v1/notifications")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','EMPLOYE','CHEF_HIERARCHIQUE','RESPONSABLE_SALLE','RESPONSABLE_SECURITE','RESPONSABLE_IT','DIRECTEUR_DSN','RESPONSABLE_QUALITE')")
    public PageResponse<NotificationResponse> myNotifications(
            Principal principal,
            Pageable pageable,
            @RequestParam(required = false) Boolean unread,
            @RequestParam(required = false) String search
    ) {
        return notificationService.myNotifications(principal.getName(), pageable, unread, search);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('ADMIN','DIRECTEUR_DSN','CHEF_HIERARCHIQUE')")
    public NotificationResponse create(@Valid @RequestBody NotificationCreateRequest request) {
        return notificationService.create(request);
    }

    @PutMapping("/{id}/read")
    @PreAuthorize("hasAnyRole('ADMIN','EMPLOYE','CHEF_HIERARCHIQUE','RESPONSABLE_SALLE','RESPONSABLE_SECURITE','RESPONSABLE_IT','DIRECTEUR_DSN','RESPONSABLE_QUALITE')")
    public NotificationResponse markRead(@PathVariable UUID id, Principal principal) {
        return notificationService.markRead(id, principal.getName());
    }

    @PutMapping("/read-all")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAnyRole('ADMIN','EMPLOYE','CHEF_HIERARCHIQUE','RESPONSABLE_SALLE','RESPONSABLE_SECURITE','RESPONSABLE_IT','DIRECTEUR_DSN','RESPONSABLE_QUALITE')")
    public void markAllRead(Principal principal) {
        notificationService.markAllRead(principal.getName());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAnyRole('ADMIN','EMPLOYE','CHEF_HIERARCHIQUE','RESPONSABLE_SALLE','RESPONSABLE_SECURITE','RESPONSABLE_IT','DIRECTEUR_DSN','RESPONSABLE_QUALITE')")
    public void delete(@PathVariable UUID id, Principal principal) {
        notificationService.delete(id, principal.getName());
    }

    @GetMapping("/unread-count")
    @PreAuthorize("hasAnyRole('ADMIN','EMPLOYE','CHEF_HIERARCHIQUE','RESPONSABLE_SALLE','RESPONSABLE_SECURITE','RESPONSABLE_IT','DIRECTEUR_DSN','RESPONSABLE_QUALITE')")
    public UnreadCountResponse unreadCount(Principal principal) {
        return new UnreadCountResponse(notificationService.unreadCount(principal.getName()));
    }

    @GetMapping("/stream")
    @PreAuthorize("hasAnyRole('ADMIN','EMPLOYE','CHEF_HIERARCHIQUE','RESPONSABLE_SALLE','RESPONSABLE_SECURITE','RESPONSABLE_IT','DIRECTEUR_DSN','RESPONSABLE_QUALITE')")
    public SseEmitter stream(Principal principal) {
        return notificationService.subscribe(principal.getName());
    }

    @GetMapping("/email-logs")
    @PreAuthorize("hasAnyRole('ADMIN','DIRECTEUR_DSN','RESPONSABLE_QUALITE')")
    public PageResponse<EmailDeliveryLogResponse> emailLogs(
            @RequestParam(required = false) UUID notificationId,
            @RequestParam(required = false) String status,
            Pageable pageable
    ) {
        return notificationService.emailLogs(notificationId, status, pageable);
    }

    @GetMapping("/{id}/email-status")
    @PreAuthorize("hasAnyRole('ADMIN','DIRECTEUR_DSN','RESPONSABLE_QUALITE')")
    public EmailDeliveryStatusResponse emailStatus(@PathVariable UUID id) {
        return notificationService.emailStatus(id);
    }

    @PostMapping("/{id}/resend-email")
    @PreAuthorize("hasAnyRole('ADMIN','DIRECTEUR_DSN','RESPONSABLE_QUALITE')")
    public EmailDeliveryStatusResponse resendEmail(@PathVariable UUID id) {
        return notificationService.resendEmail(id);
    }
}
