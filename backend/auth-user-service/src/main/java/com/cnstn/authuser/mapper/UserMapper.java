package com.cnstn.authuser.mapper;

import com.cnstn.authuser.dto.DepartmentResponse;
import com.cnstn.authuser.dto.UserResponse;
import com.cnstn.authuser.entity.RoleName;
import com.cnstn.authuser.entity.UserEntity;
import java.util.Set;
import java.util.stream.Collectors;

public final class UserMapper {

    private UserMapper() {
    }

    public static UserResponse toResponse(UserEntity entity) {
        DepartmentResponse department = entity.getDepartment() == null
                ? null
                : DepartmentMapper.toResponse(entity.getDepartment());

        Set<RoleName> roles = entity.getRoles()
                .stream()
                .map(role -> role.getName())
                .collect(Collectors.toSet());

        Set<String> permissions = entity.getPermissions()
                .stream()
                .map(permission -> permission.getCode())
                .collect(Collectors.toSet());

        return new UserResponse(
                entity.getId(),
                entity.getKeycloakId(),
                entity.getUsername(),
                entity.getEmail(),
                entity.getFirstName(),
                entity.getLastName(),
                entity.getPhone(),
                entity.isEnabled(),
                department,
                roles,
                entity.isPermissionsCustomized(),
                permissions,
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }
}
