package com.cnstn.ged.controller;

import com.cnstn.ged.dto.DocumentAclResponse;
import com.cnstn.ged.dto.DocumentAclUpdateRequest;
import com.cnstn.ged.dto.DocumentCreateRequest;
import com.cnstn.ged.dto.DocumentLinkRequest;
import com.cnstn.ged.dto.DocumentLinkResponse;
import com.cnstn.ged.dto.DocumentPreviewResponse;
import com.cnstn.ged.dto.DocumentResponse;
import com.cnstn.ged.dto.DocumentUpdateRequest;
import com.cnstn.ged.dto.DocumentUploadMetadataRequest;
import com.cnstn.ged.dto.DocumentVersionCreateRequest;
import com.cnstn.ged.dto.DocumentVersionUploadMetadataRequest;
import com.cnstn.ged.dto.DocumentVersionResponse;
import com.cnstn.ged.dto.FolderTreeResponse;
import com.cnstn.ged.dto.FolderUpsertRequest;
import com.cnstn.ged.dto.GedAuditLogResponse;
import com.cnstn.ged.dto.PageResponse;
import com.cnstn.ged.entity.DocumentConfidentialityLevel;
import com.cnstn.ged.service.DocumentService;
import com.cnstn.ged.service.PermissionGuardService;
import jakarta.validation.Valid;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/documents")
public class DocumentController {

    private static final String VIEW_GED_MODULE_PERMISSION = "VIEW_GED_MODULE";
    private static final String PUBLISH_DOCUMENT_PERMISSION = "PUBLISH_DOCUMENT";
    private static final String BUSINESS_ROLES = "hasAnyRole('ADMIN','EMPLOYE','CHEF_HIERARCHIQUE','RESPONSABLE_QUALITE','DIRECTEUR_DSN','RESPONSABLE_SALLE','RESPONSABLE_SECURITE')";

    private final DocumentService documentService;
    private final PermissionGuardService permissionGuardService;

    public DocumentController(DocumentService documentService, PermissionGuardService permissionGuardService) {
        this.documentService = documentService;
        this.permissionGuardService = permissionGuardService;
    }

