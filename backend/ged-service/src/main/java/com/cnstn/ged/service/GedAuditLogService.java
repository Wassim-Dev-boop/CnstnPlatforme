package com.cnstn.ged.service;

import com.cnstn.ged.dto.GedAuditLogResponse;
import com.cnstn.ged.dto.PageResponse;
import com.cnstn.ged.entity.GedAuditLogEntity;
import com.cnstn.ged.mapper.DocumentMapper;
import com.cnstn.ged.repository.GedAuditLogRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class GedAuditLogService {

    private final GedAuditLogRepository auditLogRepository;
    private final ObjectMapper objectMapper;

    public GedAuditLogService(GedAuditLogRepository auditLogRepository, ObjectMapper objectMapper) {
        this.auditLogRepository = auditLogRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public void log(
            String entityType,
            UUID entityId,
            String action,
            GedUserContext actor,
            Map<String, Object> details
    ) {
        GedAuditLogEntity entity = new GedAuditLogEntity();
        entity.setEntityType(Objects.requireNonNull(entityType));
        entity.setEntityId(entityId);
        entity.setAction(Objects.requireNonNull(action));
        entity.setActorUsername(actor == null ? "systeme" : actor.username());
        entity.setActorRoles(actor == null ? "" : String.join(",", actor.roles()));
        entity.setActorService(actor == null ? "" : actor.serviceName());
        entity.setDetailsJson(toJson(details));
        auditLogRepository.save(entity);
    }

    @Transactional(readOnly = true)
    public PageResponse<GedAuditLogResponse> list(Pageable pageable) {
        Page<GedAuditLogEntity> page = auditLogRepository.findAllByOrderByCreatedAtDesc(pageable);
        return new PageResponse<>(
                page.getContent().stream().map(DocumentMapper::toResponse).toList(),
                page.getNumber(),
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages()
        );
    }

    private String toJson(Map<String, Object> details) {
        if (details == null || details.isEmpty()) {
            return "{}";
        }
        try {
            return objectMapper.writeValueAsString(details);
        } catch (JsonProcessingException ignored) {
            return "{}";
        }
    }
}
