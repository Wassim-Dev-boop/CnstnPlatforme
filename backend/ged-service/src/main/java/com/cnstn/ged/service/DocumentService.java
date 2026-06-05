package com.cnstn.ged.service;

import com.cnstn.ged.client.notification.NotificationClient;
import com.cnstn.ged.client.permission.AuthUserPermissionClient;
import com.cnstn.ged.dto.DocumentAclResponse;
import com.cnstn.ged.dto.DocumentAclUpdateRequest;
import com.cnstn.ged.dto.DocumentCreateRequest;
import com.cnstn.ged.dto.DocumentDownloadContent;
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
import com.cnstn.ged.entity.DocumentAclEntryEntity;
import com.cnstn.ged.entity.DocumentAclType;
import com.cnstn.ged.entity.DocumentConfidentialityLevel;
import com.cnstn.ged.entity.DocumentEntity;
import com.cnstn.ged.entity.DocumentLinkEntity;
import com.cnstn.ged.entity.DocumentStatus;
import com.cnstn.ged.entity.DocumentVersionEntity;
import com.cnstn.ged.entity.GedFolderEntity;
import com.cnstn.ged.exception.ResourceNotFoundException;
import com.cnstn.ged.mapper.DocumentMapper;
import com.cnstn.ged.repository.DocumentAclEntryRepository;
import com.cnstn.ged.repository.DocumentLinkRepository;
import com.cnstn.ged.repository.DocumentRepository;
import com.cnstn.ged.repository.DocumentVersionRepository;
import com.cnstn.ged.repository.GedFolderRepository;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class DocumentService {

    private static final Logger log = LoggerFactory.getLogger(DocumentService.class);
    private static final long MAX_UPLOAD_BYTES = 10L * 1024L * 1024L;
    private static final String QUALITY_ROLE_NAME = "RESPONSABLE_QUALITE";
    private static final String DEFAULT_QUALITY_USERNAME = "qualite.cnstn";
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of(
            "pdf", "doc", "docx", "xls", "xlsx", "png", "jpg", "jpeg", "txt"
    );
    private static final Set<String> ALLOWED_MIME_TYPES = Set.of(
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "image/png",
            "image/jpeg",
            "text/plain"
    );
    private static final String OCTET_STREAM = "application/octet-stream";

    private final DocumentRepository documentRepository;
    private final GedFolderRepository folderRepository;
    private final DocumentVersionRepository versionRepository;
    private final DocumentLinkRepository linkRepository;
    private final DocumentAclEntryRepository aclEntryRepository;
    private final GedReferenceGeneratorService referenceGeneratorService;
    private final UserContextResolverService userContextResolverService;
    private final GedAuditLogService auditLogService;
    private final NotificationClient notificationClient;
    private final AuthUserPermissionClient authUserPermissionClient;

    public DocumentService(
            DocumentRepository documentRepository,
            GedFolderRepository folderRepository,
            DocumentVersionRepository versionRepository,
            DocumentLinkRepository linkRepository,
            DocumentAclEntryRepository aclEntryRepository,
            GedReferenceGeneratorService referenceGeneratorService,
            UserContextResolverService userContextResolverService,
            GedAuditLogService auditLogService,
            NotificationClient notificationClient,
            AuthUserPermissionClient authUserPermissionClient
    ) {
        this.documentRepository = documentRepository;
        this.folderRepository = folderRepository;
        this.versionRepository = versionRepository;
        this.linkRepository = linkRepository;
        this.aclEntryRepository = aclEntryRepository;
        this.referenceGeneratorService = referenceGeneratorService;
        this.userContextResolverService = userContextResolverService;
        this.auditLogService = auditLogService;
        this.notificationClient = notificationClient;
        this.authUserPermissionClient = authUserPermissionClient;
    }

    @Transactional(readOnly = true)
    public PageResponse<DocumentResponse> list(
            Pageable pageable,
            String search,
            String category,
            DocumentConfidentialityLevel confidentiality,
            UUID folderId,
            Authentication authentication
    ) {
        GedUserContext actor = userContextResolverService.resolve(authentication);
        List<DocumentEntity> all = documentRepository.findByArchivedFalse();
        Map<UUID, List<DocumentAclEntryEntity>> aclByDocument = loadAclByDocument(all.stream()
                .map(DocumentEntity::getId)
                .toList());

        List<DocumentResponse> filtered = all.stream()
                .filter(document -> isDocumentVisible(document, actor, aclByDocument))
                .filter(document -> matchesSearch(document, search))
                .filter(document -> matchesCategory(document, category))
                .filter(document -> confidentiality == null || document.getConfidentialityLevel() == confidentiality)
                .filter(document -> folderId == null || folderId.equals(document.getFolderId()))
                .sorted(Comparator.comparing(DocumentEntity::getUpdatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(DocumentMapper::toResponse)
                .toList();

        return paginate(filtered, pageable);
    }

    @Transactional(readOnly = true)
    public DocumentResponse getById(UUID id, Authentication authentication) {
        GedUserContext actor = userContextResolverService.resolve(authentication);
        DocumentEntity document = fetchDocument(Objects.requireNonNull(id));
        assertCanView(document, actor, loadAclByDocument(List.of(document.getId())));
        return DocumentMapper.toResponse(document);
    }

    @Transactional
    public DocumentResponse create(DocumentCreateRequest request, Authentication authentication) {
        GedUserContext actor = userContextResolverService.resolve(authentication);
        assertCanCreateDocument(actor);

        GedFolderEntity folder = fetchFolder(request.folderId());
        DocumentEntity document = new DocumentEntity();
        document.setReferenceCode(referenceGeneratorService.nextReference());
        document.setFolderId(folder.getId());
        document.setTitle(normalizeRequired(request.title(), "Le titre du document est obligatoire"));
        document.setCategory(normalizeRequired(request.category(), "La categorie est obligatoire"));
        document.setSubCategory(normalizeOrNull(request.subCategory()));
        document.setDescription(normalizeOrNull(request.description()));
        document.setContent(normalizeRequired(request.content(), "Le contenu du document est obligatoire"));
        document.setCreatedBy(actor.username());
        document.setOwnerService(normalizeOrNull(actor.serviceName()));
        document.setConfidentialityLevel(Objects.requireNonNull(request.confidentialityLevel()));
        document.setStatus(DocumentStatus.DRAFT);
        document.setArchived(false);
        document.setCurrentVersionNumber(1);

        DocumentEntity saved = documentRepository.save(document);
        byte[] fallbackBytes = request.content().getBytes(StandardCharsets.UTF_8);
        createNewVersion(
                saved,
                request.fileName(),
                request.mimeType(),
                request.content(),
                fallbackBytes,
                request.content().getBytes(StandardCharsets.UTF_8).length,
                "Creation initiale",
                actor
        );
        upsertAcl(saved.getId(), request.allowedRoles(), request.allowedServices(), actor);

        auditLogService.log(
                "DOCUMENT",
                saved.getId(),
                "CREATE_DOCUMENT",
                actor,
                Map.of(
                        "referenceCode", saved.getReferenceCode(),
                        "title", saved.getTitle(),
                        "category", saved.getCategory(),
                        "folderId", saved.getFolderId(),
                        "confidentiality", saved.getConfidentialityLevel().name()
                )
        );
        notifySafely(actor.username(), "Document cree", "Le document " + saved.getReferenceCode() + " a ete cree.");
        return DocumentMapper.toResponse(saved);
    }

    @Transactional
    public DocumentResponse createFromUpload(
            DocumentUploadMetadataRequest metadata,
            MultipartFile file,
            Authentication authentication
    ) {
        GedUserContext actor = userContextResolverService.resolve(authentication);
        assertCanCreateDocument(actor);
        UploadedFilePayload payload = validateAndReadUpload(file);

        GedFolderEntity folder = fetchFolder(metadata.folderId());
        DocumentEntity document = new DocumentEntity();
        document.setReferenceCode(referenceGeneratorService.nextReference());
        document.setFolderId(folder.getId());
        document.setTitle(normalizeRequired(metadata.title(), "Le titre du document est obligatoire"));
        document.setCategory(normalizeRequired(metadata.category(), "La categorie est obligatoire"));
        document.setSubCategory(normalizeOrNull(metadata.subCategory()));
        document.setDescription(normalizeOrNull(metadata.description()));
        document.setContent(payload.previewText());
        document.setCreatedBy(actor.username());
        document.setOwnerService(normalizeOrNull(actor.serviceName()));
        document.setConfidentialityLevel(Objects.requireNonNull(metadata.confidentialityLevel()));
        document.setStatus(DocumentStatus.DRAFT);
        document.setArchived(false);
        document.setCurrentVersionNumber(1);

        DocumentEntity saved = documentRepository.save(document);
        createNewVersion(
                saved,
                payload.fileName(),
                payload.mimeType(),
                payload.previewText(),
                payload.contentBytes(),
                payload.fileSize(),
                "Creation initiale (upload fichier)",
                actor
        );
        upsertAcl(saved.getId(), metadata.allowedRoles(), metadata.allowedServices(), actor);

        auditLogService.log(
                "DOCUMENT",
                saved.getId(),
                "CREATE_DOCUMENT",
                actor,
                Map.of(
                        "referenceCode", saved.getReferenceCode(),
                        "title", saved.getTitle(),
                        "category", saved.getCategory(),
                        "folderId", saved.getFolderId(),
                        "confidentiality", saved.getConfidentialityLevel().name(),
                        "fileName", payload.fileName(),
                        "mimeType", payload.mimeType(),
                        "fileSize", payload.fileSize()
                )
        );
        notifySafely(actor.username(), "Document cree", "Le document " + saved.getReferenceCode() + " a ete cree.");
        return DocumentMapper.toResponse(saved);
    }

    @Transactional
    public DocumentResponse update(UUID id, DocumentUpdateRequest request, Authentication authentication) {
        GedUserContext actor = userContextResolverService.resolve(authentication);
        DocumentEntity document = fetchDocument(Objects.requireNonNull(id));
        assertCanEdit(document, actor);

        GedFolderEntity folder = fetchFolder(request.folderId());
        document.setFolderId(folder.getId());
        document.setTitle(normalizeRequired(request.title(), "Le titre du document est obligatoire"));
        document.setCategory(normalizeRequired(request.category(), "La categorie est obligatoire"));
        document.setSubCategory(normalizeOrNull(request.subCategory()));
        document.setDescription(normalizeOrNull(request.description()));
        document.setConfidentialityLevel(Objects.requireNonNull(request.confidentialityLevel()));
        DocumentEntity saved = documentRepository.save(document);

        auditLogService.log(
                "DOCUMENT",
                saved.getId(),
                "UPDATE_DOCUMENT",
                actor,
                Map.of(
                        "title", saved.getTitle(),
                        "category", saved.getCategory(),
                        "folderId", saved.getFolderId(),
                        "confidentiality", saved.getConfidentialityLevel().name()
                )
        );
        return DocumentMapper.toResponse(saved);
    }

    @Transactional
    public DocumentVersionResponse addVersion(
            UUID documentId,
            DocumentVersionCreateRequest request,
            Authentication authentication
    ) {
        GedUserContext actor = userContextResolverService.resolve(authentication);
        DocumentEntity document = fetchDocument(Objects.requireNonNull(documentId));
        assertCanEdit(document, actor);

        DocumentVersionEntity version = createNewVersion(
                document,
                request.fileName(),
                request.mimeType(),
                request.content(),
                request.content().getBytes(StandardCharsets.UTF_8),
                request.content().getBytes(StandardCharsets.UTF_8).length,
                request.changeNote(),
                actor
        );

        auditLogService.log(
                "DOCUMENT_VERSION",
                version.getId(),
                "ADD_VERSION",
                actor,
                Map.of(
                        "documentId", document.getId(),
                        "versionNumber", version.getVersionNumber(),
                        "fileName", version.getFileName()
                )
        );
        notifySafely(actor.username(), "Version ajoutee", "Version v" + version.getVersionNumber() + " ajoutee.");
        return DocumentMapper.toResponse(version);
    }

    @Transactional
    public DocumentVersionResponse addVersionFromUpload(
            UUID documentId,
            DocumentVersionUploadMetadataRequest metadata,
            MultipartFile file,
            Authentication authentication
    ) {
        GedUserContext actor = userContextResolverService.resolve(authentication);
        DocumentEntity document = fetchDocument(Objects.requireNonNull(documentId));
        assertCanEdit(document, actor);
        UploadedFilePayload payload = validateAndReadUpload(file);

        DocumentVersionEntity version = createNewVersion(
                document,
                payload.fileName(),
                payload.mimeType(),
                payload.previewText(),
                payload.contentBytes(),
                payload.fileSize(),
                metadata.changeNote(),
                actor
        );

        auditLogService.log(
                "DOCUMENT_VERSION",
                version.getId(),
                "ADD_VERSION",
                actor,
                Map.of(
                        "documentId", document.getId(),
                        "versionNumber", version.getVersionNumber(),
                        "fileName", version.getFileName(),
                        "mimeType", version.getMimeType(),
                        "fileSize", version.getFileSize()
                )
        );
        notifySafely(actor.username(), "Version ajoutee", "Version v" + version.getVersionNumber() + " ajoutee.");
        return DocumentMapper.toResponse(version);
    }

    @Transactional(readOnly = true)
    public List<DocumentVersionResponse> listVersions(UUID documentId, Authentication authentication) {
        GedUserContext actor = userContextResolverService.resolve(authentication);
        DocumentEntity document = fetchDocument(Objects.requireNonNull(documentId));
        assertCanView(document, actor, loadAclByDocument(List.of(document.getId())));
        return versionRepository.findByDocumentIdOrderByVersionNumberDesc(document.getId())
                .stream()
                .map(DocumentMapper::toResponse)
                .toList();
    }

    @Transactional
    public DocumentLinkResponse addLink(UUID documentId, DocumentLinkRequest request, Authentication authentication) {
        GedUserContext actor = userContextResolverService.resolve(authentication);
        DocumentEntity source = fetchDocument(Objects.requireNonNull(documentId));
        DocumentEntity target = fetchDocument(Objects.requireNonNull(request.linkedDocumentId()));
        assertCanEdit(source, actor);
        assertCanView(target, actor, loadAclByDocument(List.of(target.getId())));

        DocumentLinkEntity entity = new DocumentLinkEntity();
        entity.setSourceDocumentId(source.getId());
        entity.setLinkedDocumentId(target.getId());
        entity.setRelationType(Objects.requireNonNull(request.relationType()));
        entity.setCreatedBy(actor.username());
        DocumentLinkEntity saved = linkRepository.save(entity);

        auditLogService.log(
                "DOCUMENT_LINK",
                saved.getId(),
                "LINK_DOCUMENT",
                actor,
                Map.of(
                        "sourceDocumentId", source.getId(),
                        "linkedDocumentId", target.getId(),
                        "relationType", saved.getRelationType().name()
                )
        );
        return new DocumentLinkResponse(
                saved.getId(),
                saved.getSourceDocumentId(),
                saved.getLinkedDocumentId(),
                target.getReferenceCode(),
                target.getTitle(),
                saved.getRelationType(),
                saved.getCreatedBy(),
                saved.getCreatedAt()
        );
    }

    @Transactional(readOnly = true)
    public List<DocumentLinkResponse> listLinks(UUID documentId, Authentication authentication) {
        GedUserContext actor = userContextResolverService.resolve(authentication);
        DocumentEntity source = fetchDocument(Objects.requireNonNull(documentId));
        assertCanView(source, actor, loadAclByDocument(List.of(source.getId())));

        List<DocumentLinkEntity> links = linkRepository.findBySourceDocumentIdOrderByCreatedAtDesc(source.getId());
        Map<UUID, DocumentEntity> targetById = documentRepository.findAllById(
                links.stream().map(DocumentLinkEntity::getLinkedDocumentId).toList()
        ).stream().collect(Collectors.toMap(DocumentEntity::getId, entity -> entity));

        return links.stream()
                .map(link -> {
                    DocumentEntity target = targetById.get(link.getLinkedDocumentId());
                    return new DocumentLinkResponse(
                            link.getId(),
                            link.getSourceDocumentId(),
                            link.getLinkedDocumentId(),
                            target == null ? "" : target.getReferenceCode(),
                            target == null ? "" : target.getTitle(),
                            link.getRelationType(),
                            link.getCreatedBy(),
                            link.getCreatedAt()
                    );
                })
                .toList();
    }

    @Transactional(readOnly = true)
    public DocumentAclResponse getAcl(UUID documentId, Authentication authentication) {
        GedUserContext actor = userContextResolverService.resolve(authentication);
        DocumentEntity document = fetchDocument(Objects.requireNonNull(documentId));
        assertCanInspectAcl(document, actor);
        return toAclResponse(document.getId());
    }

    @Transactional
    public DocumentAclResponse updateAcl(
            UUID documentId,
            DocumentAclUpdateRequest request,
            Authentication authentication
    ) {
        GedUserContext actor = userContextResolverService.resolve(authentication);
        DocumentEntity document = fetchDocument(Objects.requireNonNull(documentId));
        assertCanInspectAcl(document, actor);

        upsertAcl(document.getId(), request.roles(), request.services(), actor);
        auditLogService.log(
                "DOCUMENT_ACL",
                document.getId(),
                "UPDATE_ACL",
                actor,
                Map.of(
                        "roles", request.roles() == null ? List.of() : request.roles(),
                        "services", request.services() == null ? List.of() : request.services()
                )
        );
        return toAclResponse(document.getId());
    }

    @Transactional
    public DocumentPreviewResponse preview(
            UUID documentId,
            Integer versionNumber,
            Integer page,
            Integer pageSize,
            Integer zoomPercent,
            String query,
            Authentication authentication
    ) {
        GedUserContext actor = userContextResolverService.resolve(authentication);
        DocumentEntity document = fetchDocument(Objects.requireNonNull(documentId));
        Map<UUID, List<DocumentAclEntryEntity>> aclByDocument = loadAclByDocument(List.of(document.getId()));
        assertCanView(document, actor, aclByDocument);

        DocumentVersionEntity version = resolveVersion(document.getId(), versionNumber);
        int safePageSize = clamp(pageSize == null ? 1200 : pageSize, 300, 5000);
        int safeZoom = clamp(zoomPercent == null ? 100 : zoomPercent, 50, 200);
        String content = normalize(version.getContentText());
        int totalPages = Math.max(1, (int) Math.ceil((double) content.length() / safePageSize));
        int safePage = clamp(page == null ? 1 : page, 1, totalPages);
        String pageContent = slicePage(content, safePage, safePageSize);
        List<Integer> matchedPages = computeMatchedPages(content, safePageSize, query);

        auditLogService.log(
                "DOCUMENT",
                document.getId(),
                "PREVIEW_DOCUMENT",
                actor,
                Map.of(
                        "versionNumber", version.getVersionNumber(),
                        "page", safePage,
                        "pageSize", safePageSize,
                        "zoom", safeZoom,
                        "query", normalize(query)
                )
        );

        return new DocumentPreviewResponse(
                document.getId(),
                document.getReferenceCode(),
                document.getTitle(),
                version.getVersionNumber(),
                version.getFileName(),
                version.getMimeType(),
                totalPages,
                safePage,
                safePageSize,
                safeZoom,
                normalize(query),
                matchedPages,
                pageContent,
                true
        );
    }

    @Transactional
    public DocumentDownloadContent download(UUID documentId, Integer versionNumber, Authentication authentication) {
        GedUserContext actor = userContextResolverService.resolve(authentication);
        DocumentEntity document = fetchDocument(Objects.requireNonNull(documentId));
        Map<UUID, List<DocumentAclEntryEntity>> aclByDocument = loadAclByDocument(List.of(document.getId()));
        assertCanView(document, actor, aclByDocument);
        DocumentVersionEntity version = resolveVersion(document.getId(), versionNumber);

        auditLogService.log(
                "DOCUMENT",
                document.getId(),
                "DOWNLOAD_DOCUMENT",
                actor,
                Map.of(
                        "versionNumber", version.getVersionNumber(),
                        "fileName", version.getFileName()
                )
        );
        return new DocumentDownloadContent(
                version.getFileName(),
                version.getMimeType(),
                version.getContentBytes() != null
                        ? version.getContentBytes()
                        : normalize(version.getContentText()).getBytes(StandardCharsets.UTF_8)
        );
    }

    @Transactional
    public void print(UUID documentId, Integer versionNumber, Authentication authentication) {
        GedUserContext actor = userContextResolverService.resolve(authentication);
        DocumentEntity document = fetchDocument(Objects.requireNonNull(documentId));
        Map<UUID, List<DocumentAclEntryEntity>> aclByDocument = loadAclByDocument(List.of(document.getId()));
        assertCanView(document, actor, aclByDocument);
        DocumentVersionEntity version = resolveVersion(document.getId(), versionNumber);

        auditLogService.log(
                "DOCUMENT",
                document.getId(),
                "PRINT_DOCUMENT",
                actor,
                Map.of(
                        "versionNumber", version.getVersionNumber(),
                        "fileName", version.getFileName()
                )
        );
    }

    @Transactional
    public DocumentResponse archive(UUID documentId, Authentication authentication) {
        GedUserContext actor = userContextResolverService.resolve(authentication);
        DocumentEntity document = fetchDocument(Objects.requireNonNull(documentId));
        assertCanEdit(document, actor);

        document.setArchived(true);
        document.setStatus(DocumentStatus.ARCHIVED);
        DocumentEntity saved = documentRepository.save(document);

        auditLogService.log(
                "DOCUMENT",
                saved.getId(),
                "ARCHIVE_DOCUMENT",
                actor,
                Map.of("referenceCode", saved.getReferenceCode())
        );
        notifySafely(actor.username(), "Document archive", "Le document " + saved.getReferenceCode() + " est archive.");
        return DocumentMapper.toResponse(saved);
    }

    @Transactional
    public void deletePermanently(UUID documentId, Authentication authentication) {
        GedUserContext actor = userContextResolverService.resolve(authentication);
        DocumentEntity document = fetchDocument(Objects.requireNonNull(documentId));
        assertCanEdit(document, actor);

        UUID id = document.getId();
        String referenceCode = document.getReferenceCode();
        String title = document.getTitle();

        linkRepository.deleteBySourceDocumentIdOrLinkedDocumentId(id, id);
        aclEntryRepository.deleteByDocumentId(id);
        versionRepository.deleteByDocumentId(id);
        documentRepository.delete(document);

        auditLogService.log(
                "DOCUMENT",
                id,
                "DELETE_DOCUMENT_PERMANENTLY",
                actor,
                Map.of(
                        "referenceCode", referenceCode,
                        "title", title
                )
        );
        notifySafely(actor.username(), "Document supprime", "Le document " + referenceCode + " a ete supprime definitivement.");
    }

    @Transactional(readOnly = true)
    public List<FolderTreeResponse> listFolderTree(Authentication authentication) {
        GedUserContext actor = userContextResolverService.resolve(authentication);
        List<GedFolderEntity> folders = folderRepository.findByArchivedFalseOrderByNameAsc();
        List<DocumentEntity> documents = documentRepository.findByArchivedFalse();
        Map<UUID, List<DocumentAclEntryEntity>> aclByDocument = loadAclByDocument(documents.stream()
                .map(DocumentEntity::getId).toList());
        Set<UUID> visibleDocumentIds = documents.stream()
                .filter(document -> isDocumentVisible(document, actor, aclByDocument))
                .map(DocumentEntity::getId)
                .collect(Collectors.toSet());

        Map<UUID, Integer> documentCountByFolder = new HashMap<>();
        for (DocumentEntity document : documents) {
            if (!visibleDocumentIds.contains(document.getId())) {
                continue;
            }
            if (document.getFolderId() == null) {
                continue;
            }
            documentCountByFolder.merge(document.getFolderId(), 1, Integer::sum);
        }

        Map<UUID, List<GedFolderEntity>> childrenByParent = groupFoldersByParent(folders);

        List<GedFolderEntity> roots = folders.stream()
                .filter(folder -> folder.getParentId() == null)
                .sorted(Comparator.comparing(GedFolderEntity::getName, String.CASE_INSENSITIVE_ORDER))
                .toList();

        return roots.stream()
                .map(root -> buildFolderTree(root, childrenByParent, documentCountByFolder))
                .toList();
    }

    @Transactional(readOnly = true)
    public PageResponse<GedAuditLogResponse> listAuditLogs(Pageable pageable, Authentication authentication) {
        GedUserContext actor = userContextResolverService.resolve(authentication);
        assertCanManage(actor);
        return auditLogService.list(pageable);
    }

    @Transactional
    public FolderTreeResponse createFolder(FolderUpsertRequest request, Authentication authentication) {
        GedUserContext actor = userContextResolverService.resolve(authentication);
        assertCanManage(actor);

        UUID parentId = request.parentId();
        if (parentId != null) {
            fetchFolder(parentId);
        }

        GedFolderEntity entity = new GedFolderEntity();
        entity.setName(normalizeRequired(request.name(), "Le nom du dossier est obligatoire"));
        entity.setParentId(parentId);
        entity.setCategory(normalizeOrNull(request.category()));
        entity.setCreatedBy(actor.username());
        GedFolderEntity saved = folderRepository.save(entity);
        Map<String, Object> details = new HashMap<>();
        details.put("name", saved.getName());
        details.put("parentId", saved.getParentId());

        auditLogService.log(
                "FOLDER",
                saved.getId(),
                "CREATE_FOLDER",
                actor,
                details
        );
        return new FolderTreeResponse(saved.getId(), saved.getName(), saved.getParentId(), saved.getCategory(), saved.isArchived(), 0, List.of());
    }

    @Transactional
    public FolderTreeResponse updateFolder(UUID folderId, FolderUpsertRequest request, Authentication authentication) {
        GedUserContext actor = userContextResolverService.resolve(authentication);
        assertCanManage(actor);

        GedFolderEntity entity = fetchFolder(folderId);
        UUID parentId = request.parentId();
        if (parentId != null && !parentId.equals(entity.getId())) {
            fetchFolder(parentId);
            entity.setParentId(parentId);
        }
        entity.setName(normalizeRequired(request.name(), "Le nom du dossier est obligatoire"));
        entity.setCategory(normalizeOrNull(request.category()));
        GedFolderEntity saved = folderRepository.save(entity);
        Map<String, Object> details = new HashMap<>();
        details.put("name", saved.getName());
        details.put("parentId", saved.getParentId());

        auditLogService.log(
                "FOLDER",
                saved.getId(),
                "UPDATE_FOLDER",
                actor,
                details
        );
        return new FolderTreeResponse(saved.getId(), saved.getName(), saved.getParentId(), saved.getCategory(), saved.isArchived(), 0, List.of());
    }

    @Transactional
    public void archiveFolder(UUID folderId, Authentication authentication) {
        GedUserContext actor = userContextResolverService.resolve(authentication);
        assertCanManage(actor);

        GedFolderEntity root = fetchFolder(folderId);
        List<GedFolderEntity> allFolders = folderRepository.findByArchivedFalseOrderByNameAsc();
        Map<UUID, List<GedFolderEntity>> childrenByParent = groupFoldersByParent(allFolders);

        Set<UUID> affectedFolderIds = new HashSet<>();
        collectFolderIds(root.getId(), childrenByParent, affectedFolderIds);

        for (GedFolderEntity folder : allFolders) {
            if (affectedFolderIds.contains(folder.getId())) {
                folder.setArchived(true);
                folderRepository.save(folder);
            }
        }

        List<DocumentEntity> documents = documentRepository.findByArchivedFalse();
        for (DocumentEntity document : documents) {
            if (document.getFolderId() != null && affectedFolderIds.contains(document.getFolderId())) {
                document.setArchived(true);
                document.setStatus(DocumentStatus.ARCHIVED);
                documentRepository.save(document);
            }
        }

        auditLogService.log(
                "FOLDER",
                root.getId(),
                "ARCHIVE_FOLDER",
                actor,
                Map.of("affectedFolders", affectedFolderIds.size())
        );
    }

    @Transactional
    public DocumentResponse submitWorkflow(UUID id, Authentication authentication) {
        GedUserContext actor = userContextResolverService.resolve(authentication);
        DocumentEntity document = fetchDocument(Objects.requireNonNull(id));
        assertCanEdit(document, actor);
        assertCanTransitionToInReview(document);
        document.setStatus(DocumentStatus.IN_REVIEW);
        document.setApprovedBy(null);
        document.setPublishedAt(null);
        DocumentEntity saved = documentRepository.save(document);
        auditLogService.log("DOCUMENT", saved.getId(), "SUBMIT_DOCUMENT", actor, Map.of("status", saved.getStatus().name()));
        notifyQualityReviewRequested(saved, actor);
        return DocumentMapper.toResponse(saved);
    }

    @Transactional
    public DocumentResponse approve(UUID id, Authentication authentication) {
        GedUserContext actor = userContextResolverService.resolve(authentication);
        assertCanManage(actor);
        DocumentEntity document = fetchDocument(Objects.requireNonNull(id));
        assertCanTransitionToApproved(document);
        document.setStatus(DocumentStatus.APPROVED);
        document.setApprovedBy(actor.username());
        document.setPublishedAt(null);
        DocumentEntity saved = documentRepository.save(document);
        auditLogService.log("DOCUMENT", saved.getId(), "APPROVE_DOCUMENT", actor, Map.of("status", saved.getStatus().name()));
        return DocumentMapper.toResponse(saved);
    }

    @Transactional
    public DocumentResponse publish(UUID id, Authentication authentication) {
        GedUserContext actor = userContextResolverService.resolve(authentication);
        assertCanManage(actor);
        DocumentEntity document = fetchDocument(Objects.requireNonNull(id));
        assertCanTransitionToPublished(document);
        document.setStatus(DocumentStatus.PUBLISHED);
        document.setApprovedBy(actor.username());
        document.setPublishedAt(Instant.now());
        DocumentEntity saved = documentRepository.save(document);
        auditLogService.log("DOCUMENT", saved.getId(), "PUBLISH_DOCUMENT", actor, Map.of("status", saved.getStatus().name()));
        return DocumentMapper.toResponse(saved);
    }

    private PageResponse<DocumentResponse> paginate(List<DocumentResponse> all, Pageable pageable) {
        int page = Math.max(pageable.getPageNumber(), 0);
        int size = Math.max(pageable.getPageSize(), 1);
        int fromIndex = Math.min(page * size, all.size());
        int toIndex = Math.min(fromIndex + size, all.size());
        int totalPages = size == 0 ? 0 : (int) Math.ceil((double) all.size() / size);

        return new PageResponse<>(
                all.subList(fromIndex, toIndex),
                page,
                size,
                all.size(),
                totalPages
        );
    }

    private boolean matchesSearch(DocumentEntity document, String search) {
        String safeSearch = normalize(search);
        if (safeSearch.isEmpty()) {
            return true;
        }

        String haystack = String.join(" ",
                normalize(document.getTitle()),
                normalize(document.getReferenceCode()),
                normalize(document.getCategory()),
                normalize(document.getSubCategory()),
                normalize(document.getDescription())
        ).toLowerCase(Locale.ROOT);
        return haystack.contains(safeSearch.toLowerCase(Locale.ROOT));
    }

    private boolean matchesCategory(DocumentEntity document, String category) {
        String safeCategory = normalize(category);
        if (safeCategory.isEmpty()) {
            return true;
        }
        return safeCategory.equalsIgnoreCase(normalize(document.getCategory()));
    }

    private DocumentEntity fetchDocument(UUID id) {
        return documentRepository.findByIdAndArchivedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("Document introuvable: " + id));
    }

    private GedFolderEntity fetchFolder(UUID id) {
        return folderRepository.findByIdAndArchivedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("Dossier introuvable: " + id));
    }

    private DocumentVersionEntity resolveVersion(UUID documentId, Integer versionNumber) {
        if (versionNumber == null) {
            return versionRepository.findByDocumentIdAndCurrentTrue(documentId)
                    .orElseThrow(() -> new ResourceNotFoundException("Version courante introuvable pour le document " + documentId));
        }
        return versionRepository.findByDocumentIdAndVersionNumber(documentId, versionNumber)
                .orElseThrow(() -> new ResourceNotFoundException("Version " + versionNumber + " introuvable pour le document " + documentId));
    }

    private DocumentVersionEntity createNewVersion(
            DocumentEntity document,
            String fileName,
            String mimeType,
            String content,
            byte[] contentBytes,
            long fileSize,
            String changeNote,
            GedUserContext actor
    ) {
        List<DocumentVersionEntity> existingVersions = versionRepository.findByDocumentIdOrderByVersionNumberDesc(document.getId());
        int nextVersionNumber = existingVersions.isEmpty() ? 1 : existingVersions.get(0).getVersionNumber() + 1;

        for (DocumentVersionEntity existing : existingVersions) {
            if (existing.isCurrent()) {
                existing.setCurrent(false);
                versionRepository.save(existing);
            }
        }

        DocumentVersionEntity version = new DocumentVersionEntity();
        version.setDocumentId(document.getId());
        version.setVersionNumber(nextVersionNumber);
        version.setFileName(normalizeRequired(fileName, "Le nom de fichier est obligatoire"));
        version.setMimeType(normalizeRequired(mimeType, "Le type MIME est obligatoire"));
        version.setContentText(normalizeRequired(content, "Le contenu de version est obligatoire"));
        version.setContentBytes(contentBytes == null ? null : contentBytes.clone());
        version.setFileSize(fileSize > 0 ? fileSize : version.getContentText().getBytes(StandardCharsets.UTF_8).length);
        version.setChangeNote(normalizeOrNull(changeNote));
        version.setCreatedBy(actor.username());
        version.setCurrent(true);
        DocumentVersionEntity saved = versionRepository.save(version);

        document.setCurrentVersionNumber(saved.getVersionNumber());
        document.setContent(saved.getContentText());
        if (document.getDescription() == null || document.getDescription().isBlank()) {
            document.setDescription(summarize(saved.getContentText(), 400));
        }
        documentRepository.save(document);
        return saved;
    }

    private void upsertAcl(UUID documentId, List<String> roles, List<String> services, GedUserContext actor) {
        aclEntryRepository.deleteByDocumentId(documentId);
        aclEntryRepository.flush();

        List<DocumentAclEntryEntity> entries = new ArrayList<>();
        Set<String> normalizedRoles = new HashSet<>();
        normalizedRoles.add("ADMIN");
        normalizedRoles.add("RESPONSABLE_QUALITE");
        if (roles != null) {
            roles.stream()
                    .map(this::normalizeUpper)
                    .filter(value -> !value.isEmpty())
                    .forEach(normalizedRoles::add);
        }

        for (String role : normalizedRoles) {
            DocumentAclEntryEntity entry = new DocumentAclEntryEntity();
            entry.setDocumentId(documentId);
            entry.setAclType(DocumentAclType.ROLE);
            entry.setAclValue(role);
            entry.setCreatedBy(actor.username());
            entries.add(entry);
        }

        Set<String> normalizedServices = new HashSet<>();
        if (services != null) {
            services.stream()
                    .map(this::normalize)
                    .filter(value -> !value.isEmpty())
                    .forEach(normalizedServices::add);
        }
        if (!normalize(actor.serviceName()).isEmpty()) {
            normalizedServices.add(normalize(actor.serviceName()));
        }

        for (String service : normalizedServices) {
            DocumentAclEntryEntity entry = new DocumentAclEntryEntity();
            entry.setDocumentId(documentId);
            entry.setAclType(DocumentAclType.SERVICE);
            entry.setAclValue(service);
            entry.setCreatedBy(actor.username());
            entries.add(entry);
        }

        aclEntryRepository.saveAll(entries);
    }

    private DocumentAclResponse toAclResponse(UUID documentId) {
        List<DocumentAclEntryEntity> entries = aclEntryRepository.findByDocumentIdOrderByAclTypeAscAclValueAsc(documentId);
        List<String> roles = entries.stream()
                .filter(entry -> entry.getAclType() == DocumentAclType.ROLE)
                .map(DocumentAclEntryEntity::getAclValue)
                .toList();
        List<String> services = entries.stream()
                .filter(entry -> entry.getAclType() == DocumentAclType.SERVICE)
                .map(DocumentAclEntryEntity::getAclValue)
                .toList();
        return new DocumentAclResponse(roles, services);
    }

    private Map<UUID, List<DocumentAclEntryEntity>> loadAclByDocument(Collection<UUID> documentIds) {
        if (documentIds == null || documentIds.isEmpty()) {
            return Map.of();
        }

        List<DocumentAclEntryEntity> aclEntries = aclEntryRepository.findByDocumentIdIn(documentIds);
        return aclEntries.stream()
                .collect(Collectors.groupingBy(DocumentAclEntryEntity::getDocumentId));
    }

    private boolean isDocumentVisible(
            DocumentEntity document,
            GedUserContext actor,
            Map<UUID, List<DocumentAclEntryEntity>> aclByDocument
    ) {
        if (document.isArchived()) {
            return false;
        }
        if (isPrivileged(actor) || isCreator(document, actor)) {
            return true;
        }
        if (document.getStatus() != DocumentStatus.PUBLISHED) {
            return false;
        }

        List<DocumentAclEntryEntity> entries = aclByDocument.getOrDefault(document.getId(), List.of());
        boolean roleAllowed = entries.stream()
                .filter(entry -> entry.getAclType() == DocumentAclType.ROLE)
                .map(entry -> normalizeUpper(entry.getAclValue()))
                .anyMatch(actor.roles()::contains);
        boolean serviceAllowed = entries.stream()
                .filter(entry -> entry.getAclType() == DocumentAclType.SERVICE)
                .map(entry -> normalize(entry.getAclValue()))
                .anyMatch(value -> value.equalsIgnoreCase(normalize(actor.serviceName())));

        boolean hasAclRestriction = !entries.isEmpty();
        boolean sameService = !normalize(actor.serviceName()).isEmpty()
                && normalize(actor.serviceName()).equalsIgnoreCase(normalize(document.getOwnerService()));

        return switch (document.getConfidentialityLevel()) {
            case PUBLIC -> true;
            case INTERNAL -> !hasAclRestriction || roleAllowed || serviceAllowed || sameService;
            case RESTRICTED -> roleAllowed || serviceAllowed || sameService;
            case CONFIDENTIAL -> roleAllowed || serviceAllowed;
        };
    }

    private void assertCanView(
            DocumentEntity document,
            GedUserContext actor,
            Map<UUID, List<DocumentAclEntryEntity>> aclByDocument
    ) {
        if (!isDocumentVisible(document, actor, aclByDocument)) {
            throw new AccessDeniedException("Acces refuse au document " + document.getReferenceCode());
        }
    }

    private void assertCanEdit(DocumentEntity document, GedUserContext actor) {
        if (isPrivileged(actor) || isCreator(document, actor)) {
            return;
        }
        throw new AccessDeniedException("Modification non autorisee sur ce document");
    }

    private void assertCanInspectAcl(DocumentEntity document, GedUserContext actor) {
        if (isPrivileged(actor) || isCreator(document, actor)) {
            return;
        }
        throw new AccessDeniedException("Consultation ACL non autorisee sur ce document");
    }

    private boolean isCreator(DocumentEntity document, GedUserContext actor) {
        return normalize(document.getCreatedBy()).equalsIgnoreCase(normalize(actor.username()));
    }

    private boolean isPrivileged(GedUserContext actor) {
        return actor.roles().contains("ADMIN") || actor.roles().contains("RESPONSABLE_QUALITE");
    }

    private boolean canCreateDocument(GedUserContext actor) {
        return isPrivileged(actor) || actor.roles().contains("EMPLOYE");
    }

    private void assertCanCreateDocument(GedUserContext actor) {
        if (!canCreateDocument(actor)) {
            throw new AccessDeniedException("Creation de document reservee aux employes et a l administration GED");
        }
    }

    private void assertCanManage(GedUserContext actor) {
        if (!isPrivileged(actor)) {
            throw new AccessDeniedException("Operation reservee a l administration GED");
        }
    }

    private void assertCanTransitionToInReview(DocumentEntity document) {
        assertNotArchived(document, "Soumission");
        if (document.getStatus() != DocumentStatus.DRAFT && document.getStatus() != DocumentStatus.REJECTED) {
            throw new IllegalStateException("Soumission impossible pour le statut " + document.getStatus().name());
        }
    }

    private void assertCanTransitionToApproved(DocumentEntity document) {
        assertNotArchived(document, "Validation");
        if (document.getStatus() != DocumentStatus.IN_REVIEW) {
            throw new IllegalStateException("Validation impossible: le document doit etre en attente qualite");
        }
    }

    private void assertCanTransitionToPublished(DocumentEntity document) {
        assertNotArchived(document, "Publication");
        if (document.getStatus() != DocumentStatus.APPROVED) {
            throw new IllegalStateException("Publication impossible: le document doit etre valide qualite");
        }
    }

    private void assertNotArchived(DocumentEntity document, String action) {
        if (document.isArchived() || document.getStatus() == DocumentStatus.ARCHIVED) {
            throw new IllegalStateException(action + " impossible sur un document archive");
        }
    }

    private FolderTreeResponse buildFolderTree(
            GedFolderEntity folder,
            Map<UUID, List<GedFolderEntity>> childrenByParent,
            Map<UUID, Integer> documentCountByFolder
    ) {
        List<GedFolderEntity> children = childrenByParent.getOrDefault(folder.getId(), List.of());
        List<FolderTreeResponse> childResponses = children.stream()
                .sorted(Comparator.comparing(GedFolderEntity::getName, String.CASE_INSENSITIVE_ORDER))
                .map(child -> buildFolderTree(child, childrenByParent, documentCountByFolder))
                .toList();

        return new FolderTreeResponse(
                folder.getId(),
                folder.getName(),
                folder.getParentId(),
                folder.getCategory(),
                folder.isArchived(),
                documentCountByFolder.getOrDefault(folder.getId(), 0),
                childResponses
        );
    }

    private void collectFolderIds(
            UUID currentFolderId,
            Map<UUID, List<GedFolderEntity>> childrenByParent,
            Set<UUID> accumulator
    ) {
        accumulator.add(currentFolderId);
        for (GedFolderEntity child : childrenByParent.getOrDefault(currentFolderId, List.of())) {
            collectFolderIds(child.getId(), childrenByParent, accumulator);
        }
    }

    private Map<UUID, List<GedFolderEntity>> groupFoldersByParent(List<GedFolderEntity> folders) {
        Map<UUID, List<GedFolderEntity>> grouped = new HashMap<>();
        for (GedFolderEntity folder : folders) {
            grouped.computeIfAbsent(folder.getParentId(), ignored -> new ArrayList<>()).add(folder);
        }
        return grouped;
    }

    private UploadedFilePayload validateAndReadUpload(MultipartFile file) {
        if (file == null) {
            throw new IllegalArgumentException("Le fichier est obligatoire.");
        }
        if (file.isEmpty() || file.getSize() <= 0) {
            throw new IllegalArgumentException("Le fichier est vide.");
        }
        if (file.getSize() > MAX_UPLOAD_BYTES) {
            throw new IllegalArgumentException("Le fichier depasse la taille maximale autorisee (10 Mo).");
        }

        String sanitizedFileName = sanitizeFileName(file.getOriginalFilename());
        String extension = extractExtension(sanitizedFileName);
        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            throw new IllegalArgumentException("Type de fichier non autorise.");
        }

        String normalizedMimeType = resolveMimeType(file.getContentType(), extension);
        try {
            byte[] contentBytes = file.getBytes();
            String previewText = extractPreviewText(contentBytes, extension, sanitizedFileName, normalizedMimeType, file.getSize());
            return new UploadedFilePayload(sanitizedFileName, normalizedMimeType, file.getSize(), contentBytes, previewText);
        } catch (Exception ex) {
            throw new IllegalArgumentException("Lecture du fichier impossible.");
        }
    }

    private String resolveMimeType(String declaredMimeType, String extension) {
        String normalized = normalize(declaredMimeType).toLowerCase(Locale.ROOT);
        if (normalized.isEmpty()) {
            normalized = switch (extension) {
                case "pdf" -> "application/pdf";
                case "doc" -> "application/msword";
                case "docx" -> "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
                case "xls" -> "application/vnd.ms-excel";
                case "xlsx" -> "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
                case "png" -> "image/png";
                case "jpg", "jpeg" -> "image/jpeg";
                default -> "text/plain";
            };
        }

        boolean allowed = ALLOWED_MIME_TYPES.contains(normalized)
                || OCTET_STREAM.equals(normalized)
                || normalized.startsWith("application/octet-stream");
        if (!allowed) {
            throw new IllegalArgumentException("Type MIME non autorise.");
        }
        return normalized;
    }

    private String extractPreviewText(byte[] content, String extension, String fileName, String mimeType, long fileSize) {
        if ("txt".equals(extension)) {
            String text = new String(content, StandardCharsets.UTF_8);
            return normalizeRequired(text, "Le contenu texte du fichier est vide.");
        }
        if ("pdf".equals(extension)) {
            try (PDDocument document = Loader.loadPDF(content)) {
                String extracted = new PDFTextStripper().getText(document);
                String normalized = normalize(extracted);
                if (!normalized.isEmpty()) {
                    return summarize(normalized, 120_000);
                }
            } catch (Exception ex) {
                log.warn("Extraction texte PDF impossible pour {}", fileName, ex);
            }
            return "Apercu PDF indisponible. Utilisez le telechargement pour consulter le fichier original.";
        }
        return "Apercu textuel non disponible pour ce format ("
                + mimeType
                + "). Fichier source: "
                + fileName
                + " ("
                + fileSize
                + " octets).";
    }

    private String sanitizeFileName(String originalFileName) {
        String normalized = normalizeRequired(originalFileName, "Le nom de fichier est obligatoire.");
        String sanitized = normalized.replace("\\", "/");
        int slashIndex = sanitized.lastIndexOf('/');
        String withoutPath = slashIndex >= 0 ? sanitized.substring(slashIndex + 1) : sanitized;
        String safe = withoutPath.replaceAll("[\\r\\n\\t]", "_");
        if (safe.isBlank()) {
            throw new IllegalArgumentException("Nom de fichier invalide.");
        }
        if (safe.length() > 220) {
            return safe.substring(safe.length() - 220);
        }
        return safe;
    }

    private String extractExtension(String fileName) {
        int dotIndex = fileName.lastIndexOf('.');
        if (dotIndex < 0 || dotIndex == fileName.length() - 1) {
            return "";
        }
        return fileName.substring(dotIndex + 1).toLowerCase(Locale.ROOT);
    }

    private String slicePage(String content, int page, int pageSize) {
        if (content.isEmpty()) {
            return "";
        }
        int start = Math.max(0, (page - 1) * pageSize);
        int end = Math.min(content.length(), start + pageSize);
        return content.substring(start, end);
    }

    private List<Integer> computeMatchedPages(String content, int pageSize, String query) {
        String safeQuery = normalize(query).toLowerCase(Locale.ROOT);
        if (safeQuery.isEmpty() || content.isEmpty()) {
            return List.of();
        }

        int totalPages = Math.max(1, (int) Math.ceil((double) content.length() / pageSize));
        List<Integer> matched = new ArrayList<>();
        for (int page = 1; page <= totalPages; page++) {
            String pageContent = slicePage(content, page, pageSize).toLowerCase(Locale.ROOT);
            if (pageContent.contains(safeQuery)) {
                matched.add(page);
            }
        }
        return matched;
    }

    private int clamp(int value, int min, int max) {
        return Math.max(min, Math.min(max, value));
    }

    private String summarize(String content, int maxLength) {
        String safe = normalize(content);
        if (safe.length() <= maxLength) {
            return safe;
        }
        return safe.substring(0, maxLength);
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim();
    }

    private String normalizeUpper(String value) {
        return normalize(value).toUpperCase(Locale.ROOT);
    }

    private String normalizeOrNull(String value) {
        String normalized = normalize(value);
        return normalized.isEmpty() ? null : normalized;
    }

    private String normalizeRequired(String value, String message) {
        String normalized = normalize(value);
        if (normalized.isEmpty()) {
            throw new IllegalArgumentException(message);
        }
        return normalized;
    }

    private record UploadedFilePayload(
            String fileName,
            String mimeType,
            long fileSize,
            byte[] contentBytes,
            String previewText
    ) {
    }

    private void notifySafely(String username, String title, String message) {
        try {
            if (!normalize(username).isEmpty()) {
                notificationClient.sendInternalNotification(username, title, message);
            }
        } catch (Exception ex) {
            log.warn("Notification GED non envoyee pour {}", username, ex);
        }
    }

    private void notifyQualityReviewRequested(DocumentEntity document, GedUserContext actor) {
        Set<String> recipients = new HashSet<>();

        try {
            recipients.addAll(authUserPermissionClient.fetchActiveUsernamesByRole(QUALITY_ROLE_NAME));
        } catch (Exception ex) {
            log.warn("Recuperation des responsables qualite impossible", ex);
        }

        if (recipients.isEmpty()) {
            recipients.add(DEFAULT_QUALITY_USERNAME);
        }

        String submittedBy = normalize(actor.username());
        String title = "Document en attente qualite";
        String message = "Le document "
                + document.getReferenceCode()
                + " - "
                + document.getTitle()
                + " a ete soumis"
                + (submittedBy.isEmpty() ? "." : " par " + submittedBy + ".");

        recipients.stream()
                .map(this::normalize)
                .filter(username -> !username.isEmpty())
                .forEach(username -> notifySafely(username, title, message));
    }
}
