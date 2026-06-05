package com.cnstn.event.controller;

import com.cnstn.event.dto.EventCreateRequest;
import com.cnstn.event.dto.EventDecisionRequest;
import com.cnstn.event.dto.EventDocumentContent;
import com.cnstn.event.dto.EventDocumentResponse;
import com.cnstn.event.dto.EventInviteRequest;
import com.cnstn.event.dto.EventInvitationRespondRequest;
import com.cnstn.event.dto.EventInvitationResponse;
import com.cnstn.event.dto.EventMeetingResponse;
import com.cnstn.event.dto.EventPhotoContent;
import com.cnstn.event.dto.EventPhotoResponse;
import com.cnstn.event.dto.EventResponse;
import com.cnstn.event.dto.EventSubmissionRequest;
import com.cnstn.event.dto.EventUpdateRequest;
import com.cnstn.event.dto.PageResponse;
import com.cnstn.event.dto.PartnerInviteRequest;
import com.cnstn.event.dto.PartnerInviteResponse;
import com.cnstn.event.entity.EventMode;
import com.cnstn.event.entity.EventStatus;
import com.cnstn.event.entity.EventType;
import com.cnstn.event.entity.EventWorkflowStep;
import com.cnstn.event.service.EventService;
import com.cnstn.event.service.EventPhotoService;
import com.cnstn.event.service.PermissionGuardService;
import jakarta.validation.Valid;
import java.security.Principal;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/events")
public class EventController {

    private static final String VIEW_EVENTS_MODULE_PERMISSION = "VIEW_EVENTS_MODULE";
    private static final String CREATE_EVENT_PERMISSION = "CREATE_EVENT";
    private static final String VALIDATE_EVENT_PERMISSION = "VALIDATE_EVENT";

    private final EventService eventService;
    private final EventPhotoService eventPhotoService;
    private final PermissionGuardService permissionGuardService;

