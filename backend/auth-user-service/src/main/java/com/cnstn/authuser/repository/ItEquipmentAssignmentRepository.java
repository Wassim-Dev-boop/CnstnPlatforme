package com.cnstn.authuser.repository;

import com.cnstn.authuser.entity.ItEquipmentAssignmentEntity;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface ItEquipmentAssignmentRepository extends JpaRepository<ItEquipmentAssignmentEntity, UUID> {
    
    List<ItEquipmentAssignmentEntity> findByEmployeeId(String employeeId);
    
    List<ItEquipmentAssignmentEntity> findByEmployeeIdAndStatus(String employeeId, String status);
    
    List<ItEquipmentAssignmentEntity> findByEquipment_Id(UUID equipmentId);
    
    @Query("""
        SELECT a FROM ItEquipmentAssignmentEntity a 
        WHERE a.equipment.id = :equipmentId 
        AND a.status = 'ACTIVE'
    """)
    Optional<ItEquipmentAssignmentEntity> findActiveByEquipmentId(@Param("equipmentId") UUID equipmentId);

    @Query("""
        SELECT a FROM ItEquipmentAssignmentEntity a
        WHERE a.equipment.id IN :equipmentIds
        AND a.status = 'ACTIVE'
        AND a.returnedAt IS NULL
    """)
    List<ItEquipmentAssignmentEntity> findActiveByEquipmentIds(@Param("equipmentIds") Set<UUID> equipmentIds);
    
    @Query("""
        SELECT a FROM ItEquipmentAssignmentEntity a 
        WHERE a.status = 'ACTIVE' 
        AND a.returnedAt IS NULL
        ORDER BY a.assignedAt DESC
    """)
    Page<ItEquipmentAssignmentEntity> findAllActive(Pageable pageable);
    
    @Query("""
        SELECT a FROM ItEquipmentAssignmentEntity a 
        WHERE a.employeeId = :employeeId 
        AND a.status = 'ACTIVE' 
        AND a.returnedAt IS NULL
    """)
    List<ItEquipmentAssignmentEntity> findActiveByEmployeeId(@Param("employeeId") String employeeId);

    @Query("""
        SELECT a FROM ItEquipmentAssignmentEntity a
        WHERE a.equipment.id = :equipmentId
        ORDER BY a.assignedAt DESC
    """)
    List<ItEquipmentAssignmentEntity> findByEquipmentIdOrderByAssignedAtDesc(@Param("equipmentId") UUID equipmentId);
}
