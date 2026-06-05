package com.cnstn.authuser.repository;

import com.cnstn.authuser.entity.ItEquipmentEntity;
import com.cnstn.authuser.entity.ItEquipmentState;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface ItEquipmentRepository extends JpaRepository<ItEquipmentEntity, UUID> {
    
    Optional<ItEquipmentEntity> findBySerialNumber(String serialNumber);
    
    List<ItEquipmentEntity> findByCategory_Id(UUID categoryId);
    
    List<ItEquipmentEntity> findByState(ItEquipmentState state);
    
    List<ItEquipmentEntity> findByAssignmentStatus(String assignmentStatus);
    
    List<ItEquipmentEntity> findByCurrentEmployeeId(String employeeId);
    
    @Query("SELECT e FROM ItEquipmentEntity e WHERE e.state != 'ARCHIVED' ORDER BY e.name ASC")
    List<ItEquipmentEntity> findAllActive();
    
    @Query("SELECT e FROM ItEquipmentEntity e WHERE e.state != 'ARCHIVED' ORDER BY e.name ASC")
    Page<ItEquipmentEntity> findAllActive(Pageable pageable);
    
    @Query("""
        SELECT e FROM ItEquipmentEntity e 
        WHERE e.state != 'ARCHIVED' 
        AND (LOWER(e.name) LIKE LOWER(CONCAT('%', :search, '%')) 
            OR LOWER(e.serialNumber) LIKE LOWER(CONCAT('%', :search, '%'))
            OR LOWER(e.brand) LIKE LOWER(CONCAT('%', :search, '%')))
    """)
    Page<ItEquipmentEntity> searchActive(@Param("search") String search, Pageable pageable);
    
    @Query("""
        SELECT e FROM ItEquipmentEntity e 
        WHERE e.state != 'ARCHIVED' 
        AND e.category.id = :categoryId
    """)
    Page<ItEquipmentEntity> findByCategoryActive(@Param("categoryId") UUID categoryId, Pageable pageable);
    
    @Query("""
        SELECT e FROM ItEquipmentEntity e 
        WHERE e.state != 'ARCHIVED' 
        AND e.state = :state
    """)
    Page<ItEquipmentEntity> findByStateActive(@Param("state") ItEquipmentState state, Pageable pageable);
    
    @Query("""
        SELECT e FROM ItEquipmentEntity e 
        WHERE e.state != 'ARCHIVED' 
        AND e.assignmentStatus = :assignmentStatus
    """)
    Page<ItEquipmentEntity> findByAssignmentStatusActive(@Param("assignmentStatus") String assignmentStatus, Pageable pageable);
}
