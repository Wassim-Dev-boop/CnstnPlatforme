package com.cnstn.authuser.service;

import com.cnstn.authuser.dto.MyPermissionsResponse;
import com.cnstn.authuser.dto.PermissionDefinitionResponse;
import com.cnstn.authuser.dto.UserPermissionsResponse;
import com.cnstn.authuser.entity.PermissionEntity;
import com.cnstn.authuser.entity.RoleEntity;
import com.cnstn.authuser.entity.RoleName;
import com.cnstn.authuser.entity.UserEntity;
import com.cnstn.authuser.exception.BadRequestException;
import com.cnstn.authuser.exception.ResourceNotFoundException;
import com.cnstn.authuser.repository.PermissionRepository;
import com.cnstn.authuser.repository.RoleRepository;
import com.cnstn.authuser.repository.UserRepository;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserPermissionService {

    private final PermissionRepository permissionRepository;
    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final UserAdminService userAdminService;

    public UserPermissionService(
            PermissionRepository permissionRepository,
            RoleRepository roleRepository,
            UserRepository userRepository,
            UserAdminService userAdminService
    ) {
        this.permissionRepository = permissionRepository;
        this.roleRepository = roleRepository;
        this.userRepository = userRepository;
        this.userAdminService = userAdminService;
    }

    @Transactional(readOnly = true)
    public List<PermissionDefinitionResponse> listCatalog() {
        return permissionRepository.findAll()
                .stream()
                .sorted(Comparator
                        .comparing(PermissionEntity::getModule, String.CASE_INSENSITIVE_ORDER)
                        .thenComparing(PermissionEntity::getAction, String.CASE_INSENSITIVE_ORDER)
                        .thenComparing(PermissionEntity::getCode, String.CASE_INSENSITIVE_ORDER))
                .map(permission -> new PermissionDefinitionResponse(
                        permission.getCode(),
                        permission.getModule(),
                        permission.getAction(),
                        permission.getLabel(),
                        permission.getDescription()
                ))
                .toList();
    }

    @Transactional(readOnly = true)
    public UserPermissionsResponse getUserPermissions(UUID userId) {
        UserEntity user = userAdminService.fetchUser(Objects.requireNonNull(userId));
        return buildUserPermissionsResponse(user);
    }

    @Transactional(readOnly = true)
    public MyPermissionsResponse getCurrentUserPermissions(String principal) {
        UserEntity user = findCurrentUser(principal);
        Set<String> effective = resolveEffectivePermissions(user);
        return new MyPermissionsResponse(
                user.isPermissionsCustomized(),
                effective
        );
    }

    @Transactional
    public UserPermissionsResponse updateUserPermissions(UUID userId, Set<String> permissionCodes) {
        UserEntity user = userAdminService.fetchUser(Objects.requireNonNull(userId));
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

        user.setPermissions(permissions);
        user.setPermissionsCustomized(true);
        UserEntity saved = userRepository.save(user);
        return buildUserPermissionsResponse(saved);
    }

    @Transactional
    public UserPermissionsResponse resetUserPermissions(UUID userId) {
        UserEntity user = userAdminService.fetchUser(Objects.requireNonNull(userId));
        user.getPermissions().clear();
        user.setPermissionsCustomized(false);
        UserEntity saved = userRepository.save(user);
        return buildUserPermissionsResponse(saved);
    }

    @Transactional(readOnly = true)
    public boolean hasPermission(String principal, String permissionCode, Set<RoleName> fallbackRoles) {
        String safePermissionCode = normalizePermissionCode(permissionCode);
        if (safePermissionCode.isEmpty()) {
            return false;
        }

        UserEntity user = findCurrentUserOrNull(principal);
        if (user == null) {
            Set<RoleName> normalizedRoles = UserPermissionPolicy.normalizeRoles(fallbackRoles);
            Set<String> roleDerived = resolveRolePermissions(normalizedRoles);
            return roleDerived.contains(safePermissionCode);
        }

        if (user.isPermissionsCustomized()) {
            Set<String> assigned = user.getPermissions().stream()
                    .map(PermissionEntity::getCode)
                    .collect(Collectors.toSet());
            return assigned.contains(safePermissionCode);
        }

        Set<RoleName> roleNames = user.getRoles()
                .stream()
                .map(role -> role.getName())
                .collect(Collectors.toSet());
        Set<String> roleDerived = resolveRolePermissions(roleNames);
        return roleDerived.contains(safePermissionCode);
    }

    private UserPermissionsResponse buildUserPermissionsResponse(UserEntity user) {
        Set<String> assigned = user.getPermissions()
                .stream()
                .map(PermissionEntity::getCode)
                .collect(Collectors.toSet());

        Set<RoleName> roleNames = user.getRoles()
                .stream()
                .map(role -> role.getName())
                .collect(Collectors.toSet());
        Set<String> roleDerived = resolveRolePermissions(roleNames);
        Set<String> effective = user.isPermissionsCustomized() ? assigned : roleDerived;

        return new UserPermissionsResponse(
                user.getId(),
                user.isPermissionsCustomized(),
                assigned,
                roleDerived,
                effective
        );
    }

    private Set<String> resolveEffectivePermissions(UserEntity user) {
        if (user.isPermissionsCustomized()) {
            return user.getPermissions()
                    .stream()
                    .map(PermissionEntity::getCode)
                    .collect(Collectors.toSet());
        }

        Set<RoleName> roles = user.getRoles()
                .stream()
                .map(role -> role.getName())
                .collect(Collectors.toSet());
        return resolveRolePermissions(roles);
    }

    private void validatePermissionCodes(Set<String> permissionCodes) {
        Set<String> unknown = UserPermissionPolicy.unknownCodes(permissionCodes);
        if (!unknown.isEmpty()) {
            throw new BadRequestException("Codes permissions invalides: " + String.join(", ", unknown));
        }
    }

    private String normalizePermissionCode(String permissionCode) {
        return permissionCode == null ? "" : permissionCode.trim();
    }

    private UserEntity findCurrentUser(String principal) {
        UserEntity user = findCurrentUserOrNull(principal);
        if (user == null) {
            throw new ResourceNotFoundException("Current user not found: " + principal);
        }
        return user;
    }

    private UserEntity findCurrentUserOrNull(String principal) {
        if (principal == null || principal.isBlank()) {
            return null;
        }

        return userRepository.findByUsernameIgnoreCase(principal)
                .or(() -> userRepository.findByEmailIgnoreCase(principal))
                .orElse(null);
    }

    private Set<String> resolveRolePermissions(Set<RoleName> roles) {
        Set<RoleName> normalizedRoles = UserPermissionPolicy.normalizeRoles(roles);
        if (normalizedRoles.isEmpty()) {
            return new HashSet<>();
        }

        List<RoleEntity> roleEntities = roleRepository.findByNameIn(normalizedRoles);
        Map<RoleName, RoleEntity> roleByName = roleEntities.stream()
                .collect(Collectors.toMap(RoleEntity::getName, role -> role, (left, right) -> left));

        Set<String> resolved = new HashSet<>();
        normalizedRoles.forEach(roleName -> {
            RoleEntity roleEntity = roleByName.get(roleName);
            if (roleEntity == null) {
                resolved.addAll(UserPermissionPolicy.resolveForRoles(Set.of(roleName)));
                return;
            }

            roleEntity.getPermissions()
                    .stream()
                    .map(PermissionEntity::getCode)
                    .forEach(resolved::add);
        });

        return resolved;
    }
}
