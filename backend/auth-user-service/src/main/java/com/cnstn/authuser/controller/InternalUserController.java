package com.cnstn.authuser.controller;

import com.cnstn.authuser.client.notification.NotificationClientProperties;
import com.cnstn.authuser.dto.InternalUserSummaryResponse;
import com.cnstn.authuser.entity.RoleName;
import com.cnstn.authuser.entity.UserEntity;
import com.cnstn.authuser.exception.ResourceNotFoundException;
import com.cnstn.authuser.exception.UnauthorizedException;
import com.cnstn.authuser.repository.UserRepository;
import java.util.List;
import java.util.Comparator;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/internal/users")
public class InternalUserController {

    private final UserRepository userRepository;
    private final NotificationClientProperties notificationClientProperties;

    public InternalUserController(
            UserRepository userRepository,
            NotificationClientProperties notificationClientProperties
    ) {
        this.userRepository = userRepository;
        this.notificationClientProperties = notificationClientProperties;
    }

    @GetMapping("/{username}/summary")
    @Transactional(readOnly = true)
    public InternalUserSummaryResponse summary(
            @RequestHeader(name = "X-Api-Key", required = false) String apiKey,
            @PathVariable String username
    ) {
        validateApiKey(apiKey);
        UserEntity user = userRepository.findByUsernameIgnoreCase(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + username));

        Set<String> roles = user.getRoles().stream()
                .filter(Objects::nonNull)
                .map(role -> role.getName())
                .filter(Objects::nonNull)
                .map(Enum::name)
                .sorted(Comparator.naturalOrder())
                .collect(Collectors.toSet());

        String departmentCode = user.getDepartment() == null ? null : user.getDepartment().getCode();
        String departmentName = user.getDepartment() == null ? null : user.getDepartment().getName();

        return new InternalUserSummaryResponse(
                user.getUsername(),
                user.getEmail(),
                departmentCode,
                departmentName,
                roles,
                user.isEnabled()
        );
    }

    @GetMapping("/roles/{roleName}/active-usernames")
    @Transactional(readOnly = true)
    public List<String> activeUsernamesByRole(
            @RequestHeader(name = "X-Api-Key", required = false) String apiKey,
            @PathVariable RoleName roleName
    ) {
        validateApiKey(apiKey);
        return userRepository.findDistinctByEnabledTrueAndRoles_NameOrderByUsernameAsc(roleName).stream()
                .map(UserEntity::getUsername)
                .filter(Objects::nonNull)
                .map(String::trim)
                .filter(username -> !username.isEmpty())
                .distinct()
                .toList();
    }

    private void validateApiKey(String providedApiKey) {
        String expected = notificationClientProperties.getInternalApiKey();
        if (expected == null || expected.isBlank() || !expected.equals(providedApiKey)) {
            throw new UnauthorizedException("Invalid internal API key");
        }
    }
}
