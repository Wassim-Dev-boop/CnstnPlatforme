package com.cnstn.intervention.mapper;

import com.cnstn.intervention.dto.InterventionResponse;
import com.cnstn.intervention.entity.InterventionEntity;

public final class InterventionMapper {

    private InterventionMapper() {
    }

    public static InterventionResponse toResponse(InterventionEntity entity) {
        return new InterventionResponse(
                entity.getId(),
                entity.getTitle(),
                entity.getDescription(),
                entity.getInterventionType(),
                entity.getPriority(),
                entity.getLocation(),
                entity.getRequestedBy(),
                entity.getAssignedTo(),
                entity.getStatus(),
                entity.getValidationNote(),
                entity.getValidatedBy(),
                entity.getResolution(),
                entity.getSatisfactionRating(),
                entity.getResolvedAt(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }
}
