package com.cnstn.authuser.mapper;

import com.cnstn.authuser.dto.RoleResponse;
import com.cnstn.authuser.entity.RoleEntity;

public final class RoleMapper {

    private RoleMapper() {
    }

    public static RoleResponse toResponse(RoleEntity entity) {
        return new RoleResponse(
                entity.getId(),
                entity.getName(),
                entity.getDescription(),
                entity.isSystemRole(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }
}