    @GetMapping
    @PreAuthorize(BUSINESS_ROLES)
    public PageResponse<DocumentResponse> list(
            Pageable pageable,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) DocumentConfidentialityLevel confidentiality,
            @RequestParam(required = false) UUID folderId,
            Authentication authentication
    ) {
        permissionGuardService.check(authentication, VIEW_GED_MODULE_PERMISSION);
        return documentService.list(pageable, search, category, confidentiality, folderId, authentication);
    }

    @GetMapping("/folders/tree")
    @PreAuthorize(BUSINESS_ROLES)
    public List<FolderTreeResponse> listFolderTree(Authentication authentication) {
        permissionGuardService.check(authentication, VIEW_GED_MODULE_PERMISSION);
        return documentService.listFolderTree(authentication);
    }

    @PostMapping("/folders")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('ADMIN','RESPONSABLE_QUALITE')")
    public FolderTreeResponse createFolder(
            @Valid @RequestBody FolderUpsertRequest request,
            Authentication authentication
    ) {
        permissionGuardService.check(authentication, VIEW_GED_MODULE_PERMISSION);
        return documentService.createFolder(request, authentication);
    }

    @PutMapping("/folders/{folderId}")
    @PreAuthorize("hasAnyRole('ADMIN','RESPONSABLE_QUALITE')")
    public FolderTreeResponse updateFolder(
            @PathVariable UUID folderId,
            @Valid @RequestBody FolderUpsertRequest request,
            Authentication authentication
    ) {
        permissionGuardService.check(authentication, VIEW_GED_MODULE_PERMISSION);
        return documentService.updateFolder(folderId, request, authentication);
    }

    @DeleteMapping("/folders/{folderId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAnyRole('ADMIN','RESPONSABLE_QUALITE')")
    public void archiveFolder(@PathVariable UUID folderId, Authentication authentication) {
        permissionGuardService.check(authentication, VIEW_GED_MODULE_PERMISSION);
        documentService.archiveFolder(folderId, authentication);
    }

    @GetMapping("/audit-logs")
    @PreAuthorize("hasAnyRole('ADMIN','RESPONSABLE_QUALITE')")
    public PageResponse<GedAuditLogResponse> listAuditLogs(Pageable pageable, Authentication authentication) {
        permissionGuardService.check(authentication, VIEW_GED_MODULE_PERMISSION);
        return documentService.listAuditLogs(pageable, authentication);
    }

    @GetMapping("/{id}")
    @PreAuthorize(BUSINESS_ROLES)
    public DocumentResponse getById(@PathVariable UUID id, Authentication authentication) {
        permissionGuardService.check(authentication, VIEW_GED_MODULE_PERMISSION);
        return documentService.getById(id, authentication);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('ADMIN','RESPONSABLE_QUALITE','EMPLOYE')")
    public DocumentResponse create(
            @Valid @RequestBody DocumentCreateRequest request,
            Authentication authentication
    ) {
        permissionGuardService.check(authentication, VIEW_GED_MODULE_PERMISSION);
        return documentService.create(request, authentication);
    }

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('ADMIN','RESPONSABLE_QUALITE','EMPLOYE')")
    public DocumentResponse createWithUpload(
            @Valid @RequestPart("metadata") DocumentUploadMetadataRequest metadata,
            @RequestPart("file") MultipartFile file,
            Authentication authentication
    ) {
        permissionGuardService.check(authentication, VIEW_GED_MODULE_PERMISSION);
        return documentService.createFromUpload(metadata, file, authentication);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','RESPONSABLE_QUALITE')")
    public DocumentResponse update(
            @PathVariable UUID id,
            @Valid @RequestBody DocumentUpdateRequest request,
            Authentication authentication
    ) {
        permissionGuardService.check(authentication, VIEW_GED_MODULE_PERMISSION);
        return documentService.update(id, request, authentication);
    }

    @PutMapping("/{id}/archive")
    @PreAuthorize("hasAnyRole('ADMIN','RESPONSABLE_QUALITE')")
    public DocumentResponse archive(@PathVariable UUID id, Authentication authentication) {
        permissionGuardService.check(authentication, VIEW_GED_MODULE_PERMISSION);
        return documentService.archive(id, authentication);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAnyRole('ADMIN','RESPONSABLE_QUALITE')")
    public void deletePermanently(@PathVariable UUID id, Authentication authentication) {
        permissionGuardService.check(authentication, VIEW_GED_MODULE_PERMISSION);
        documentService.deletePermanently(id, authentication);
    }

    @PostMapping("/{id}/versions")
    @PreAuthorize("hasAnyRole('ADMIN','RESPONSABLE_QUALITE')")
    public DocumentVersionResponse addVersion(
            @PathVariable UUID id,
            @Valid @RequestBody DocumentVersionCreateRequest request,
            Authentication authentication
    ) {
        permissionGuardService.check(authentication, VIEW_GED_MODULE_PERMISSION);
        return documentService.addVersion(id, request, authentication);
    }

    @PostMapping(value = "/{id}/versions/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('ADMIN','RESPONSABLE_QUALITE')")
    public DocumentVersionResponse addVersionWithUpload(
            @PathVariable UUID id,
            @Valid @RequestPart("metadata") DocumentVersionUploadMetadataRequest metadata,
            @RequestPart("file") MultipartFile file,
            Authentication authentication
    ) {
        permissionGuardService.check(authentication, VIEW_GED_MODULE_PERMISSION);
        return documentService.addVersionFromUpload(id, metadata, file, authentication);
    }

    @GetMapping("/{id}/versions")
    @PreAuthorize(BUSINESS_ROLES)
    public List<DocumentVersionResponse> listVersions(@PathVariable UUID id, Authentication authentication) {
        permissionGuardService.check(authentication, VIEW_GED_MODULE_PERMISSION);
        return documentService.listVersions(id, authentication);
    }

    @PostMapping("/{id}/links")
    @PreAuthorize("hasAnyRole('ADMIN','RESPONSABLE_QUALITE')")
    public DocumentLinkResponse addLink(
            @PathVariable UUID id,
            @Valid @RequestBody DocumentLinkRequest request,
            Authentication authentication
    ) {
        permissionGuardService.check(authentication, VIEW_GED_MODULE_PERMISSION);
        return documentService.addLink(id, request, authentication);
    }

    @GetMapping("/{id}/links")
    @PreAuthorize(BUSINESS_ROLES)
    public List<DocumentLinkResponse> listLinks(@PathVariable UUID id, Authentication authentication) {
        permissionGuardService.check(authentication, VIEW_GED_MODULE_PERMISSION);
        return documentService.listLinks(id, authentication);
    }

    @GetMapping("/{id}/acl")
    @PreAuthorize("hasAnyRole('ADMIN','RESPONSABLE_QUALITE')")
    public DocumentAclResponse getAcl(@PathVariable UUID id, Authentication authentication) {
        permissionGuardService.check(authentication, VIEW_GED_MODULE_PERMISSION);
        return documentService.getAcl(id, authentication);
    }

    @PutMapping("/{id}/acl")
    @PreAuthorize("hasAnyRole('ADMIN','RESPONSABLE_QUALITE')")
    public DocumentAclResponse updateAcl(
            @PathVariable UUID id,
            @Valid @RequestBody DocumentAclUpdateRequest request,
            Authentication authentication
    ) {
        permissionGuardService.check(authentication, VIEW_GED_MODULE_PERMISSION);
        return documentService.updateAcl(id, request, authentication);
    }

    @GetMapping("/{id}/preview")
    @PreAuthorize(BUSINESS_ROLES)
    public DocumentPreviewResponse preview(
            @PathVariable UUID id,
            @RequestParam(required = false) Integer versionNumber,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer pageSize,
            @RequestParam(required = false) Integer zoomPercent,
            @RequestParam(required = false) String query,
            Authentication authentication
    ) {
        permissionGuardService.check(authentication, VIEW_GED_MODULE_PERMISSION);
        return documentService.preview(id, versionNumber, page, pageSize, zoomPercent, query, authentication);
    }

    @GetMapping("/{id}/download")
    @PreAuthorize(BUSINESS_ROLES)
    public ResponseEntity<byte[]> download(
            @PathVariable UUID id,
            @RequestParam(required = false) Integer versionNumber,
            Authentication authentication
    ) {
        permissionGuardService.check(authentication, VIEW_GED_MODULE_PERMISSION);
        com.cnstn.ged.dto.DocumentDownloadContent content = documentService.download(id, versionNumber, authentication);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType(content.mimeType()));
        headers.setContentLength(content.content().length);
        headers.setContentDisposition(
                ContentDisposition.attachment()
                        .filename(content.fileName(), StandardCharsets.UTF_8)
                        .build()
        );
        return new ResponseEntity<>(content.content(), headers, HttpStatus.OK);
    }

    @PostMapping("/{id}/print")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize(BUSINESS_ROLES)
    public void print(
            @PathVariable UUID id,
            @RequestParam(required = false) Integer versionNumber,
            Authentication authentication
    ) {
        permissionGuardService.check(authentication, VIEW_GED_MODULE_PERMISSION);
        documentService.print(id, versionNumber, authentication);
    }

    @PutMapping("/{id}/submit")
    @PreAuthorize("hasAnyRole('EMPLOYE','CHEF_HIERARCHIQUE','RESPONSABLE_QUALITE','ADMIN')")
    public DocumentResponse submit(@PathVariable UUID id, Authentication authentication) {
        permissionGuardService.check(authentication, VIEW_GED_MODULE_PERMISSION);
        return documentService.submitWorkflow(id, authentication);
    }

    @PutMapping("/{id}/approve")
    @PreAuthorize("hasAnyRole('ADMIN','RESPONSABLE_QUALITE')")
    public DocumentResponse approve(@PathVariable UUID id, Authentication authentication) {
        permissionGuardService.check(authentication, VIEW_GED_MODULE_PERMISSION);
        return documentService.approve(id, authentication);
    }

    @PutMapping("/{id}/publish")
    @PreAuthorize("hasAnyRole('ADMIN','RESPONSABLE_QUALITE')")
    public DocumentResponse publish(@PathVariable UUID id, Authentication authentication) {
        permissionGuardService.check(authentication, VIEW_GED_MODULE_PERMISSION);
        permissionGuardService.check(authentication, PUBLISH_DOCUMENT_PERMISSION);
        return documentService.publish(id, authentication);
    }
}
