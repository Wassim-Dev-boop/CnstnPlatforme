package com.cnstn.authuser.service;

import com.cnstn.authuser.client.keycloak.KeycloakAdminClient;
import com.cnstn.authuser.dto.PageResponse;
import com.cnstn.authuser.dto.RoleCreateRequest;
import com.cnstn.authuser.dto.RoleResponse;
import com.cnstn.authuser.dto.RoleUpdateRequest;
import com.cnstn.authuser.entity.RoleEntity;
import com.cnstn.authuser.exception.BadRequestException;
import com.cnstn.authuser.exception.ConflictException;
import com.cnstn.authuser.exception.ResourceNotFoundException;
import com.cnstn.authuser.mapper.PageMapper;
import com.cnstn.authuser.mapper.RoleMapper;
import com.cnstn.authuser.repository.RoleRepository;
import java.util.Objects;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RoleService {

    private final RoleRepository roleRepository;
    private final KeycloakAdminClient keycloakAdminClient;

    public RoleService(RoleRepository roleRepository, KeycloakAdminClient keycloakAdminClient) {
        this.roleRepository = roleRepository;
        this.keycloakAdminClient = keycloakAdminClient;
    }

    @Transactional(readOnly = true)
    public PageResponse<RoleResponse> list(Pageable pageable) {
        Page<RoleEntity> page = roleRepository.findAll(Objects.requireNonNull(pageable));
        return PageMapper.fromPage(page, page.map(RoleMapper::toResponse).getContent());
    }

    @Transactional(readOnly = true)
    public RoleResponse getById(UUID id) {
        return RoleMapper.toResponse(fetchRole(Objects.requireNonNull(id)));
    }

    @Transactional
    public RoleResponse create(RoleCreateRequest request) {
        roleRepository.findByName(request.name()).ifPresent(role -> {
            throw new ConflictException("Role already exists: " + request.name());
        });

        RoleEntity entity = new RoleEntity();
        entity.setName(request.name());
        entity.setDescription(request.description());
        entity.setSystemRole(request.systemRole() == null || request.systemRole());

        RoleEntity saved = roleRepository.save(entity);
        keycloakAdminClient.createRealmRole(saved.getName(), saved.getDescription());
        return RoleMapper.toResponse(saved);
    }

    @Transactional
    public RoleResponse update(UUID id, RoleUpdateRequest request) {
        RoleEntity entity = fetchRole(Objects.requireNonNull(id));

        if (request.description() != null) {
            entity.setDescription(request.description());
        }
        if (request.systemRole() != null) {
            entity.setSystemRole(request.systemRole());
        }

        RoleEntity saved = roleRepository.save(entity);
        keycloakAdminClient.updateRealmRole(saved.getName(), saved.getDescription());
        return RoleMapper.toResponse(saved);
    }

    @Transactional
    public void delete(UUID id) {
        RoleEntity entity = Objects.requireNonNull(fetchRole(Objects.requireNonNull(id)));
        if (entity.isSystemRole()) {
            throw new BadRequestException("System role cannot be deleted: " + entity.getName());
        }

        if (!entity.getUsers().isEmpty()) {
            throw new ConflictException("Role is assigned to users and cannot be deleted");
        }

        keycloakAdminClient.deleteRealmRole(entity.getName());
        roleRepository.delete(entity);
    }

    @Transactional(readOnly = true)
    public RoleEntity fetchRole(UUID id) {
        UUID safeId = Objects.requireNonNull(id);
        return roleRepository.findById(safeId)
                .orElseThrow(() -> new ResourceNotFoundException("Role not found: " + id));
    }
}
