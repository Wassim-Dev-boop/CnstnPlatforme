package com.cnstn.authuser.repository;

import com.cnstn.authuser.entity.ItEquipmentCategoryEntity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ItEquipmentCategoryRepository extends JpaRepository<ItEquipmentCategoryEntity, UUID> {
    List<ItEquipmentCategoryEntity> findByActiveTrue();
    
    boolean existsByName(String name);
}
