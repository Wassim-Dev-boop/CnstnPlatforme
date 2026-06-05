package com.cnstn.intervention.controller;

import com.cnstn.intervention.dto.InterventionCreateRequest;
import com.cnstn.intervention.dto.InterventionResponse;
import com.cnstn.intervention.dto.InterventionStatusUpdateRequest;
import com.cnstn.intervention.dto.InterventionUpdateRequest;
import com.cnstn.intervention.dto.InterventionValidationRequest;
import com.cnstn.intervention.dto.PageResponse;
import com.cnstn.intervention.entity.InterventionStatus;
import com.cnstn.intervention.service.InterventionService;
import com.cnstn.intervention.service.PermissionGuardService;
import jakarta.validation.Valid;
import java.security.Principal;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/interventions")
public class InterventionController {

    private static final String VIEW_INTERVENTIONS_MODULE_PERMISSION = "VIEW_INTERVENTIONS_MODULE";
    private static final String CHANGE_INTERVENTION_STATUS_PERMISSION = "CHANGE_INTERVENTION_STATUS";

    private final InterventionService interventionService;
    private final PermissionGuardService permissionGuardService;

    public InterventionController(
            InterventionService interventionService,
            PermissionGuardService permissionGuardService
    ) {
        this.interventionService = interventionService;
        this.permissionGuardService = permissionGuardService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','EMPLOYE','CHEF_HIERARCHIQUE','RESPONSABLE_SALLE','DIRECTEUR_DSN','RESPONSABLE_QUALITE')")
    public PageResponse<InterventionResponse> list(
            Pageable pageable,
            @RequestParam(name = "mine", defaultValue = "false") boolean mine,
            @RequestParam(name = "search", required = false) String search,
            @RequestParam(name = "status", required = false) InterventionStatus status,
            @RequestParam(name = "assignedTo", required = false) String assignedTo,
            Principal principal,
            Authentication authentication
    ) {
        permissionGuardService.check(authentication, VIEW_INTERVENTIONS_MODULE_PERMISSION);
        if (mine) {
            return interventionService.listMine(pageable, principal.getName(), search, status, assignedTo);
        }
        return interventionService.list(pageable, search, status, assignedTo);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','EMPLOYE','CHEF_HIERARCHIQUE','RESPONSABLE_SALLE','DIRECTEUR_DSN','RESPONSABLE_QUALITE')")
    public InterventionResponse getById(@PathVariable UUID id, Authentication authentication) {
        permissionGuardService.check(authentication, VIEW_INTERVENTIONS_MODULE_PERMISSION);
        return interventionService.getById(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('EMPLOYE','CHEF_HIERARCHIQUE','RESPONSABLE_QUALITE')")
    public InterventionResponse create(
            @Valid @RequestBody InterventionCreateRequest request,
            Principal principal,
            Authentication authentication
    ) {
        permissionGuardService.check(authentication, VIEW_INTERVENTIONS_MODULE_PERMISSION);
        return interventionService.create(request, principal.getName());
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','EMPLOYE','CHEF_HIERARCHIQUE')")
    public InterventionResponse updateOwnRequest(
            @PathVariable UUID id,
            @Valid @RequestBody InterventionUpdateRequest request,
            Authentication authentication
    ) {
        permissionGuardService.check(authentication, VIEW_INTERVENTIONS_MODULE_PERMISSION);
        return interventionService.updateOwnRequest(
                id,
                request,
                authentication.getName(),
                hasRole(authentication, "ROLE_ADMIN")
        );
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAnyRole('ADMIN','EMPLOYE','CHEF_HIERARCHIQUE')")
    public void deleteOwnRequest(@PathVariable UUID id, Authentication authentication) {
        permissionGuardService.check(authentication, VIEW_INTERVENTIONS_MODULE_PERMISSION);
        interventionService.deleteOwnRequest(
                id,
                authentication.getName(),
                hasRole(authentication, "ROLE_ADMIN")
        );
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN','RESPONSABLE_SALLE')")
    public InterventionResponse updateStatus(
            @PathVariable UUID id,
            @Valid @RequestBody InterventionStatusUpdateRequest request,
            Principal principal,
            Authentication authentication
    ) {
        permissionGuardService.check(authentication, VIEW_INTERVENTIONS_MODULE_PERMISSION);
        permissionGuardService.check(authentication, CHANGE_INTERVENTION_STATUS_PERMISSION);
        return interventionService.updateStatus(id, request, principal.getName());
    }

    @PutMapping("/{id}/validate")
    @PreAuthorize("hasAnyRole('ADMIN','RESPONSABLE_SALLE')")
    public InterventionResponse validate(
            @PathVariable UUID id,
            @Valid @RequestBody InterventionValidationRequest request,
            Principal principal,
            Authentication authentication
    ) {
        permissionGuardService.check(authentication, VIEW_INTERVENTIONS_MODULE_PERMISSION);
        permissionGuardService.check(authentication, CHANGE_INTERVENTION_STATUS_PERMISSION);
        return interventionService.validate(id, request, principal.getName());
    }

    private boolean hasRole(Authentication authentication, String role) {
        return authentication.getAuthorities()
                .stream()
                .anyMatch(grantedAuthority -> role.equals(grantedAuthority.getAuthority()));
    }
}
