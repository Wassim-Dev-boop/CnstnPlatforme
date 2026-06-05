package com.cnstn.authuser.controller;

import com.cnstn.authuser.dto.ItEquipmentCategoryResponse;
import com.cnstn.authuser.service.ItEquipmentCategoryService;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/it-equipment/categories")
public class ItEquipmentCategoryController {

    private final ItEquipmentCategoryService categoryService;

    public ItEquipmentCategoryController(ItEquipmentCategoryService categoryService) {
        this.categoryService = categoryService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('RESPONSABLE_IT','DIRECTEUR_DSN','ADMIN')")
    public ResponseEntity<List<ItEquipmentCategoryResponse>> listActive() {
        return ResponseEntity.ok(categoryService.listActive());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('RESPONSABLE_IT','DIRECTEUR_DSN','ADMIN')")
    public ResponseEntity<ItEquipmentCategoryResponse> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(categoryService.getById(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('RESPONSABLE_IT','DIRECTEUR_DSN','ADMIN')")
    public ResponseEntity<ItEquipmentCategoryResponse> create(@RequestBody Map<String, String> request) {
        String name = request.get("name");
        String description = request.get("description");
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(categoryService.create(name, description));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('RESPONSABLE_IT','DIRECTEUR_DSN','ADMIN')")
    public ResponseEntity<ItEquipmentCategoryResponse> update(
        @PathVariable UUID id,
        @RequestBody Map<String, String> request
    ) {
        String name = request.get("name");
        String description = request.get("description");
        return ResponseEntity.ok(categoryService.update(id, name, description));
    }
}
