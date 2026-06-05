package com.cnstn.authuser.controller;

import com.cnstn.authuser.dto.WorkflowAuditResponse;
import com.cnstn.authuser.dto.WorkflowCatalogResponse;
import com.cnstn.authuser.dto.WorkflowDetailResponse;
import com.cnstn.authuser.dto.WorkflowGeneralUpdateRequest;
import com.cnstn.authuser.dto.WorkflowPreviewRequest;
import com.cnstn.authuser.dto.WorkflowPreviewResponse;
import com.cnstn.authuser.dto.WorkflowStepCreateRequest;
import com.cnstn.authuser.dto.WorkflowStepReorderRequest;
import com.cnstn.authuser.dto.WorkflowStepUpdateRequest;
import com.cnstn.authuser.dto.WorkflowSummaryResponse;
import com.cnstn.authuser.dto.WorkflowToggleRequest;
import com.cnstn.authuser.dto.WorkflowUpdateRequest;
import com.cnstn.authuser.entity.WorkflowAuditActionType;
import com.cnstn.authuser.entity.WorkflowType;
import com.cnstn.authuser.service.AdminWorkflowService;
import com.cnstn.authuser.service.UserPermissionPolicy;
import com.cnstn.authuser.service.UserPermissionService;
import jakarta.validation.Valid;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/workflows")
@PreAuthorize("hasRole('ADMIN')")
public class AdminWorkflowController {

    private static final String VIEW_USERS_MODULE_PERMISSION = UserPermissionPolicy.VIEW_USERS_MODULE;
    private static final String UPDATE_USERS_PERMISSION = UserPermissionPolicy.UPDATE_USER;

    private final AdminWorkflowService adminWorkflowService;
    private final UserPermissionService userPermissionService;

    public AdminWorkflowController(
            AdminWorkflowService adminWorkflowService,
            UserPermissionService userPermissionService
    ) {
        this.adminWorkflowService = adminWorkflowService;
        this.userPermissionService = userPermissionService;
    }

    @GetMapping
    public List<WorkflowSummaryResponse> listWorkflows(Authentication authentication) {
        assertPermission(authentication, VIEW_USERS_MODULE_PERMISSION);
        return adminWorkflowService.listWorkflows();
    }

    @GetMapping("/audit")
    public List<WorkflowAuditResponse> getWorkflowAudits(
            @RequestParam(required = false) UUID workflowId,
            @RequestParam(required = false) WorkflowAuditActionType action,
            Authentication authentication
    ) {
        assertPermission(authentication, VIEW_USERS_MODULE_PERMISSION);
        return adminWorkflowService.listAudits(workflowId, action);
    }

    @GetMapping("/{workflowId:[0-9a-fA-F\\-]{36}}")
    public WorkflowDetailResponse getWorkflowById(
            @PathVariable UUID workflowId,
            Authentication authentication
    ) {
        assertPermission(authentication, VIEW_USERS_MODULE_PERMISSION);
        return adminWorkflowService.getWorkflowById(workflowId);
    }

    @PutMapping("/{workflowId:[0-9a-fA-F\\-]{36}}")
    public WorkflowDetailResponse updateWorkflowGeneral(
            @PathVariable UUID workflowId,
            @Valid @RequestBody WorkflowGeneralUpdateRequest request,
            Authentication authentication
    ) {
        assertPermission(authentication, VIEW_USERS_MODULE_PERMISSION);
        assertPermission(authentication, UPDATE_USERS_PERMISSION);
        return adminWorkflowService.updateWorkflowGeneral(workflowId, request, authentication.getName());
    }

    @PutMapping("/{workflowId:[0-9a-fA-F\\-]{36}}/steps/{stepId:[0-9a-fA-F\\-]{36}}")
    public WorkflowDetailResponse updateStep(
            @PathVariable UUID workflowId,
            @PathVariable UUID stepId,
            @Valid @RequestBody WorkflowStepUpdateRequest request,
            Authentication authentication
    ) {
        assertPermission(authentication, VIEW_USERS_MODULE_PERMISSION);
        assertPermission(authentication, UPDATE_USERS_PERMISSION);
        return adminWorkflowService.updateStep(workflowId, stepId, request, authentication.getName());
    }

