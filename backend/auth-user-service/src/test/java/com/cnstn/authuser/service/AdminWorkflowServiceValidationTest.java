package com.cnstn.authuser.service;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.cnstn.authuser.dto.WorkflowStepCreateRequest;
import com.cnstn.authuser.dto.WorkflowStepUpdateRequest;
import com.cnstn.authuser.dto.WorkflowStepUpsertRequest;
import com.cnstn.authuser.dto.WorkflowUpdateRequest;
import com.cnstn.authuser.entity.RoleName;
import com.cnstn.authuser.entity.WorkflowActionType;
import com.cnstn.authuser.entity.WorkflowConditionType;
import com.cnstn.authuser.entity.WorkflowDefinitionEntity;
import com.cnstn.authuser.entity.WorkflowStepCode;
import com.cnstn.authuser.entity.WorkflowStepEntity;
import com.cnstn.authuser.entity.WorkflowType;
import com.cnstn.authuser.exception.BadRequestException;
import com.cnstn.authuser.repository.WorkflowAuditLogRepository;
import com.cnstn.authuser.repository.WorkflowDefinitionRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class AdminWorkflowServiceValidationTest {

    @Mock
    private WorkflowDefinitionRepository workflowDefinitionRepository;

    @Mock
    private WorkflowAuditLogRepository workflowAuditLogRepository;

    private AdminWorkflowService adminWorkflowService;

    @BeforeEach
    void setUp() {
        adminWorkflowService = new AdminWorkflowService(
                workflowDefinitionRepository,
                workflowAuditLogRepository,
                new ObjectMapper()
        );
    }

    @Test
    void updateWorkflowRejectsEmptySteps() {
        WorkflowDefinitionEntity workflow = buildWorkflowWithSingleStep();
        when(workflowDefinitionRepository.findByWorkflowType(WorkflowType.EVENT_WORKFLOW))
                .thenReturn(Optional.of(workflow));

        WorkflowUpdateRequest request = new WorkflowUpdateRequest(
                "Test",
                true,
                List.of(),
                false
        );

        assertThrows(BadRequestException.class,
                () -> adminWorkflowService.updateWorkflow(WorkflowType.EVENT_WORKFLOW, request, "admin.cnstn"));
    }

    @Test
    void updateWorkflowRejectsStepWithoutRole() {
        WorkflowDefinitionEntity workflow = buildWorkflowWithSingleStep();
        when(workflowDefinitionRepository.findByWorkflowType(WorkflowType.EVENT_WORKFLOW))
                .thenReturn(Optional.of(workflow));

        WorkflowStepUpsertRequest step = new WorkflowStepUpsertRequest(
                WorkflowStepCode.EVENT_DRAFT_REVIEW,
                "Soumission",
                1,
                null,
                true,
                false,
                true,
                WorkflowConditionType.TOUJOURS,
                Set.of(WorkflowActionType.SUBMIT)
        );

        WorkflowUpdateRequest request = new WorkflowUpdateRequest(
                "Test",
                true,
                List.of(step),
                false
        );

        assertThrows(BadRequestException.class,
                () -> adminWorkflowService.updateWorkflow(WorkflowType.EVENT_WORKFLOW, request, "admin.cnstn"));
    }

    @Test
    void updateWorkflowRejectsUnauthorizedStepCode() {
        WorkflowDefinitionEntity workflow = buildWorkflowWithSingleStep();
        when(workflowDefinitionRepository.findByWorkflowType(WorkflowType.EVENT_WORKFLOW))
                .thenReturn(Optional.of(workflow));

        WorkflowStepUpsertRequest step = new WorkflowStepUpsertRequest(
                WorkflowStepCode.ROOM_REQUEST_REVIEW,
                "Demande salle",
                1,
                RoleName.EMPLOYE,
                true,
                false,
                true,
                WorkflowConditionType.RESERVATION_PHYSIQUE,
                Set.of(WorkflowActionType.SUBMIT)
        );

        WorkflowUpdateRequest request = new WorkflowUpdateRequest(
                "Test",
                true,
                List.of(step),
                false
        );

        assertThrows(BadRequestException.class,
                () -> adminWorkflowService.updateWorkflow(WorkflowType.EVENT_WORKFLOW, request, "admin.cnstn"));
    }

    @Test
    void updateStepCreatesAudit() {
        WorkflowDefinitionEntity workflow = buildWorkflowWithSingleStep();
        UUID workflowId = UUID.randomUUID();
        UUID stepId = UUID.randomUUID();
        workflow.setId(workflowId);
        workflow.getSteps().get(0).setId(stepId);

        when(workflowDefinitionRepository.findById(workflowId))
                .thenReturn(Optional.of(workflow));
        when(workflowDefinitionRepository.save(any(WorkflowDefinitionEntity.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        WorkflowStepUpdateRequest request = new WorkflowStepUpdateRequest(
                "Soumission employé",
                RoleName.CHEF_HIERARCHIQUE,
                true,
                false,
                true,
                WorkflowConditionType.TOUJOURS,
                Set.of(WorkflowActionType.SUBMIT, WorkflowActionType.REJECT),
                true,
                "Changement de rôle"
        );

        adminWorkflowService.updateStep(workflowId, stepId, request, "admin.cnstn");

        verify(workflowAuditLogRepository, atLeastOnce()).save(any());
    }

    @Test
    void addStepRejectsStepWithoutRole() {
        WorkflowDefinitionEntity workflow = buildWorkflowWithSingleStep();
        UUID workflowId = UUID.randomUUID();
        workflow.setId(workflowId);

        when(workflowDefinitionRepository.findById(workflowId))
                .thenReturn(Optional.of(workflow));

        WorkflowStepCreateRequest request = new WorkflowStepCreateRequest(
                WorkflowStepCode.EVENT_POST_EVENT_REPORT,
                "Compte rendu post-événement",
                null,
                null,
                false,
                false,
                true,
                WorkflowConditionType.DOCUMENT_CONFIDENTIEL,
                Set.of(WorkflowActionType.ARCHIVE),
                "Ajout test"
        );

        assertThrows(BadRequestException.class,
                () -> adminWorkflowService.addStep(workflowId, request, "admin.cnstn"));
    }

    @Test
    void addStepRejectsStepWithoutAction() {
        WorkflowDefinitionEntity workflow = buildWorkflowWithSingleStep();
        UUID workflowId = UUID.randomUUID();
        workflow.setId(workflowId);

        when(workflowDefinitionRepository.findById(workflowId))
                .thenReturn(Optional.of(workflow));

        WorkflowStepCreateRequest request = new WorkflowStepCreateRequest(
                WorkflowStepCode.EVENT_POST_EVENT_REPORT,
                "Compte rendu post-événement",
                null,
                RoleName.RESPONSABLE_QUALITE,
                false,
                false,
                true,
                WorkflowConditionType.DOCUMENT_CONFIDENTIEL,
                Set.of(),
                "Ajout test"
        );

        assertThrows(BadRequestException.class,
                () -> adminWorkflowService.addStep(workflowId, request, "admin.cnstn"));
    }

    @Test
    void addStepCreatesAudit() {
        WorkflowDefinitionEntity workflow = buildWorkflowWithSingleStep();
        UUID workflowId = UUID.randomUUID();
        workflow.setId(workflowId);

        when(workflowDefinitionRepository.findById(workflowId))
                .thenReturn(Optional.of(workflow));
        when(workflowDefinitionRepository.save(any(WorkflowDefinitionEntity.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        WorkflowStepCreateRequest request = new WorkflowStepCreateRequest(
                WorkflowStepCode.EVENT_POST_EVENT_REPORT,
                "Compte rendu post-événement",
                null,
                RoleName.RESPONSABLE_QUALITE,
                false,
                false,
                true,
                WorkflowConditionType.DOCUMENT_CONFIDENTIEL,
                Set.of(WorkflowActionType.ARCHIVE),
                "Ajout test"
        );

        adminWorkflowService.addStep(workflowId, request, "admin.cnstn");

        verify(workflowAuditLogRepository, atLeastOnce()).save(any());
    }

    private WorkflowDefinitionEntity buildWorkflowWithSingleStep() {
        WorkflowDefinitionEntity workflow = new WorkflowDefinitionEntity();
        workflow.setWorkflowType(WorkflowType.EVENT_WORKFLOW);
        workflow.setWorkflowName("Workflow événement");
        workflow.setDescription("Test");
        workflow.setActive(true);
        workflow.setUpdatedBy("system");

        WorkflowStepEntity step = new WorkflowStepEntity();
        step.setWorkflow(workflow);
        step.setStepCode(WorkflowStepCode.EVENT_DRAFT_REVIEW);
        step.setStepName("Soumission employé");
        step.setStepOrder(1);
        step.setResponsibleRole(RoleName.EMPLOYE);
        step.setRequired(true);
        step.setRefusalReasonRequired(false);
        step.setActive(true);
        step.setCritical(true);
        step.setConditionType(WorkflowConditionType.TOUJOURS);
        step.setAllowedActions(Set.of(WorkflowActionType.SUBMIT));

        workflow.getSteps().add(step);
        return workflow;
    }
}
