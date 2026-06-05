package com.cnstn.authuser.controller;

import com.cnstn.authuser.client.notification.NotificationClientProperties;
import com.cnstn.authuser.dto.InternalItEquipmentOwnershipResponse;
import com.cnstn.authuser.dto.InternalItEquipmentStateUpdateRequest;
import com.cnstn.authuser.dto.InternalItEquipmentSummaryResponse;
import com.cnstn.authuser.exception.UnauthorizedException;
import com.cnstn.authuser.service.ItEquipmentService;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/internal/it-equipment")
public class InternalItEquipmentController {

    private final ItEquipmentService itEquipmentService;
    private final NotificationClientProperties notificationClientProperties;

    public InternalItEquipmentController(
        ItEquipmentService itEquipmentService,
        NotificationClientProperties notificationClientProperties
    ) {
        this.itEquipmentService = itEquipmentService;
        this.notificationClientProperties = notificationClientProperties;
    }

    @GetMapping("/{equipmentId}")
    public ResponseEntity<InternalItEquipmentSummaryResponse> getById(
        @RequestHeader(name = "X-Api-Key", required = false) String apiKey,
        @PathVariable UUID equipmentId
    ) {
        validateApiKey(apiKey);
        return ResponseEntity.ok(itEquipmentService.getInternalSummary(equipmentId));
    }

    @GetMapping("/{equipmentId}/ownership")
    public ResponseEntity<InternalItEquipmentOwnershipResponse> checkOwnership(
        @RequestHeader(name = "X-Api-Key", required = false) String apiKey,
        @PathVariable UUID equipmentId,
        @RequestParam("employeeId") String employeeId
    ) {
        validateApiKey(apiKey);
        return ResponseEntity.ok(itEquipmentService.checkOwnership(equipmentId, employeeId));
    }

    @PatchMapping("/{equipmentId}/state")
    public ResponseEntity<InternalItEquipmentSummaryResponse> updateState(
        @RequestHeader(name = "X-Api-Key", required = false) String apiKey,
        @PathVariable UUID equipmentId,
        @Valid @RequestBody InternalItEquipmentStateUpdateRequest request
    ) {
        validateApiKey(apiKey);
        return ResponseEntity.ok(itEquipmentService.updateStateForInternal(equipmentId, request.state()));
    }

    private void validateApiKey(String providedApiKey) {
        String expected = notificationClientProperties.getInternalApiKey();
        if (expected == null || expected.isBlank() || !expected.equals(providedApiKey)) {
            throw new UnauthorizedException("Invalid internal API key");
        }
    }
}
