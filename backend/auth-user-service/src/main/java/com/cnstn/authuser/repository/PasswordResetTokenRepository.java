package com.cnstn.authuser.repository;

import com.cnstn.authuser.entity.PasswordResetTokenEntity;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetTokenEntity, UUID> {

    List<PasswordResetTokenEntity> findByUser_IdAndUsedAtIsNullAndExpiresAtAfter(UUID userId, Instant now);

    Optional<PasswordResetTokenEntity> findByTokenHashAndUsedAtIsNull(String tokenHash);
}

