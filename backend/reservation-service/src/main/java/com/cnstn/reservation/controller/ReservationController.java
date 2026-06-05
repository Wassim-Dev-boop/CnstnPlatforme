package com.cnstn.reservation.controller;

import com.cnstn.reservation.dto.ConflictCheckResponse;
import com.cnstn.reservation.dto.PageResponse;
import com.cnstn.reservation.dto.ReservationCreateRequest;
import com.cnstn.reservation.dto.ReservationDocumentContent;
import com.cnstn.reservation.dto.ReservationDocumentResponse;
import com.cnstn.reservation.dto.ReservationResponse;
import com.cnstn.reservation.dto.SecurityValidationRequest;
import com.cnstn.reservation.entity.EventMode;
import com.cnstn.reservation.entity.ReservationStatus;
import com.cnstn.reservation.service.ReservationService;
import jakarta.validation.Valid;
import java.security.Principal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
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
@RequestMapping("/api/v1/reservations")
public class ReservationController {

    private final ReservationService reservationService;

    public ReservationController(ReservationService reservationService) {
        this.reservationService = reservationService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','EMPLOYE','CHEF_HIERARCHIQUE','RESPONSABLE_SALLE','RESPONSABLE_SECURITE','DIRECTEUR_DSN','RESPONSABLE_QUALITE')")
    public PageResponse<ReservationResponse> list(
            Pageable pageable,
            @RequestParam(required = false) UUID eventId,
            @RequestParam(required = false) ReservationStatus status,
            @RequestParam(required = false) String requesterUsername,
            @RequestParam(required = false) UUID roomId,
            @RequestParam(required = false) UUID equipmentId,
            @RequestParam(required = false) EventMode eventMode,
            @RequestParam(required = false) String search
    ) {
        return reservationService.list(pageable, eventId, status, requesterUsername, roomId, equipmentId, eventMode, search);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','EMPLOYE','CHEF_HIERARCHIQUE','RESPONSABLE_SALLE','RESPONSABLE_SECURITE','DIRECTEUR_DSN','RESPONSABLE_QUALITE')")
    public ReservationResponse getById(@PathVariable UUID id) {
        return reservationService.getById(id);
    }

    @GetMapping("/events/{eventId}")
    @PreAuthorize("hasAnyRole('ADMIN','EMPLOYE','CHEF_HIERARCHIQUE','RESPONSABLE_SALLE','RESPONSABLE_SECURITE','DIRECTEUR_DSN','RESPONSABLE_QUALITE')")
    public List<ReservationResponse> listByEvent(@PathVariable UUID eventId) {
        return reservationService.listByEventId(eventId);
    }

    @GetMapping("/{id}/documents")
    @PreAuthorize("hasAnyRole('ADMIN','EMPLOYE','CHEF_HIERARCHIQUE','RESPONSABLE_SALLE','RESPONSABLE_SECURITE','DIRECTEUR_DSN','RESPONSABLE_QUALITE')")
    public List<ReservationDocumentResponse> listDocuments(@PathVariable UUID id) {
        return reservationService.listDocuments(id);
    }

    @GetMapping("/{id}/documents/latest/download")
    @PreAuthorize("hasAnyRole('ADMIN','EMPLOYE','CHEF_HIERARCHIQUE','RESPONSABLE_SALLE','RESPONSABLE_SECURITE','DIRECTEUR_DSN','RESPONSABLE_QUALITE')")
    public ResponseEntity<byte[]> downloadLatestDocument(@PathVariable UUID id) {
        ReservationDocumentContent content = reservationService.downloadLatestDocument(id);
        return toPdfResponse(content);
    }

    @GetMapping("/{id}/documents/{documentId}/download")
    @PreAuthorize("hasAnyRole('ADMIN','EMPLOYE','CHEF_HIERARCHIQUE','RESPONSABLE_SALLE','RESPONSABLE_SECURITE','DIRECTEUR_DSN','RESPONSABLE_QUALITE')")
    public ResponseEntity<byte[]> downloadDocument(@PathVariable UUID id, @PathVariable UUID documentId) {
        ReservationDocumentContent content = reservationService.downloadDocument(id, documentId);
        return toPdfResponse(content);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('EMPLOYE','CHEF_HIERARCHIQUE','RESPONSABLE_QUALITE','RESPONSABLE_SALLE','ADMIN')")
    public ReservationResponse create(@Valid @RequestBody ReservationCreateRequest request, Principal principal) {
        return reservationService.create(request, principal.getName());
    }

    @GetMapping("/conflicts")
    @PreAuthorize("hasAnyRole('RESPONSABLE_SECURITE','RESPONSABLE_SALLE','EMPLOYE','CHEF_HIERARCHIQUE','RESPONSABLE_QUALITE','ADMIN')")
    public ConflictCheckResponse conflicts(
            @RequestParam(required = false) UUID roomId,
            @RequestParam(required = false) UUID equipmentId,
            @RequestParam(required = false) Integer quantityRequested,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant startAt,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant endAt
    ) {
        return reservationService.checkConflict(roomId, equipmentId, startAt, endAt, quantityRequested);
    }

    @PutMapping("/{id}/security-validation")
    @PreAuthorize("hasAnyRole('RESPONSABLE_SECURITE','RESPONSABLE_SALLE','ADMIN')")
    public ReservationResponse securityValidation(
            @PathVariable UUID id,
            @Valid @RequestBody SecurityValidationRequest request,
            Authentication authentication
    ) {
        return reservationService.securityValidation(
                id,
                request.approved(),
                authentication.getName(),
                request.decisionComment(),
                resolveDecisionRole(authentication)
        );
    }

    private String resolveDecisionRole(Authentication authentication) {
        if (hasAuthority(authentication, "RESPONSABLE_SALLE")) {
            return "RESPONSABLE_SALLE";
        }
        if (hasAuthority(authentication, "RESPONSABLE_SECURITE")) {
            return "RESPONSABLE_SECURITE";
        }
        return "ADMIN";
    }

    private boolean hasAuthority(Authentication authentication, String role) {
        String expectedAuthority = "ROLE_" + role;
        return authentication.getAuthorities().stream()
                .anyMatch(authority -> expectedAuthority.equals(authority.getAuthority()));
    }

    private ResponseEntity<byte[]> toPdfResponse(ReservationDocumentContent content) {
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(content.mimeType()))
                .header(
                        HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + content.fileName() + "\""
                )
                .body(content.content());
    }
}
