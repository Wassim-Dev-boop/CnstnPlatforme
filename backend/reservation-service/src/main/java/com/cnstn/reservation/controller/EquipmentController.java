package com.cnstn.reservation.controller;

import com.cnstn.reservation.dto.EquipmentRequest;
import com.cnstn.reservation.dto.EquipmentResponse;
import com.cnstn.reservation.dto.PageResponse;
import com.cnstn.reservation.service.EquipmentService;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
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
@RequestMapping("/api/v1/equipments")
public class EquipmentController {

    private final EquipmentService equipmentService;

    public EquipmentController(EquipmentService equipmentService) {
        this.equipmentService = equipmentService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','EMPLOYE','CHEF_HIERARCHIQUE','RESPONSABLE_SALLE','RESPONSABLE_SECURITE','DIRECTEUR_DSN','RESPONSABLE_QUALITE','RESPONSABLE_IT')")
    public PageResponse<EquipmentResponse> list(
            Pageable pageable,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Boolean active
    ) {
        return equipmentService.list(pageable, search, active);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','EMPLOYE','CHEF_HIERARCHIQUE','RESPONSABLE_SALLE','RESPONSABLE_SECURITE','DIRECTEUR_DSN','RESPONSABLE_QUALITE','RESPONSABLE_IT')")
    public EquipmentResponse getById(@PathVariable UUID id) {
        return equipmentService.getById(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('ADMIN','RESPONSABLE_SALLE')")
    public EquipmentResponse create(@Valid @RequestBody EquipmentRequest request) {
        return equipmentService.create(request);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','RESPONSABLE_SALLE')")
    public EquipmentResponse update(@PathVariable UUID id, @Valid @RequestBody EquipmentRequest request) {
        return equipmentService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAnyRole('ADMIN','RESPONSABLE_SALLE')")
    public void delete(@PathVariable UUID id) {
        equipmentService.delete(id);
    }
}
