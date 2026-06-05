package com.cnstn.authuser.repository;

import com.cnstn.authuser.entity.RoleEntity;
import com.cnstn.authuser.entity.RoleName;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.lang.NonNull;

public interface RoleRepository extends JpaRepository<RoleEntity, UUID> {

    @Override
    @EntityGraph(attributePaths = {"permissions"})
    @NonNull Optional<RoleEntity> findById(@NonNull UUID id);

    @EntityGraph(attributePaths = {"permissions"})
    Optional<RoleEntity> findByName(RoleName name);

    @EntityGraph(attributePaths = {"permissions"})
    List<RoleEntity> findByNameIn(Collection<RoleName> names);

    @EntityGraph(attributePaths = {"permissions"})
    List<RoleEntity> findAllByOrderByNameAsc();
}
