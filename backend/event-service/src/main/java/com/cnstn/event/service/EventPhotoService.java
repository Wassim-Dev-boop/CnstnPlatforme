package com.cnstn.event.service;

import com.cnstn.event.dto.EventPhotoContent;
import com.cnstn.event.dto.EventPhotoResponse;
import com.cnstn.event.entity.EventEntity;
import com.cnstn.event.entity.EventPhotoEntity;
import com.cnstn.event.exception.BadRequestException;
import com.cnstn.event.exception.ResourceNotFoundException;
import com.cnstn.event.repository.EventPhotoRepository;
import com.cnstn.event.repository.EventRepository;
import java.io.IOException;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class EventPhotoService {

    private static final long MAX_PHOTO_SIZE_BYTES = 10L * 1024L * 1024L;
    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "image/png",
            "image/jpeg",
            "image/jpg",
            "image/webp"
    );

    private final EventRepository eventRepository;
    private final EventPhotoRepository eventPhotoRepository;

    public EventPhotoService(EventRepository eventRepository, EventPhotoRepository eventPhotoRepository) {
        this.eventRepository = eventRepository;
        this.eventPhotoRepository = eventPhotoRepository;
    }

    @Transactional(readOnly = true)
    public List<EventPhotoResponse> list(UUID eventId) {
        UUID safeEventId = Objects.requireNonNull(eventId);
        ensureEventExists(safeEventId);
        return eventPhotoRepository.findByEventIdAndArchivedFalseOrderByCreatedAtDesc(safeEventId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public EventPhotoResponse upload(UUID eventId, MultipartFile file, String uploadedBy) {
        UUID safeEventId = Objects.requireNonNull(eventId);
        EventEntity event = fetchEvent(safeEventId);
        MultipartFile safeFile = Objects.requireNonNull(file);
        String uploader = normalizeOrDefault(uploadedBy, "system");

        if (safeFile.isEmpty()) {
            throw new BadRequestException("Le fichier photo est obligatoire");
        }
        if (safeFile.getSize() > MAX_PHOTO_SIZE_BYTES) {
            throw new BadRequestException("La taille maximale autorisee est de 10 Mo");
        }

        String resolvedContentType = resolveContentType(safeFile);
        if (!ALLOWED_CONTENT_TYPES.contains(resolvedContentType)) {
            throw new BadRequestException("Type de fichier non autorise. Utilisez PNG, JPG, JPEG ou WEBP");
        }

        String fileName = sanitizeFileName(safeFile.getOriginalFilename());
        if (fileName.isBlank()) {
            throw new BadRequestException("Le nom du fichier est invalide");
        }

        byte[] content;
        try {
            content = safeFile.getBytes();
        } catch (IOException ex) {
            throw new BadRequestException("Lecture du fichier impossible");
        }

        EventPhotoEntity photo = new EventPhotoEntity();
        photo.setEvent(event);
        photo.setFileName(fileName);
        photo.setContentType(resolvedContentType);
        photo.setFileSize(content.length);
        photo.setUploadedBy(uploader);
        photo.setArchived(false);
        photo.setContent(content);

        EventPhotoEntity saved = eventPhotoRepository.save(photo);
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public EventPhotoContent download(UUID eventId, UUID photoId) {
        EventPhotoEntity photo = fetchPhoto(eventId, photoId);
        if (photo.isArchived()) {
            throw new ResourceNotFoundException("Photo evenement introuvable: " + photoId);
        }
        return new EventPhotoContent(
                photo.getFileName(),
                photo.getContentType(),
                photo.getContent()
        );
    }

    @Transactional
    public void archive(UUID eventId, UUID photoId) {
        EventPhotoEntity photo = fetchPhoto(eventId, photoId);
        if (!photo.isArchived()) {
            photo.setArchived(true);
            eventPhotoRepository.save(photo);
        }
    }

    private EventEntity fetchEvent(UUID eventId) {
        return eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Evenement introuvable: " + eventId));
    }

    private void ensureEventExists(UUID eventId) {
        if (!eventRepository.existsById(eventId)) {
            throw new ResourceNotFoundException("Evenement introuvable: " + eventId);
        }
    }

    private EventPhotoEntity fetchPhoto(UUID eventId, UUID photoId) {
        Objects.requireNonNull(eventId);
        Objects.requireNonNull(photoId);
        return eventPhotoRepository.findByIdAndEventId(photoId, eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Photo evenement introuvable: " + photoId));
    }

    private EventPhotoResponse toResponse(EventPhotoEntity photo) {
        return new EventPhotoResponse(
                photo.getId(),
                photo.getEvent().getId(),
                photo.getFileName(),
                photo.getContentType(),
                photo.getFileSize(),
                photo.getUploadedBy(),
                photo.getCreatedAt()
        );
    }

    private String resolveContentType(MultipartFile file) {
        String reportedType = normalize(file.getContentType());
        if (!reportedType.isBlank()) {
            return reportedType.toLowerCase(Locale.ROOT);
        }

        String extension = extractExtension(file.getOriginalFilename());
        return switch (extension) {
            case "png" -> "image/png";
            case "jpg", "jpeg" -> "image/jpeg";
            case "webp" -> "image/webp";
            default -> "";
        };
    }

    private String extractExtension(String fileName) {
        String safeName = normalize(fileName);
        int index = safeName.lastIndexOf('.');
        if (index < 0 || index == safeName.length() - 1) {
            return "";
        }
        return safeName.substring(index + 1).toLowerCase(Locale.ROOT);
    }

    private String sanitizeFileName(String rawFileName) {
        String safeName = normalize(rawFileName).replace('\\', '/');
        int slashIndex = safeName.lastIndexOf('/');
        if (slashIndex >= 0) {
            safeName = safeName.substring(slashIndex + 1);
        }
        return safeName.replaceAll("[\\r\\n]", "");
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim();
    }

    private String normalizeOrDefault(String value, String fallback) {
        String normalized = normalize(value);
        return normalized.isBlank() ? fallback : normalized;
    }
}
