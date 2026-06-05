package com.cnstn.authuser.service;

import com.cnstn.authuser.client.keycloak.KeycloakAdminClient;
import com.cnstn.authuser.client.notification.NotificationEmailClient;
import com.cnstn.authuser.client.notification.PasswordResetProperties;
import com.cnstn.authuser.dto.ForgotPasswordRequest;
import com.cnstn.authuser.dto.PasswordResetResponse;
import com.cnstn.authuser.dto.ResetPasswordRequest;
import com.cnstn.authuser.entity.PasswordResetTokenEntity;
import com.cnstn.authuser.entity.UserEntity;
import com.cnstn.authuser.exception.BadRequestException;
import com.cnstn.authuser.repository.PasswordResetTokenRepository;
import com.cnstn.authuser.repository.UserRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.util.UriComponentsBuilder;

@Service
public class PasswordRecoveryService {

    private static final Base64.Encoder URL_ENCODER = Base64.getUrlEncoder().withoutPadding();

    private final UserRepository userRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final KeycloakAdminClient keycloakAdminClient;
    private final NotificationEmailClient notificationEmailClient;
    private final PasswordResetProperties passwordResetProperties;

    public PasswordRecoveryService(
            UserRepository userRepository,
            PasswordResetTokenRepository passwordResetTokenRepository,
            KeycloakAdminClient keycloakAdminClient,
            NotificationEmailClient notificationEmailClient,
            PasswordResetProperties passwordResetProperties
    ) {
        this.userRepository = userRepository;
        this.passwordResetTokenRepository = passwordResetTokenRepository;
        this.keycloakAdminClient = keycloakAdminClient;
        this.notificationEmailClient = notificationEmailClient;
        this.passwordResetProperties = passwordResetProperties;
    }

    @Transactional
    public PasswordResetResponse forgotPassword(ForgotPasswordRequest request) {
        String normalizedEmail = Objects.requireNonNull(request.email()).trim().toLowerCase();
        Optional<UserEntity> userOpt = userRepository.findByEmailIgnoreCase(normalizedEmail);

        if (userOpt.isEmpty()) {
            return successForgotPasswordResponse();
        }

        UserEntity user = userOpt.get();
        if (!user.isEnabled()) {
            return successForgotPasswordResponse();
        }

        if (resolveAndPersistKeycloakId(user).isEmpty()) {
            return successForgotPasswordResponse();
        }

        Instant now = Instant.now();
        expireActiveTokens(user.getId(), now);
        long ttlMinutes = Math.max(1L, passwordResetProperties.getTokenTtlMinutes());

        String rawToken = generateToken();
        PasswordResetTokenEntity tokenEntity = new PasswordResetTokenEntity();
        tokenEntity.setUser(user);
        tokenEntity.setTokenHash(hashToken(rawToken));
        tokenEntity.setExpiresAt(now.plusSeconds(ttlMinutes * 60L));
        passwordResetTokenRepository.save(tokenEntity);

        String resetLink = buildResetLink(rawToken);
        String fullName = user.getFirstName() + " " + user.getLastName();
        notificationEmailClient.sendPasswordResetEmail(
                user.getEmail(),
                fullName,
                resetLink,
                ttlMinutes
        );

        return successForgotPasswordResponse();
    }

    @Transactional
    public PasswordResetResponse resetPassword(ResetPasswordRequest request) {
        if (!Objects.equals(request.newPassword(), request.confirmPassword())) {
            throw new BadRequestException("La confirmation du mot de passe est invalide");
        }

        String rawToken = request.token().trim();
        String tokenHash = hashToken(rawToken);
        PasswordResetTokenEntity tokenEntity = passwordResetTokenRepository
                .findByTokenHashAndUsedAtIsNull(tokenHash)
                .orElseThrow(() -> new BadRequestException("Le lien de reinitialisation est invalide ou expire"));

        Instant now = Instant.now();
        if (tokenEntity.getExpiresAt().isBefore(now)) {
            throw new BadRequestException("Le lien de reinitialisation est invalide ou expire");
        }

        UserEntity user = tokenEntity.getUser();
        UUID keycloakId = resolveAndPersistKeycloakId(user).orElse(null);
        if (keycloakId == null) {
            throw new BadRequestException("Le compte utilisateur n est pas lie au fournisseur d identite");
        }

        keycloakAdminClient.resetUserPassword(keycloakId, request.newPassword());

        tokenEntity.setUsedAt(now);
        passwordResetTokenRepository.save(tokenEntity);
        expireActiveTokens(user.getId(), now);

        return new PasswordResetResponse("Le mot de passe a ete reinitialise avec succes");
    }

    private PasswordResetResponse successForgotPasswordResponse() {
        return new PasswordResetResponse("Si cet email existe, un lien de reinitialisation a ete envoye");
    }

    private String buildResetLink(String token) {
        return UriComponentsBuilder
                .fromUriString(passwordResetProperties.getFrontendUrl())
                .queryParam("token", token)
                .build()
                .toUriString();
    }

    private void expireActiveTokens(UUID userId, Instant now) {
        List<PasswordResetTokenEntity> activeTokens = passwordResetTokenRepository
                .findByUser_IdAndUsedAtIsNullAndExpiresAtAfter(userId, now);
        if (activeTokens.isEmpty()) {
            return;
        }
        activeTokens.forEach(token -> token.setUsedAt(now));
        passwordResetTokenRepository.saveAll(activeTokens);
    }

    private Optional<UUID> resolveAndPersistKeycloakId(UserEntity user) {
        UUID existingKeycloakId = user.getKeycloakId();
        if (existingKeycloakId != null) {
            return Optional.of(existingKeycloakId);
        }

        Optional<UUID> resolved = keycloakAdminClient.findUserIdByUsernameOrEmail(user.getUsername(), user.getEmail());
        if (resolved.isEmpty()) {
            return Optional.empty();
        }

        user.setKeycloakId(resolved.get());
        userRepository.save(user);
        return resolved;
    }

    private String generateToken() {
        byte[] bytes = new byte[32];
        SecureRandomHolder.INSTANCE.nextBytes(bytes);
        return URL_ENCODER.encodeToString(bytes);
    }

    private String hashToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 algorithm is not available", ex);
        }
    }

    private static final class SecureRandomHolder {
        private static final java.security.SecureRandom INSTANCE = new java.security.SecureRandom();

        private SecureRandomHolder() {
        }
    }
}
