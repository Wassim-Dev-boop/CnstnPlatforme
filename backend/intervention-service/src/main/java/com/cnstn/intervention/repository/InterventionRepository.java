package com.cnstn.intervention.repository;

import com.cnstn.intervention.entity.InterventionEntity;
import com.cnstn.intervention.entity.ItWorkflowStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface InterventionRepository extends JpaRepository<InterventionEntity, UUID>, JpaSpecificationExecutor<InterventionEntity> {
    Page<InterventionEntity> findByRequestedByIgnoreCase(String requestedBy, Pageable pageable);
    
    // IT Workflow queries
    Page<InterventionEntity> findByIsItWorkflowTrue(Pageable pageable);
    
    Page<InterventionEntity> findByItWorkflowStatusAndIsItWorkflowTrue(ItWorkflowStatus status, Pageable pageable);
    
    @Query("SELECT i FROM InterventionEntity i WHERE i.isItWorkflow = TRUE AND i.itWorkflowStatus IN :statuses ORDER BY i.createdAt DESC")
    Page<InterventionEntity> findByItWorkflowStatusInAndIsItWorkflowTrue(
        @Param("statuses") List<ItWorkflowStatus> statuses,
        Pageable pageable
    );
    
    Page<InterventionEntity> findByRequestedByAndIsItWorkflowTrue(String requestedBy, Pageable pageable);
}
