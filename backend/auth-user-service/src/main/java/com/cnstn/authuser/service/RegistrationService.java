package com.cnstn.authuser.service;

import com.cnstn.authuser.client.keycloak.KeycloakAdminClient;
import com.cnstn.authuser.client.keycloak.KeycloakCreateUserRequest;
import com.cnstn.authuser.dto.PublicSignupRequest;
import com.cnstn.authuser.dto.RegistrationRequest;
import com.cnstn.authuser.dto.UserResponse;
import com.cnstn.authuser.entity.DepartmentEntity;
import com.cnstn.authuser.entity.RoleEntity;
import com.cnstn.authuser.entity.RoleName;
import com.cnstn.authuser.entity.UserEntity;
import com.cnstn.authuser.exception.BadRequestException;
import com.cnstn.authuser.exception.ConflictException;
import com.cnstn.authuser.exception.ResourceNotFoundException;
import com.cnstn.authuser.mapper.UserMapper;
import com.cnstn.authuser.repository.DepartmentRepository;
import com.cnstn.authuser.repository.RoleRepository;
import com.cnstn.authuser.repository.UserRepository;
import java.util.HashSet;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RegistrationService {

    private static final int USERNAME_MAX_LENGTH = 120;

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final DepartmentRepository departmentRepository;
    private final KeycloakAdminClient keycloakAdminClient;

    public RegistrationService(
            UserRepository userRepository,
            RoleRepository roleRepository,
            DepartmentRepository departmentRepository,
            KeycloakAdminClient keycloakAdminClient
    ) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.departmentRepository = departmentRepository;
        this.keycloakAdminClient = keycloakAdminClient;
    }

    @Transactional
    public UserResponse register(RegistrationRequest request) {
        String safeEmail = normalizeEmail(request.email());
        String safeFirstName = normalize(request.firstName());
        String safeLastName = normalize(request.lastName());
        String safePassword = normalize(request.password());
        return createUser(
                safeEmail,
                safeFirstName,
                safeLastName,
                safePassword,
                null,
                null,
                true
        );
    }

    @Transactional
    public void signup(PublicSignupRequest request) {
        String safePassword = normalize(request.password());
        String safeConfirmPassword = normalize(request.confirmPassword());
        if (!safePassword.equals(safeConfirmPassword)) {
            throw new BadRequestException("La confirmation du mot de passe est invalide");
        }

        String safeEmail = normalizeEmail(request.email());
        String safeFirstName = normalize(request.firstName());
        String safeLastName = normalize(request.lastName());
        String safePhone = normalize(request.phone());
        DepartmentEntity requestedDepartment = resolveDepartment(request.departmentId());

        createUser(
                safeEmail,
                safeFirstName,
                safeLastName,
                safePassword,
                safePhone,
                requestedDepartment,
                false
        );
    }

    private String generateUniqueUsername(String email, String firstName, String lastName) {
        String base = buildBaseUsername(email, firstName, lastName);
        String candidate = base;
        int suffix = 1;

        while (userRepository.existsByUsernameIgnoreCase(candidate)) {
            String suffixLabel = "." + suffix++;
            int allowedBaseLength = USERNAME_MAX_LENGTH - suffixLabel.length();
            String trimmedBase = base.length() > allowedBaseLength
                    ? base.substring(0, allowedBaseLength)
                    : base;
            candidate = trimmedBase + suffixLabel;
        }

        return candidate;
    }

    private String buildBaseUsername(String email, String firstName, String lastName) {
        String localPart = email.contains("@") ? email.substring(0, email.indexOf('@')) : email;
        String fromEmail = sanitizeUsername(localPart);
        if (!fromEmail.isBlank()) {
            return trimUsername(fromEmail);
        }

        String fromName = sanitizeUsername((firstName + "." + lastName).toLowerCase());
        if (!fromName.isBlank()) {
            return trimUsername(fromName);
        }

        return "user";
    }

    private String sanitizeUsername(String raw) {
        return Objects.requireNonNullElse(raw, "")
                .trim()
                .toLowerCase()
                .replaceAll("[^a-z0-9._-]", "");
    }

    private String trimUsername(String username) {
        if (username.length() <= USERNAME_MAX_LENGTH) {
            return username;
        }
        return username.substring(0, USERNAME_MAX_LENGTH);
    }

    private String normalize(String value) {
        return Objects.requireNonNullElse(value, "").trim();
    }

    private String normalizeEmail(String value) {
        return normalize(value).toLowerCase();
    }

    private UserResponse createUser(
            String safeEmail,
            String safeFirstName,
            String safeLastName,
            String safePassword,
            String safePhone,
            DepartmentEntity department,
            boolean enabled
    ) {
        if (userRepository.existsByEmailIgnoreCase(safeEmail)) {
            throw new ConflictException("Email already exists: " + safeEmail);
        }

        String username = generateUniqueUsername(safeEmail, safeFirstName, safeLastName);
        RoleEntity employeeRole = roleRepository.findByName(RoleName.EMPLOYE)
                .orElseThrow(() -> new ResourceNotFoundException("Role EMPLOYE not found"));

        Set<RoleName> roleNames = Set.of(RoleName.EMPLOYE);
        UUID keycloakId = keycloakAdminClient.createUser(new KeycloakCreateUserRequest(
                username,
                safeEmail,
                safeFirstName,
                safeLastName,
                enabled,
                normalizeOrNull(safePhone),
                safePassword,
                false,
                false
        ), roleNames);

        try {
            UserEntity user = new UserEntity();
            user.setKeycloakId(keycloakId);
            user.setUsername(username);
            user.setEmail(safeEmail);
            user.setFirstName(safeFirstName);
            user.setLastName(safeLastName);
            user.setPhone(normalizeOrNull(safePhone));
            user.setEnabled(enabled);
            user.setDepartment(department);
            user.setRoles(new HashSet<>(Set.of(employeeRole)));

            return UserMapper.toResponse(userRepository.save(user));
        } catch (RuntimeException ex) {
            keycloakAdminClient.deleteUser(keycloakId);
            throw ex;
        }
    }

    private DepartmentEntity resolveDepartment(UUID departmentId) {
        if (departmentId == null) {
            return null;
        }

        DepartmentEntity department = departmentRepository.findById(departmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Department not found: " + departmentId));
        if (!department.isActive()) {
            throw new BadRequestException("Le service selectionne est inactif");
        }
        return department;
    }

    private String normalizeOrNull(String value) {
        String normalized = normalize(value);
        return normalized.isEmpty() ? null : normalized;
    }
}
