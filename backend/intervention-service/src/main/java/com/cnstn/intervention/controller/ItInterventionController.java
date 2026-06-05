package com.cnstn.intervention.controller;

import com.cnstn.intervention.dto.ItInterventionApprovalRequest;
import com.cnstn.intervention.dto.ItInterventionCreateRequest;
import com.cnstn.intervention.dto.ItInterventionProcessingRequest;
import com.cnstn.intervention.dto.ItInterventionResponse;
import com.cnstn.intervention.dto.ItInterventionTransitionResponse;
import com.cnstn.intervention.service.ItInterventionWorkflowService;
import jakarta.validation.Valid;
import java.security.Principal;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/interventions/it")
public class ItInterventionController {

    private final ItInterventionWorkflowService workflowService;

    public ItInterventionController(ItInterventionWorkflowService workflowService) {
        this.workflowService = workflowService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('EMPLOYE','ADMIN')")
    public ItInterventionResponse create(
        @Valid @RequestBody ItInterventionCreateRequest request,
        Principal principal
    ) {
        String actor = principal == null ? "" : principal.getName();
        return workflowService.createItIntervention(request, actor, actor);
    }

    @GetMapping("/mine")
    @PreAuthorize("hasAnyRole('EMPLOYE','ADMIN')")
    public Page<ItInterventionResponse> listMine(Principal principal, Pageable pageable) {
        String actor = principal == null ? "" : principal.getName();
        return workflowService.listForEmployee(actor, pageable);
    }

    @GetMapping("/manager")
    @PreAuthorize("hasAnyRole('CHEF_HIERARCHIQUE','ADMIN')")
    public Page<ItInterventionResponse> listManager(Pageable pageable) {
        return workflowService.listForManager(pageable);
    }

    @GetMapping("/dsn")
    @PreAuthorize("hasAnyRole('DIRECTEUR_DSN','ADMIN')")
    public Page<ItInterventionResponse> listDsn(Pageable pageable) {
        return workflowService.listForDsn(pageable);
    }

    @GetMapping("/processing")
    @PreAuthorize("hasAnyRole('RESPONSABLE_IT','DIRECTEUR_DSN','ADMIN')")
    public Page<ItInterventionResponse> listItProcessing(Pageable pageable) {
        return workflowService.listForItResponsible(pageable);
    }

    @GetMapping("/all")
    @PreAuthorize("hasRole('ADMIN')")
    public Page<ItInterventionResponse> listAll(Pageable pageable) {
        return workflowService.listAll(pageable);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('EMPLOYE','CHEF_HIERARCHIQUE','RESPONSABLE_IT','DIRECTEUR_DSN','ADMIN')")
    public ItInterventionResponse getById(@PathVariable UUID id, Authentication authentication) {
        ItInterventionResponse response = workflowService.getById(id);
        boolean privileged = hasAnyRole(authentication, "ROLE_ADMIN", "ROLE_CHEF_HIERARCHIQUE", "ROLE_DIRECTEUR_DSN", "ROLE_RESPONSABLE_IT");
        if (!privileged && !response.requestedBy().equalsIgnoreCase(authentication.getName())) {
            throw new AccessDeniedException("Access denied");
        }
        return response;
    }

    @GetMapping("/{id}/history")
    @PreAuthorize("hasAnyRole('EMPLOYE','CHEF_HIERARCHIQUE','RESPONSABLE_IT','DIRECTEUR_DSN','ADMIN')")
    public List<ItInterventionTransitionResponse> history(@PathVariable UUID id, Authentication authentication) {
        ItInterventionResponse response = workflowService.getById(id);
        boolean privileged = hasAnyRole(authentication, "ROLE_ADMIN", "ROLE_CHEF_HIERARCHIQUE", "ROLE_DIRECTEUR_DSN", "ROLE_RESPONSABLE_IT");
        if (!privileged && !response.requestedBy().equalsIgnoreCase(authentication.getName())) {
            throw new AccessDeniedException("Access denied");
        }
        return workflowService.getHistory(id);
    }

    @PostMapping("/{id}/manager-decision")
    @PreAuthorize("hasAnyRole('CHEF_HIERARCHIQUE','ADMIN')")
    public ItInterventionResponse managerDecision(
        @PathVariable UUID id,
        @Valid @RequestBody ItInterventionApprovalRequest request,
        Principal principal
    ) {
        String actor = principal == null ? "" : principal.getName();
        return workflowService.approveByManager(id, request, actor);
    }

    @PostMapping("/{id}/dsn-decision")
    @PreAuthorize("hasAnyRole('DIRECTEUR_DSN','ADMIN')")
    public ItInterventionResponse dsnDecision(
        @PathVariable UUID id,
        @Valid @RequestBody ItInterventionApprovalRequest request,
        Principal principal
    ) {
        String actor = principal == null ? "" : principal.getName();
        return workflowService.approveByDsn(id, request, actor);
    }

    @PostMapping("/{id}/take")
    @PreAuthorize("hasAnyRole('RESPONSABLE_IT','DIRECTEUR_DSN','ADMIN')")
    public ItInterventionResponse take(
        @PathVariable UUID id,
        @RequestBody(required = false) ItInterventionProcessingRequest request,
        Principal principal
    ) {
        String actor = principal == null ? "" : principal.getName();
        return workflowService.takeInCharge(id, actor, request == null ? new ItInterventionProcessingRequest(null, null) : request);
    }

    @PostMapping("/{id}/start")
    @PreAuthorize("hasAnyRole('RESPONSABLE_IT','DIRECTEUR_DSN','ADMIN')")
    public ItInterventionResponse start(
        @PathVariable UUID id,
        @RequestBody(required = false) ItInterventionProcessingRequest request,
        Principal principal
    ) {
        String actor = principal == null ? "" : principal.getName();
        return workflowService.markInProgress(id, actor, request == null ? new ItInterventionProcessingRequest(null, null) : request);
    }

    @PostMapping("/{id}/resolve")
    @PreAuthorize("hasAnyRole('RESPONSABLE_IT','DIRECTEUR_DSN','ADMIN')")
    public ItInterventionResponse resolve(
        @PathVariable UUID id,
        @RequestBody ItInterventionProcessingRequest request,
        Principal principal
    ) {
        String actor = principal == null ? "" : principal.getName();
        return workflowService.markResolved(id, actor, request);
    }

    @PostMapping("/{id}/close")
    @PreAuthorize("hasAnyRole('RESPONSABLE_IT','DIRECTEUR_DSN','ADMIN')")
    public ItInterventionResponse close(
        @PathVariable UUID id,
        @RequestBody(required = false) ItInterventionProcessingRequest request,
        Principal principal
    ) {
        String actor = principal == null ? "" : principal.getName();
        return workflowService.close(id, actor, request == null ? new ItInterventionProcessingRequest(null, null) : request);
    }

    private boolean hasAnyRole(Authentication authentication, String... roles) {
        if (authentication == null || authentication.getAuthorities() == null) {
            return false;
        }
        for (String role : roles) {
            boolean matched = authentication.getAuthorities().stream()
                .anyMatch(authority -> role.equals(authority.getAuthority()));
            if (matched) {
                return true;
            }
        }
        return false;
    }
}
