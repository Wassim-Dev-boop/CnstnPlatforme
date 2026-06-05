package com.cnstn.authuser.service;

import com.cnstn.authuser.client.keycloak.KeycloakAdminClient;
import com.cnstn.authuser.client.keycloak.KeycloakUpdateUserRequest;
import com.cnstn.authuser.dto.ProfileUpdateRequest;
import com.cnstn.authuser.dto.UserResponse;
import com.cnstn.authuser.entity.UserEntity;
import com.cnstn.authuser.exception.ConflictException;
import com.cnstn.authuser.exception.ResourceNotFoundException;
import com.cnstn.authuser.mapper.UserMapper;
import com.cnstn.authuser.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProfileService {

    private final UserRepository userRepository;
    private final KeycloakAdminClient keycloakAdminClient;

    public ProfileService(UserRepository userRepository, KeycloakAdminClient keycloakAdminClient) {
        this.userRepository = userRepository;
        this.keycloakAdminClient = keycloakAdminClient;
    }

    @Transactional(readOnly = true)
    public UserResponse getCurrentUser(String username) {
        UserEntity user = findCurrentUser(username);
        return UserMapper.toResponse(user);
    }

    @Transactional
    public UserResponse updateCurrentUser(String username, ProfileUpdateRequest request) {
        UserEntity user = findCurrentUser(username);

        if (!user.getEmail().equalsIgnoreCase(request.email())
                && userRepository.existsByEmailIgnoreCase(request.email())) {
            throw new ConflictException("Email already exists: " + request.email());
        }

        user.setEmail(request.email().trim().toLowerCase());
        user.setFirstName(request.firstName().trim());
        user.setLastName(request.lastName().trim());
        user.setPhone(request.phone());

        if (user.getKeycloakId() != null) {
            keycloakAdminClient.updateUser(user.getKeycloakId(), new KeycloakUpdateUserRequest(
                    user.getUsername(),
                    user.getEmail(),
                    user.getFirstName(),
                    user.getLastName(),
                    user.isEnabled(),
                    user.getPhone()
            ));
        }

        return UserMapper.toResponse(userRepository.save(user));
    }

    private UserEntity findCurrentUser(String principal) {
        return userRepository.findByUsernameIgnoreCase(principal)
                .or(() -> userRepository.findByEmailIgnoreCase(principal))
                .orElseThrow(() -> new ResourceNotFoundException("Current user not found: " + principal));
    }
}
