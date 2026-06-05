package com.cnstn.notification.service;

import com.cnstn.notification.dto.EmailDeliveryLogResponse;
import com.cnstn.notification.dto.EmailDeliveryStatusResponse;
import com.cnstn.notification.dto.NotificationCreateRequest;
import com.cnstn.notification.dto.NotificationResponse;
import com.cnstn.notification.dto.PageResponse;
import com.cnstn.notification.entity.NotificationEmailLogEntity;
import com.cnstn.notification.entity.NotificationEntity;
import com.cnstn.notification.exception.InvalidInternalApiKeyException;
import com.cnstn.notification.exception.ResourceNotFoundException;
import com.cnstn.notification.mapper.NotificationMapper;
import com.cnstn.notification.repository.NotificationEmailLogRepository;
import com.cnstn.notification.repository.NotificationRepository;
import java.io.IOException;
import jakarta.persistence.criteria.Predicate;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final NotificationEmailLogRepository notificationEmailLogRepository;
    private final NotificationEmailDispatchService notificationEmailDispatchService;
    private final String internalApiKey;
    private final ConcurrentHashMap<String, CopyOnWriteArrayList<SseEmitter>> subscribers = new ConcurrentHashMap<>();

    public NotificationService(
            NotificationRepository notificationRepository,
            NotificationEmailLogRepository notificationEmailLogRepository,
            NotificationEmailDispatchService notificationEmailDispatchService,
            @Value("${app.internal.api-key:change-me}") String internalApiKey
    ) {
        this.notificationRepository = notificationRepository;
        this.notificationEmailLogRepository = notificationEmailLogRepository;
        this.notificationEmailDispatchService = notificationEmailDispatchService;
        this.internalApiKey = internalApiKey;
    }

    @Transactional(readOnly = true)
    public PageResponse<NotificationResponse> myNotifications(String username, Pageable pageable, Boolean unread, String search) {
        String normalizedSearch = normalizeOrNull(search);
        Page<NotificationEntity> page = notificationRepository.findAll((root, query, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(criteriaBuilder.equal(
                    criteriaBuilder.lower(root.get("recipientUsername")),
                    username.toLowerCase()
            ));

            if (unread != null) {
                predicates.add(criteriaBuilder.equal(root.get("readFlag"), !unread));
            }

            if (normalizedSearch != null) {
                String keyword = "%" + normalizedSearch.toLowerCase() + "%";
                predicates.add(criteriaBuilder.or(
                        criteriaBuilder.like(criteriaBuilder.lower(root.get("title")), keyword),
                        criteriaBuilder.like(criteriaBuilder.lower(root.get("message")), keyword)
                ));
            }

            return criteriaBuilder.and(predicates.toArray(new Predicate[0]));
        }, pageable);

        return new PageResponse<>(
                page.map(NotificationMapper::toResponse).getContent(),
                page.getNumber(),
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages()
        );
    }

    @Transactional
    public NotificationResponse create(NotificationCreateRequest request) {
        return createNotification(request);
    }

    @Transactional
    public NotificationResponse createInternal(String providedApiKey, NotificationCreateRequest request) {
        if (providedApiKey == null || !Objects.equals(internalApiKey, providedApiKey)) {
            throw new InvalidInternalApiKeyException();
        }

        return createNotification(request);
    }

    private NotificationResponse createNotification(NotificationCreateRequest request) {
        NotificationEntity notification = new NotificationEntity();
        notification.setRecipientUsername(request.recipientUsername().trim());
        notification.setTitle(request.title().trim());
        notification.setMessage(request.message().trim());
        notification.setActionUrl(normalizeOrNull(request.actionUrl()));
        notification.setPriority(request.effectivePriority());

        NotificationEntity saved = notificationRepository.save(notification);
        NotificationEmailDispatchService.EmailDispatchResult dispatchResult =
                notificationEmailDispatchService.dispatchForNotification(saved, request);
        saved.setEmailDeliveryStatus(dispatchResult.status());
        saved.setEmailLastError(dispatchResult.errorReason());
        saved.setEmailLastAttemptAt(dispatchResult.attemptedAt());

        NotificationEntity persisted = notificationRepository.save(saved);
        pushRealtime(persisted);
        return NotificationMapper.toResponse(persisted);
    }

    @Transactional
    public NotificationResponse markRead(UUID id, String username) {
        NotificationEntity notification = notificationRepository.findById(Objects.requireNonNull(id))
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found: " + id));

        if (!notification.getRecipientUsername().equalsIgnoreCase(username)) {
            throw new ResourceNotFoundException("Notification not found for current user");
        }

        notification.setReadFlag(true);
        return NotificationMapper.toResponse(notificationRepository.save(notification));
    }

    @Transactional
    public long markAllRead(String username) {
        List<NotificationEntity> unreadNotifications =
                notificationRepository.findByRecipientUsernameIgnoreCaseAndReadFlagFalseOrderByCreatedAtDesc(username);

        if (unreadNotifications.isEmpty()) {
            return 0;
        }

        unreadNotifications.forEach(notification -> notification.setReadFlag(true));
        notificationRepository.saveAll(unreadNotifications);
        return unreadNotifications.size();
    }

    @Transactional
    public void delete(UUID id, String username) {
        NotificationEntity notification = notificationRepository.findById(Objects.requireNonNull(id))
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found: " + id));

        if (!notification.getRecipientUsername().equalsIgnoreCase(username)) {
            throw new ResourceNotFoundException("Notification not found for current user");
        }

        notificationRepository.delete(notification);
    }

    @Transactional(readOnly = true)
    public long unreadCount(String username) {
        return notificationRepository.countByRecipientUsernameIgnoreCaseAndReadFlagFalse(username);
    }

    @Transactional(readOnly = true)
    public PageResponse<EmailDeliveryLogResponse> emailLogs(UUID notificationId, String status, Pageable pageable) {
        String normalizedStatus = normalizeOrNull(status);
        Page<NotificationEmailLogEntity> page = notificationEmailLogRepository.findAll((root, query, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (notificationId != null) {
                predicates.add(criteriaBuilder.equal(root.get("notificationId"), notificationId));
            }
            if (normalizedStatus != null) {
                predicates.add(criteriaBuilder.equal(
                        criteriaBuilder.upper(root.get("status").as(String.class)),
                        normalizedStatus.toUpperCase()
                ));
            }
            return criteriaBuilder.and(predicates.toArray(new Predicate[0]));
        }, pageable);

        return new PageResponse<>(
                page.map(this::toLogResponse).getContent(),
                page.getNumber(),
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages()
        );
    }

    @Transactional(readOnly = true)
    public EmailDeliveryStatusResponse emailStatus(UUID notificationId) {
        NotificationEntity notification = notificationRepository.findById(Objects.requireNonNull(notificationId))
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found: " + notificationId));

        return new EmailDeliveryStatusResponse(
                notification.getId(),
                notification.getEmailDeliveryStatus() == null ? null : notification.getEmailDeliveryStatus().name(),
                notification.getEmailLastError(),
                notification.getEmailLastAttemptAt()
        );
    }

    @Transactional
    public EmailDeliveryStatusResponse resendEmail(UUID notificationId) {
        NotificationEntity notification = notificationRepository.findById(Objects.requireNonNull(notificationId))
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found: " + notificationId));

        NotificationEmailDispatchService.EmailDispatchResult dispatchResult =
                notificationEmailDispatchService.resend(notification);
        notification.setEmailDeliveryStatus(dispatchResult.status());
        notification.setEmailLastError(dispatchResult.errorReason());
        notification.setEmailLastAttemptAt(dispatchResult.attemptedAt());
        NotificationEntity updated = notificationRepository.save(notification);

        return new EmailDeliveryStatusResponse(
                updated.getId(),
                updated.getEmailDeliveryStatus() == null ? null : updated.getEmailDeliveryStatus().name(),
                updated.getEmailLastError(),
                updated.getEmailLastAttemptAt()
        );
    }

    public SseEmitter subscribe(String username) {
        SseEmitter emitter = new SseEmitter(0L);
        subscribers.computeIfAbsent(username.toLowerCase(), ignored -> new CopyOnWriteArrayList<>())
                .add(emitter);

        emitter.onCompletion(() -> removeEmitter(username, emitter));
        emitter.onTimeout(() -> removeEmitter(username, emitter));
        emitter.onError(error -> removeEmitter(username, emitter));

        return emitter;
    }

    private void pushRealtime(NotificationEntity notification) {
        String username = notification.getRecipientUsername().toLowerCase();
        List<SseEmitter> emitters = subscribers.getOrDefault(username, new CopyOnWriteArrayList<>());

        NotificationResponse payload = NotificationMapper.toResponse(notification);
        for (SseEmitter emitter : emitters) {
            try {
                emitter.send(SseEmitter.event().name("notification").data(Objects.requireNonNull(payload)));
            } catch (IOException ex) {
                emitter.completeWithError(ex);
                removeEmitter(username, emitter);
            }
        }
    }

    private void removeEmitter(String username, SseEmitter emitter) {
        subscribers.computeIfPresent(username.toLowerCase(), (key, list) -> {
            list.remove(emitter);
            return list.isEmpty() ? null : list;
        });
    }

    private String normalizeOrNull(String value) {
        if (value == null) {
            return null;
        }

        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }

    private EmailDeliveryLogResponse toLogResponse(NotificationEmailLogEntity entity) {
        return new EmailDeliveryLogResponse(
                entity.getId(),
                entity.getNotificationId(),
                entity.getRecipientUsername(),
                entity.getRecipientEmail(),
                entity.getNotificationType(),
                entity.getEmailSubject(),
                entity.getStatus() == null ? null : entity.getStatus().name(),
                entity.getFailureReason(),
                entity.getAttemptedAt(),
                entity.getCreatedAt()
        );
    }
}
