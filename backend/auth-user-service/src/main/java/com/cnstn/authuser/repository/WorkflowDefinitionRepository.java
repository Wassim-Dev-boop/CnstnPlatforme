package com.cnstn.authuser.repository;

import com.cnstn.authuser.entity.WorkflowDefinitionEntity;
import com.cnstn.authuser.entity.WorkflowType;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WorkflowDefinitionRepository extends JpaRepository<WorkflowDefinitionEntity, UUID> {

    Optional<WorkflowDefinitionEntity> findByWorkflowType(WorkflowType workflowType);
}
