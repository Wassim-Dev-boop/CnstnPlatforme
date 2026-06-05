package com.cnstn.reservation.repository;

import com.cnstn.reservation.entity.EquipmentEntity;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface EquipmentRepository extends JpaRepository<EquipmentEntity, UUID>, JpaSpecificationExecutor<EquipmentEntity> {
}
