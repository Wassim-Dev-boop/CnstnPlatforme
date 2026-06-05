package com.cnstn.authuser.repository;

import com.cnstn.authuser.entity.DepartmentEntity;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface DepartmentRepository extends JpaRepository<DepartmentEntity, UUID>, JpaSpecificationExecutor<DepartmentEntity> {

    boolean existsByCodeIgnoreCase(String code);

    Optional<DepartmentEntity> findByCodeIgnoreCase(String code);

    List<DepartmentEntity> findByActiveTrueOrderByNameAsc();
}
