package com.cnstn.authuser.repository;

import com.cnstn.authuser.entity.PermissionEntity;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PermissionRepository extends JpaRepository<PermissionEntity, UUID> {

    List<PermissionEntity> findByCodeIn(Set<String> codes);
}
