package com.cnstn.authuser.service;

import com.cnstn.authuser.dto.RolePermissionsResponse;
import com.cnstn.authuser.entity.PermissionEntity;
import com.cnstn.authuser.entity.RoleEntity;
import com.cnstn.authuser.entity.UserEntity;
import com.cnstn.authuser.exception.BadRequestException;
import com.cnstn.authuser.exception.ResourceNotFoundException;
import com.cnstn.authuser.repository.PermissionRepository;
import com.cnstn.authuser.repository.RoleRepository;
import com.cnstn.authuser.repository.UserRepository;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RolePermissionService {

    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;
    private final UserRepository userRepository;

    public RolePermissionService(
            RoleRepository roleRepository,
            PermissionRepository permissionRepository,
            UserRepository userRepository
    ) {
        this.roleRepository = roleRepository;
        this.permissionRepository = permissionRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public RolePermissionsResponse getRolePermissions(UUID roleId) {
        RoleEntity role = fetchRole(Objects.requireNonNull(roleId));
        return buildResponse(role);
    }

    @Transactional
    public RolePermissionsResponse updateRolePermissions(UUID roleId, Set<String> permissionCodes, boolean applyToUsers) {
        RoleEntity role = fetchRole(Objects.requireNonNull(roleId));

        Set<String> normalizedCodes = UserPermissionPolicy.normalizePermissionCodes(permissionCodes);
        validatePermissionCodes(normalizedCodes);

        Set<PermissionEntity> permissions = normalizedCodes.isEmpty()
                ? new HashSet<>()
                : new HashSet<>(permissionRepository.findByCodeIn(normalizedCodes));

        Set<String> foundCodes = permissions.stream()
                .map(PermissionEntity::getCode)
                .collect(Collectors.toSet());

        if (!foundCodes.containsAll(normalizedCodes)) {
            Set<String> missing = new HashSet<>(normalizedCodes);
            missing.removeAll(foundCodes);
            throw new ResourceNotFoundException("Permissions introuvables: " + String.join(", ", missing));
        }

        role.setPermissions(permissions);
        RoleEntity savedRole = roleRepository.save(role);

        if (applyToUsers) {
            applyRolePermissionsToUsers(savedRole.getId());
        }

        return buildResponse(savedRole);
    }

    private RoleEntity fetchRole(UUID roleId) {
        return roleRepository.findById(roleId)
                .orElseThrow(() -> new ResourceNotFoundException("Role not found: " + roleId));
    }

    private void validatePermissionCodes(Set<String> permissionCodes) {
        Set<String> unknown = UserPermissionPolicy.unknownCodes(permissionCodes);
        if (!unknown.isEmpty()) {
            throw new BadRequestException("Codes permissions invalides: " + String.join(", ", unknown));
        }
    }

    private void applyRolePermissionsToUsers(UUID roleId) {
        List<UserEntity> users = userRepository.findAllByRoles_Id(roleId);
        if (users.isEmpty()) {
            return;
        }

        users.forEach(user -> {
            user.getPermissions().clear();
            user.setPermissionsCustomized(false);
        });
        userRepository.saveAll(users);
    }

    private RolePermissionsResponse buildResponse(RoleEntity role) {
        Set<String> assigned = role.getPermissions()
                .stream()
                .map(PermissionEntity::getCode)
                .collect(Collectors.toCollection(java.util.TreeSet::new));

        long usersInRole = userRepository.countByRoles_Id(role.getId());
        long usersUsingRoleDefaults = userRepository.countByRoles_IdAndPermissionsCustomizedFalse(role.getId());
        long usersCustomized = Math.max(0, usersInRole - usersUsingRoleDefaults);

        return new RolePermissionsResponse(
                role.getId(),
                role.getName().name(),
                assigned,
                usersInRole,
                usersUsingRoleDefaults,
                usersCustomized
        );
    }
}