    public EventController(
            EventService eventService,
            EventPhotoService eventPhotoService,
            PermissionGuardService permissionGuardService
    ) {
        this.eventService = eventService;
        this.eventPhotoService = eventPhotoService;
        this.permissionGuardService = permissionGuardService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','EMPLOYE','CHEF_HIERARCHIQUE','DIRECTEUR_DSN','RESPONSABLE_QUALITE','RESPONSABLE_SECURITE','RESPONSABLE_SALLE')")
    public PageResponse<EventResponse> list(
            Pageable pageable,
            Authentication authentication,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) EventStatus status,
            @RequestParam(required = false) EventType eventType,
            @RequestParam(required = false) EventMode eventMode,
            @RequestParam(required = false) EventWorkflowStep workflowStep,
            @RequestParam(required = false) String requestedBy
    ) {
        permissionGuardService.check(authentication, VIEW_EVENTS_MODULE_PERMISSION);
        return eventService.list(pageable, search, status, eventType, eventMode, workflowStep, requestedBy);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','EMPLOYE','CHEF_HIERARCHIQUE','DIRECTEUR_DSN','RESPONSABLE_QUALITE','RESPONSABLE_SECURITE','RESPONSABLE_SALLE')")
    public EventResponse getById(@PathVariable UUID id, Authentication authentication) {
        permissionGuardService.check(authentication, VIEW_EVENTS_MODULE_PERMISSION);
        return eventService.getById(id);
    }

    @GetMapping("/{id}/meeting")
    @PreAuthorize("hasAnyRole('ADMIN','EMPLOYE','CHEF_HIERARCHIQUE','DIRECTEUR_DSN','RESPONSABLE_QUALITE','RESPONSABLE_SECURITE','RESPONSABLE_SALLE')")
    public EventMeetingResponse getMeeting(@PathVariable UUID id, Authentication authentication) {
        permissionGuardService.check(authentication, VIEW_EVENTS_MODULE_PERMISSION);
        return eventService.getMeeting(id);
    }

    @GetMapping("/{id}/documents")
    @PreAuthorize("hasAnyRole('ADMIN','EMPLOYE','CHEF_HIERARCHIQUE','DIRECTEUR_DSN','RESPONSABLE_QUALITE','RESPONSABLE_SECURITE','RESPONSABLE_SALLE')")
    public List<EventDocumentResponse> listDocuments(@PathVariable UUID id, Authentication authentication) {
        permissionGuardService.check(authentication, VIEW_EVENTS_MODULE_PERMISSION);
        return eventService.listDocuments(id);
    }

    @GetMapping("/{id}/documents/latest/download")
    @PreAuthorize("hasAnyRole('ADMIN','EMPLOYE','CHEF_HIERARCHIQUE','DIRECTEUR_DSN','RESPONSABLE_QUALITE','RESPONSABLE_SECURITE','RESPONSABLE_SALLE')")
    public ResponseEntity<byte[]> downloadLatestDocument(@PathVariable UUID id, Authentication authentication) {
        permissionGuardService.check(authentication, VIEW_EVENTS_MODULE_PERMISSION);
        EventDocumentContent content = eventService.downloadLatestDocument(id);
        return toPdfResponse(content);
    }

    @GetMapping("/{id}/documents/{documentId}/download")
    @PreAuthorize("hasAnyRole('ADMIN','EMPLOYE','CHEF_HIERARCHIQUE','DIRECTEUR_DSN','RESPONSABLE_QUALITE','RESPONSABLE_SECURITE','RESPONSABLE_SALLE')")
    public ResponseEntity<byte[]> downloadDocument(
            @PathVariable UUID id,
            @PathVariable UUID documentId,
            Authentication authentication
    ) {
        permissionGuardService.check(authentication, VIEW_EVENTS_MODULE_PERMISSION);
        EventDocumentContent content = eventService.downloadDocument(id, documentId);
        return toPdfResponse(content);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('EMPLOYE','CHEF_HIERARCHIQUE','RESPONSABLE_QUALITE','ADMIN')")
    public EventResponse create(@Valid @RequestBody EventCreateRequest request, Principal principal, Authentication authentication) {
        permissionGuardService.check(authentication, VIEW_EVENTS_MODULE_PERMISSION);
        permissionGuardService.check(authentication, CREATE_EVENT_PERMISSION);
        return eventService.create(request, principal.getName());
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('EMPLOYE','CHEF_HIERARCHIQUE','RESPONSABLE_QUALITE','ADMIN')")
    public EventResponse update(
            @PathVariable UUID id,
            @Valid @RequestBody EventUpdateRequest request,
            Principal principal,
            Authentication authentication
    ) {
        permissionGuardService.check(authentication, VIEW_EVENTS_MODULE_PERMISSION);
        permissionGuardService.check(authentication, CREATE_EVENT_PERMISSION);
        boolean adminOverride = authentication.getAuthorities().stream()
                .anyMatch(authority -> "ROLE_ADMIN".equals(authority.getAuthority()));
        return eventService.update(id, request, principal.getName(), adminOverride);
    }

    @PostMapping("/{id}/submit")
    @PreAuthorize("hasAnyRole('EMPLOYE','CHEF_HIERARCHIQUE','RESPONSABLE_QUALITE','ADMIN')")
    public EventResponse submit(
            @PathVariable UUID id,
            @Valid @RequestBody(required = false) EventSubmissionRequest request,
            Principal principal,
            Authentication authentication
    ) {
        permissionGuardService.check(authentication, VIEW_EVENTS_MODULE_PERMISSION);
        permissionGuardService.check(authentication, CREATE_EVENT_PERMISSION);
        EventSubmissionRequest safeRequest = request == null ? new EventSubmissionRequest(null) : request;
        return eventService.submit(id, safeRequest, principal.getName());
    }

    @GetMapping("/{id}/photos")
    @PreAuthorize("hasAnyRole('ADMIN','EMPLOYE','CHEF_HIERARCHIQUE','DIRECTEUR_DSN','RESPONSABLE_QUALITE','RESPONSABLE_SECURITE','RESPONSABLE_SALLE')")
    public List<EventPhotoResponse> listPhotos(@PathVariable UUID id, Authentication authentication) {
        permissionGuardService.check(authentication, VIEW_EVENTS_MODULE_PERMISSION);
        return eventPhotoService.list(id);
    }

    @PostMapping(path = "/{id}/photos", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('EMPLOYE','CHEF_HIERARCHIQUE','RESPONSABLE_QUALITE','ADMIN')")
    public EventPhotoResponse uploadPhoto(
            @PathVariable UUID id,
            @RequestParam("file") MultipartFile file,
            Principal principal,
            Authentication authentication
    ) {
        permissionGuardService.check(authentication, VIEW_EVENTS_MODULE_PERMISSION);
        permissionGuardService.check(authentication, CREATE_EVENT_PERMISSION);
        return eventPhotoService.upload(id, file, principal.getName());
    }

    @GetMapping("/{id}/photos/{photoId}/download")
    @PreAuthorize("hasAnyRole('ADMIN','EMPLOYE','CHEF_HIERARCHIQUE','DIRECTEUR_DSN','RESPONSABLE_QUALITE','RESPONSABLE_SECURITE','RESPONSABLE_SALLE')")
    public ResponseEntity<byte[]> downloadPhoto(
            @PathVariable UUID id,
            @PathVariable UUID photoId,
            Authentication authentication
    ) {
        permissionGuardService.check(authentication, VIEW_EVENTS_MODULE_PERMISSION);
        EventPhotoContent content = eventPhotoService.download(id, photoId);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(content.contentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + content.fileName() + "\"")
                .body(content.content());
    }

    @DeleteMapping("/{id}/photos/{photoId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAnyRole('EMPLOYE','CHEF_HIERARCHIQUE','RESPONSABLE_QUALITE','ADMIN')")
    public void archivePhoto(
            @PathVariable UUID id,
            @PathVariable UUID photoId,
            Authentication authentication
    ) {
        permissionGuardService.check(authentication, VIEW_EVENTS_MODULE_PERMISSION);
        permissionGuardService.check(authentication, CREATE_EVENT_PERMISSION);
        eventPhotoService.archive(id, photoId);
    }

    @PostMapping("/{id}/resubmit")
    @PreAuthorize("hasAnyRole('EMPLOYE','CHEF_HIERARCHIQUE','RESPONSABLE_QUALITE','ADMIN')")
    public EventResponse resubmit(
            @PathVariable UUID id,
            @Valid @RequestBody(required = false) EventSubmissionRequest request,
            Principal principal,
            Authentication authentication
    ) {
        permissionGuardService.check(authentication, VIEW_EVENTS_MODULE_PERMISSION);
        permissionGuardService.check(authentication, CREATE_EVENT_PERMISSION);
        EventSubmissionRequest safeRequest = request == null ? new EventSubmissionRequest(null) : request;
        return eventService.submit(id, safeRequest, principal.getName());
    }

    @PutMapping("/{id}/workflow/manager-decision")
    @PreAuthorize("hasAnyRole('CHEF_HIERARCHIQUE','ADMIN')")
    public EventResponse managerDecision(
            @PathVariable UUID id,
            @Valid @RequestBody EventDecisionRequest request,
            Principal principal,
            Authentication authentication
    ) {
        permissionGuardService.check(authentication, VIEW_EVENTS_MODULE_PERMISSION);
        permissionGuardService.check(authentication, VALIDATE_EVENT_PERMISSION);
        return eventService.managerDecision(id, request, principal.getName());
    }

    @PutMapping("/{id}/workflow/security-decision")
    @PreAuthorize("hasAnyRole('RESPONSABLE_SECURITE','ADMIN')")
    public EventResponse securityDecision(
            @PathVariable UUID id,
            @Valid @RequestBody EventDecisionRequest request,
            Principal principal,
            Authentication authentication
    ) {
        permissionGuardService.check(authentication, VIEW_EVENTS_MODULE_PERMISSION);
        return eventService.securityDecision(id, request, principal.getName());
    }

    @PutMapping("/{id}/workflow/dsn-decision")
    @PreAuthorize("hasAnyRole('DIRECTEUR_DSN','ADMIN')")
    public EventResponse dsnDecision(
            @PathVariable UUID id,
            @Valid @RequestBody EventDecisionRequest request,
            Principal principal,
            Authentication authentication
    ) {
        permissionGuardService.check(authentication, VIEW_EVENTS_MODULE_PERMISSION);
        permissionGuardService.check(authentication, VALIDATE_EVENT_PERMISSION);
        return eventService.dsnDecision(id, request, principal.getName());
    }

    @PutMapping("/{id}/workflow/room-decision")
    @PreAuthorize("hasAnyRole('RESPONSABLE_SALLE','ADMIN')")
    public EventResponse roomDecision(
            @PathVariable UUID id,
            @Valid @RequestBody EventDecisionRequest request,
            Principal principal,
            Authentication authentication
    ) {
        permissionGuardService.check(authentication, VIEW_EVENTS_MODULE_PERMISSION);
        return eventService.roomDecision(id, request, principal.getName());
    }

    @PutMapping("/{id}/decision")
    @PreAuthorize("hasAnyRole('CHEF_HIERARCHIQUE','DIRECTEUR_DSN','RESPONSABLE_SECURITE','RESPONSABLE_SALLE','ADMIN')")
    public EventResponse decide(
            @PathVariable UUID id,
            @Valid @RequestBody EventDecisionRequest request,
            Principal principal,
            Authentication authentication
    ) {
        permissionGuardService.check(authentication, VIEW_EVENTS_MODULE_PERMISSION);
        return eventService.decideWithCurrentStep(id, request, principal.getName(), authentication);
    }

    @PostMapping("/{id}/partners")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('EMPLOYE','CHEF_HIERARCHIQUE','DIRECTEUR_DSN','ADMIN')")
    public PartnerInviteResponse invitePartner(
            @PathVariable UUID id,
            @Valid @RequestBody PartnerInviteRequest request,
            Authentication authentication
    ) {
        permissionGuardService.check(authentication, VIEW_EVENTS_MODULE_PERMISSION);
        return eventService.invitePartner(id, request);
    }

    @GetMapping("/{id}/partners")
    @PreAuthorize("hasAnyRole('ADMIN','CHEF_HIERARCHIQUE','DIRECTEUR_DSN')")
    public List<PartnerInviteResponse> listPartners(@PathVariable UUID id, Authentication authentication) {
        permissionGuardService.check(authentication, VIEW_EVENTS_MODULE_PERMISSION);
        return eventService.listPartners(id);
    }

    @PostMapping("/{id}/invitations")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('EMPLOYE','CHEF_HIERARCHIQUE','RESPONSABLE_QUALITE','ADMIN')")
    public List<EventInvitationResponse> inviteEmployees(
            @PathVariable UUID id,
            @Valid @RequestBody EventInviteRequest request,
            Principal principal,
            Authentication authentication
    ) {
        permissionGuardService.check(authentication, VIEW_EVENTS_MODULE_PERMISSION);
        permissionGuardService.check(authentication, CREATE_EVENT_PERMISSION);
        return eventService.inviteEmployees(id, request, principal.getName(), principal.getName(), false);
    }

    @GetMapping("/{id}/invitations")
    @PreAuthorize("hasAnyRole('ADMIN','EMPLOYE','CHEF_HIERARCHIQUE','DIRECTEUR_DSN','RESPONSABLE_QUALITE','RESPONSABLE_SECURITE','RESPONSABLE_SALLE')")
    public List<EventInvitationResponse> listEventInvitations(
            @PathVariable UUID id,
            Principal principal,
            Authentication authentication
    ) {
        permissionGuardService.check(authentication, VIEW_EVENTS_MODULE_PERMISSION);
        return eventService.listInvitationsForEvent(id, principal.getName(), false);
    }

    @GetMapping("/invitations/mine")
    @PreAuthorize("hasAnyRole('ADMIN','EMPLOYE','CHEF_HIERARCHIQUE','DIRECTEUR_DSN','RESPONSABLE_QUALITE','RESPONSABLE_SECURITE','RESPONSABLE_SALLE')")
    public List<EventInvitationResponse> listMyInvitations(
            Principal principal,
            Authentication authentication
    ) {
        permissionGuardService.check(authentication, VIEW_EVENTS_MODULE_PERMISSION);
        return eventService.listInvitationsForCurrentUser(principal.getName());
    }

    @GetMapping("/invitations/admin")
    @PreAuthorize("hasRole('ADMIN')")
    public List<EventInvitationResponse> listAllInvitations(Authentication authentication) {
        permissionGuardService.check(authentication, VIEW_EVENTS_MODULE_PERMISSION);
        return eventService.listAllInvitationsForAdmin();
    }

    @PostMapping("/invitations/{invitationId}/accept")
    @PreAuthorize("hasAnyRole('ADMIN','EMPLOYE','CHEF_HIERARCHIQUE','DIRECTEUR_DSN','RESPONSABLE_QUALITE','RESPONSABLE_SECURITE','RESPONSABLE_SALLE')")
    public EventInvitationResponse acceptInvitation(
            @PathVariable UUID invitationId,
            Principal principal,
            Authentication authentication
    ) {
        permissionGuardService.check(authentication, VIEW_EVENTS_MODULE_PERMISSION);
        return eventService.acceptInvitation(invitationId, principal.getName());
    }

    @PutMapping("/invitations/{invitationId}/accept")
    @PreAuthorize("hasAnyRole('ADMIN','EMPLOYE','CHEF_HIERARCHIQUE','DIRECTEUR_DSN','RESPONSABLE_QUALITE','RESPONSABLE_SECURITE','RESPONSABLE_SALLE')")
    public EventInvitationResponse acceptInvitationPut(
            @PathVariable UUID invitationId,
            Principal principal,
            Authentication authentication
    ) {
        return acceptInvitation(invitationId, principal, authentication);
    }

    @PostMapping("/invitations/{invitationId}/decline")
    @PreAuthorize("hasAnyRole('ADMIN','EMPLOYE','CHEF_HIERARCHIQUE','DIRECTEUR_DSN','RESPONSABLE_QUALITE','RESPONSABLE_SECURITE','RESPONSABLE_SALLE')")
    public EventInvitationResponse declineInvitation(
            @PathVariable UUID invitationId,
            @Valid @RequestBody(required = false) EventInvitationRespondRequest request,
            Principal principal,
            Authentication authentication
    ) {
        permissionGuardService.check(authentication, VIEW_EVENTS_MODULE_PERMISSION);
        EventInvitationRespondRequest safeRequest = request == null
                ? new EventInvitationRespondRequest(null)
                : request;
        return eventService.declineInvitation(invitationId, safeRequest, principal.getName());
    }

    @PutMapping("/invitations/{invitationId}/cancel")
    @PreAuthorize("hasAnyRole('ADMIN','EMPLOYE','CHEF_HIERARCHIQUE','RESPONSABLE_QUALITE')")
    public EventInvitationResponse cancelInvitation(
            @PathVariable UUID invitationId,
            Principal principal,
            Authentication authentication
    ) {
        permissionGuardService.check(authentication, VIEW_EVENTS_MODULE_PERMISSION);
        boolean adminOverride = authentication.getAuthorities().stream()
                .anyMatch(authority -> "ROLE_ADMIN".equals(authority.getAuthority()));
        return eventService.cancelInvitation(invitationId, principal.getName(), adminOverride);
    }

    @PutMapping("/invitations/{invitationId}/refuse")
    @PreAuthorize("hasAnyRole('ADMIN','EMPLOYE','CHEF_HIERARCHIQUE','DIRECTEUR_DSN','RESPONSABLE_QUALITE','RESPONSABLE_SECURITE','RESPONSABLE_SALLE')")
    public EventInvitationResponse refuseInvitationPut(
            @PathVariable UUID invitationId,
            @Valid @RequestBody(required = false) EventInvitationRespondRequest request,
            Principal principal,
            Authentication authentication
    ) {
        return declineInvitation(invitationId, request, principal, authentication);
    }

    private ResponseEntity<byte[]> toPdfResponse(EventDocumentContent content) {
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(content.mimeType()))
                .header(
                        HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + content.fileName() + "\""
                )
                .body(content.content());
    }
}
