package com.cnstn.authuser.repository;

import com.cnstn.authuser.entity.RoleName;
import com.cnstn.authuser.entity.UserEntity;
import java.util.Optional;
import java.util.UUID;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.lang.Nullable;
import org.springframework.lang.NonNull;

public interface UserRepository extends JpaRepository<UserEntity, UUID>, JpaSpecificationExecutor<UserEntity> {

    @Override
    @EntityGraph(attributePaths = {"roles", "department", "permissions"})
    @NonNull Page<UserEntity> findAll(@NonNull Pageable pageable);

    @Override
    @EntityGraph(attributePaths = {"roles", "department", "permissions"})
    @NonNull Optional<UserEntity> findById(@NonNull UUID id);

    @Override
    @EntityGraph(attributePaths = {"roles", "department", "permissions"})
    @NonNull Page<UserEntity> findAll(@Nullable Specification<UserEntity> spec, @NonNull Pageable pageable);

    @EntityGraph(attributePaths = {"roles", "department", "permissions"})
    Optional<UserEntity> findByUsernameIgnoreCase(String username);

    @EntityGraph(attributePaths = {"roles", "department", "permissions"})
    Optional<UserEntity> findByEmailIgnoreCase(String email);

    boolean existsByUsernameIgnoreCase(String username);

    boolean existsByEmailIgnoreCase(String email);

    long countByDepartment_Id(UUID departmentId);

    long countByRoles_Id(UUID roleId);

    long countByRoles_IdAndPermissionsCustomizedFalse(UUID roleId);

    @EntityGraph(attributePaths = {"roles", "department", "permissions"})
    List<UserEntity> findAllByRoles_Id(UUID roleId);

    @EntityGraph(attributePaths = {"roles", "department", "permissions"})
    List<UserEntity> findByEnabledTrueOrderByFirstNameAscLastNameAsc();

    @EntityGraph(attributePaths = {"roles", "department", "permissions"})
    List<UserEntity> findDistinctByEnabledTrueAndRoles_NameOrderByUsernameAsc(RoleName roleName);
}
