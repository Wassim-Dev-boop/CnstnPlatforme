package com.cnstn.authuser.controller;

import com.cnstn.authuser.dto.ItAssignableEmployeeResponse;
import com.cnstn.authuser.dto.ItEquipmentAssignmentResponse;
import com.cnstn.authuser.dto.ItEquipmentAssignmentCreateRequest;
import com.cnstn.authuser.service.ItEquipmentAssignmentService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/it-equipment/assignments")
public class ItEquipmentAssignmentController {

    private final ItEquipmentAssignmentService assignmentService;

    public ItEquipmentAssignmentController(ItEquipmentAssignmentService assignmentService) {
        this.assignmentService = assignmentService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('RESPONSABLE_IT','DIRECTEUR_DSN','ADMIN')")
    public ResponseEntity<Page<ItEquipmentAssignmentResponse>> listAll(Pageable pageable) {
        return ResponseEntity.ok(assignmentService.listAllActive(pageable));
    }

    @GetMapping("/my")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<ItEquipmentAssignmentResponse>> getMyAssignments(Authentication authentication) {
        String userId = authentication.getName();
        return ResponseEntity.ok(assignmentService.getEmployeeAssignments(userId));
    }

    @GetMapping("/equipment/{equipmentId}/history")
    @PreAuthorize("hasAnyRole('RESPONSABLE_IT','DIRECTEUR_DSN','ADMIN')")
    public ResponseEntity<List<ItEquipmentAssignmentResponse>> getEquipmentHistory(@PathVariable UUID equipmentId) {
        return ResponseEntity.ok(assignmentService.listHistoryByEquipment(equipmentId));
    }

    @GetMapping("/assignable-employees")
    @PreAuthorize("hasAnyRole('RESPONSABLE_IT','DIRECTEUR_DSN','ADMIN')")
    public ResponseEntity<List<ItAssignableEmployeeResponse>> listAssignableEmployees() {
        return ResponseEntity.ok(assignmentService.listAssignableEmployees());
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ItEquipmentAssignmentResponse> getById(
        @PathVariable UUID id,
        Authentication authentication
    ) {
        boolean privileged = authentication.getAuthorities().stream()
            .anyMatch(authority -> "ROLE_ADMIN".equals(authority.getAuthority())
                || "ROLE_DIRECTEUR_DSN".equals(authority.getAuthority())
                || "ROLE_RESPONSABLE_IT".equals(authority.getAuthority()));
        if (!privileged && !assignmentService.hasEmployeeAccessToAssignment(id, authentication.getName())) {
            throw new AccessDeniedException("Access denied");
        }
        return ResponseEntity.ok(assignmentService.getById(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('RESPONSABLE_IT','DIRECTEUR_DSN','ADMIN')")
    public ResponseEntity<ItEquipmentAssignmentResponse> assign(
        @Valid @RequestBody ItEquipmentAssignmentCreateRequest request,
        Authentication authentication
    ) {
        String assignedBy = authentication.getName();
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(assignmentService.assign(request, assignedBy));
    }

    @PostMapping("/{id}/return")
    @PreAuthorize("hasAnyRole('RESPONSABLE_IT','DIRECTEUR_DSN','ADMIN')")
    public ResponseEntity<ItEquipmentAssignmentResponse> returnEquipment(
        @PathVariable UUID id,
        Authentication authentication
    ) {
        String returnedBy = authentication.getName();
        return ResponseEntity.ok(assignmentService.returnEquipment(id, returnedBy));
    }
}
