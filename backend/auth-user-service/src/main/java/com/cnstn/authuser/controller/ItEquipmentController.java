package com.cnstn.authuser.controller;

import com.cnstn.authuser.dto.ItEquipmentResponse;
import com.cnstn.authuser.dto.ItEquipmentCreateRequest;
import com.cnstn.authuser.dto.ItEquipmentUpdateRequest;
import com.cnstn.authuser.service.ItEquipmentService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
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
@RequestMapping("/api/v1/it-equipment")
public class ItEquipmentController {

    private final ItEquipmentService equipmentService;

    public ItEquipmentController(ItEquipmentService equipmentService) {
        this.equipmentService = equipmentService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('RESPONSABLE_IT','DIRECTEUR_DSN','ADMIN')")
    public ResponseEntity<Page<ItEquipmentResponse>> list(Pageable pageable) {
        return ResponseEntity.ok(equipmentService.listAll(pageable));
    }

    @GetMapping("/search")
    @PreAuthorize("hasAnyRole('RESPONSABLE_IT','DIRECTEUR_DSN','ADMIN')")
    public ResponseEntity<Page<ItEquipmentResponse>> search(
        @RequestParam(value = "query", required = false, defaultValue = "") String query,
        Pageable pageable
    ) {
        if (query == null || query.isBlank()) {
            return ResponseEntity.ok(equipmentService.listAll(pageable));
        }
        return ResponseEntity.ok(equipmentService.search(query, pageable));
    }

    @GetMapping("/filter/category/{categoryId}")
    @PreAuthorize("hasAnyRole('RESPONSABLE_IT','DIRECTEUR_DSN','ADMIN')")
    public ResponseEntity<Page<ItEquipmentResponse>> filterByCategory(
        @PathVariable UUID categoryId,
        Pageable pageable
    ) {
        return ResponseEntity.ok(equipmentService.filterByCategory(categoryId, pageable));
    }

    @GetMapping("/filter/state/{state}")
    @PreAuthorize("hasAnyRole('RESPONSABLE_IT','DIRECTEUR_DSN','ADMIN')")
    public ResponseEntity<Page<ItEquipmentResponse>> filterByState(
        @PathVariable String state,
        Pageable pageable
    ) {
        return ResponseEntity.ok(equipmentService.filterByState(state, pageable));
    }

    @GetMapping("/filter/assignment-status/{assignmentStatus}")
    @PreAuthorize("hasAnyRole('RESPONSABLE_IT','DIRECTEUR_DSN','ADMIN')")
    public ResponseEntity<Page<ItEquipmentResponse>> filterByAssignmentStatus(
        @PathVariable String assignmentStatus,
        Pageable pageable
    ) {
        return ResponseEntity.ok(equipmentService.filterByAssignmentStatus(assignmentStatus, pageable));
    }

    @GetMapping("/my")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<ItEquipmentResponse>> getMyEquipment(Authentication authentication) {
        String userId = authentication.getName();
        return ResponseEntity.ok(equipmentService.getEmployeeEquipment(userId));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('RESPONSABLE_IT','DIRECTEUR_DSN','ADMIN')")
    public ResponseEntity<ItEquipmentResponse> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(equipmentService.getById(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('RESPONSABLE_IT','DIRECTEUR_DSN','ADMIN')")
    public ResponseEntity<ItEquipmentResponse> create(@Valid @RequestBody ItEquipmentCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(equipmentService.create(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('RESPONSABLE_IT','DIRECTEUR_DSN','ADMIN')")
    public ResponseEntity<ItEquipmentResponse> update(
        @PathVariable UUID id,
        @Valid @RequestBody ItEquipmentUpdateRequest request
    ) {
        return ResponseEntity.ok(equipmentService.update(id, request));
    }

    @PatchMapping("/{id}/state")
    @PreAuthorize("hasAnyRole('RESPONSABLE_IT','DIRECTEUR_DSN','ADMIN')")
    public ResponseEntity<ItEquipmentResponse> updateState(
        @PathVariable UUID id,
        @RequestBody Map<String, String> request
    ) {
        String newState = request.get("state");
        if (newState == null || newState.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(equipmentService.updateState(id, newState));
    }

    @DeleteMapping("/{id}/archive")
    @PreAuthorize("hasAnyRole('RESPONSABLE_IT','DIRECTEUR_DSN','ADMIN')")
    public ResponseEntity<Void> archive(@PathVariable UUID id) {
        equipmentService.archive(id);
        return ResponseEntity.noContent().build();
    }
}
