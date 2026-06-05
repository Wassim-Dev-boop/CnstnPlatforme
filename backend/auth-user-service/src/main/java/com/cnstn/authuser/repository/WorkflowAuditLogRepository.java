package com.cnstn.authuser.repository;

import com.cnstn.authuser.entity.WorkflowAuditLogEntity;
import com.cnstn.authuser.entity.WorkflowAuditActionType;
import com.cnstn.authuser.entity.WorkflowType;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WorkflowAuditLogRepository extends JpaRepository<WorkflowAuditLogEntity, UUID> {

    List<WorkflowAuditLogEntity> findTop50ByWorkflowTypeOrderByCreatedAtDesc(WorkflowType workflowType);

    List<WorkflowAuditLogEntity> findTop200ByOrderByCreatedAtDesc();

    List<WorkflowAuditLogEntity> findTop200ByWorkflowTypeOrderByCreatedAtDesc(WorkflowType workflowType);

    List<WorkflowAuditLogEntity> findTop200ByActionTypeOrderByCreatedAtDesc(WorkflowAuditActionType actionType);

    List<WorkflowAuditLogEntity> findTop200ByWorkflowTypeAndActionTypeOrderByCreatedAtDesc(
            WorkflowType workflowType,
            WorkflowAuditActionType actionType
    );
}
