package com.cnstn.intervention.dto;

import com.cnstn.intervention.entity.ItWorkflowStatus;
import java.time.Instant;
import java.util.UUID;

public record ItInterventionResponse(
    UUID id,
    String title,
    String description,
    UUID equipmentId,
    String equipmentName,
    String equipmentSerialNumber,
    String equipmentCategory,
    String priority,
    String requestedBy,
    String requesterName,
    ItWorkflowStatus itWorkflowStatus,
    Boolean managerApproved,
    String managerApprovalNote,
    String managerId,
    Boolean dsnApproved,
    String dsnApprovalNote,
    String dsnId,
    String itResponsibleId,
    String itDiagnosticComment,
    Instant equipmentAssignedAt,
    Instant managerApprovedAt,
    Instant dsnApprovedAt,
    Instant itProcessingStartedAt,
    Instant createdAt,
    Instant updatedAt
) {
}
