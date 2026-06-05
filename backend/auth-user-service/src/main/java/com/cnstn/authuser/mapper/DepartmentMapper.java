package com.cnstn.authuser.mapper;

import com.cnstn.authuser.dto.DepartmentResponse;
import com.cnstn.authuser.entity.DepartmentEntity;

public final class DepartmentMapper {

    private DepartmentMapper() {
    }

    public static DepartmentResponse toResponse(DepartmentEntity entity) {
        return new DepartmentResponse(
                entity.getId(),
                entity.getCode(),
                entity.getName(),
                entity.getDescription(),
                entity.isActive(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }
}