    @PostMapping("/{workflowId:[0-9a-fA-F\\-]{36}}/steps")
    public WorkflowDetailResponse addStep(
            @PathVariable UUID workflowId,
            @Valid @RequestBody WorkflowStepCreateRequest request,
            Authentication authentication
    ) {
        assertPermission(authentication, VIEW_USERS_MODULE_PERMISSION);
        assertPermission(authentication, UPDATE_USERS_PERMISSION);
        return adminWorkflowService.addStep(workflowId, request, authentication.getName());
    }

    @PutMapping("/{workflowId:[0-9a-fA-F\\-]{36}}/steps/reorder")
    public WorkflowDetailResponse reorderSteps(
            @PathVariable UUID workflowId,
            @Valid @RequestBody WorkflowStepReorderRequest request,
            Authentication authentication
    ) {
        assertPermission(authentication, VIEW_USERS_MODULE_PERMISSION);
        assertPermission(authentication, UPDATE_USERS_PERMISSION);
        return adminWorkflowService.reorderSteps(workflowId, request, authentication.getName());
    }

    @PostMapping("/{workflowId:[0-9a-fA-F\\-]{36}}/preview")
    public WorkflowPreviewResponse previewWorkflow(
            @PathVariable UUID workflowId,
            @RequestBody(required = false) WorkflowPreviewRequest request,
            Authentication authentication
    ) {
        assertPermission(authentication, VIEW_USERS_MODULE_PERMISSION);
        return adminWorkflowService.previewWorkflow(workflowId, request);
    }

    // Legacy routes kept for compatibility.
    @GetMapping("/type/{workflowType}")
    public WorkflowDetailResponse getWorkflowByType(
            @PathVariable WorkflowType workflowType,
            Authentication authentication
    ) {
        assertPermission(authentication, VIEW_USERS_MODULE_PERMISSION);
        return adminWorkflowService.getWorkflow(workflowType);
    }

    @GetMapping("/type/{workflowType}/catalog")
    public WorkflowCatalogResponse getWorkflowCatalog(
            @PathVariable WorkflowType workflowType,
            Authentication authentication
    ) {
        assertPermission(authentication, VIEW_USERS_MODULE_PERMISSION);
        return adminWorkflowService.getCatalog(workflowType);
    }

    @GetMapping("/type/{workflowType}/audits")
    public List<WorkflowAuditResponse> getWorkflowTypeAudits(
            @PathVariable WorkflowType workflowType,
            Authentication authentication
    ) {
        assertPermission(authentication, VIEW_USERS_MODULE_PERMISSION);
        return adminWorkflowService.listAudits(workflowType);
    }

    @PutMapping("/type/{workflowType}")
    public WorkflowDetailResponse updateWorkflow(
            @PathVariable WorkflowType workflowType,
            @Valid @RequestBody WorkflowUpdateRequest request,
            Authentication authentication
    ) {
        assertPermission(authentication, VIEW_USERS_MODULE_PERMISSION);
        assertPermission(authentication, UPDATE_USERS_PERMISSION);
        return adminWorkflowService.updateWorkflow(workflowType, request, authentication.getName());
    }

    @PatchMapping("/type/{workflowType}/active")
    public WorkflowDetailResponse toggleWorkflow(
            @PathVariable WorkflowType workflowType,
            @Valid @RequestBody WorkflowToggleRequest request,
            Authentication authentication
    ) {
        assertPermission(authentication, VIEW_USERS_MODULE_PERMISSION);
        assertPermission(authentication, UPDATE_USERS_PERMISSION);
        return adminWorkflowService.toggleWorkflow(workflowType, request, authentication.getName());
    }

    private void assertPermission(Authentication authentication, String permissionCode) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new AccessDeniedException("Authentication is required");
        }

        boolean allowed = userPermissionService.hasPermission(
                authentication.getName(),
                permissionCode,
                Collections.emptySet()
        );
        if (!allowed) {
            throw new AccessDeniedException("Permission denied: " + permissionCode);
        }
    }
}
