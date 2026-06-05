import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, map, tap } from 'rxjs';
import { ApiPageResponse, buildApiUrl, extractPageContent } from '../config/backend-api.config';
import { Category, Document, DocumentSearchFilter, DocumentVersion, UserRole } from '../models';
import { toFrontendRole } from '../utils/role-mapper.util';

export type GedConfidentialityLevel = 'PUBLIC' | 'INTERNAL' | 'RESTRICTED' | 'CONFIDENTIAL';
export type GedAclRole =
  | 'ADMIN'
  | 'EMPLOYE'
  | 'CHEF_HIERARCHIQUE'
  | 'RESPONSABLE_SALLE'
  | 'RESPONSABLE_SECURITE'
  | 'DIRECTEUR_DSN'
  | 'RESPONSABLE_QUALITE';

export interface GedFolderTreeNode {
  id: string;
  name: string;
  parentId: string | null;
  category: string | null;
  archived: boolean;
  documentCount: number;
  children: GedFolderTreeNode[];
}

export interface GedDocumentAcl {
  roles: string[];
  services: string[];
}

export interface GedDocumentLink {
  id: string;
  sourceDocumentId: string;
  linkedDocumentId: string;
  linkedReferenceCode: string;
  linkedTitle: string;
  relationType: 'RELATED' | 'ANNEXE' | 'SOURCE' | 'REFERENCE';
  createdBy: string;
  createdAt: string;
}

export interface GedPreviewPayload {
  documentId: string;
  referenceCode: string;
  title: string;
  versionNumber: number;
  fileName: string;
  mimeType: string;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  zoomPercent: number;
  query: string;
  matchedPages: number[];
  pageContent: string;
  canDownload: boolean;
}

export interface GedAuditLogEntry {
  id: string;
  entityType: string;
  entityId: string | null;
  action: string;
  actorUsername: string;
  actorRoles: string;
  actorService: string;
  detailsJson: string;
  createdAt: string;
}

export interface GedCreateFolderRequest {
  name: string;
  parentId?: string | null;
  category?: string | null;
}

export interface GedCreateDocumentRequest {
  folderId: string;
  title: string;
  category: string;
  subCategory?: string;
  description?: string;
  content: string;
  fileName: string;
  mimeType: string;
  confidentialityLevel: GedConfidentialityLevel;
  allowedRoles: string[];
  allowedServices: string[];
}

export interface GedCreateDocumentUploadRequest {
  folderId: string;
  title: string;
  category: string;
  subCategory?: string;
  description?: string;
  confidentialityLevel: GedConfidentialityLevel;
  allowedRoles: string[];
  allowedServices: string[];
}

export interface GedUpdateDocumentRequest {
  folderId: string;
  title: string;
  category: string;
  subCategory?: string;
  description?: string;
  confidentialityLevel: GedConfidentialityLevel;
}

export interface GedAddVersionRequest {
  content: string;
  fileName: string;
  mimeType: string;
  changeNote?: string;
}

export interface GedAddVersionUploadRequest {
  changeNote?: string;
}

export interface GedDocumentQuery {
  search?: string;
  category?: string;
  confidentiality?: GedConfidentialityLevel;
  folderId?: string;
  page?: number;
  size?: number;
}

export interface GedPreviewQuery {
  versionNumber?: number;
  page?: number;
  pageSize?: number;
  zoomPercent?: number;
  query?: string;
}

export interface GedAuditLogQuery {
  page?: number;
  size?: number;
  entityId?: string;
  entityType?: string;
  action?: string;
  actorUsername?: string;
}

interface BackendDocumentResponse {
  id: string;
  referenceCode: string;
  folderId: string;
  title: string;
  category: string;
  subCategory?: string | null;
  description?: string | null;
  createdBy: string;
  ownerService?: string | null;
  status: BackendDocumentStatus;
  confidentialityLevel: GedConfidentialityLevel;
  archived: boolean;
  currentVersionNumber: number;
  approvedBy?: string | null;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

type BackendDocumentStatus = 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'PUBLISHED' | 'REJECTED' | 'ARCHIVED';

interface BackendVersionResponse {
  id: string;
  documentId: string;
  versionNumber: number;
  fileName: string;
  mimeType: string;
  fileSize: number;
  changeNote?: string | null;
  createdBy: string;
  createdAt: string;
  current: boolean;
}

interface BackendPreviewResponse {
  documentId: string;
  referenceCode: string;
  title: string;
  versionNumber: number;
  fileName: string;
  mimeType: string;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  zoomPercent: number;
  query: string;
  matchedPages: number[];
  pageContent: string;
  canDownload: boolean;
}

interface BackendDocumentAclResponse {
  roles: string[];
  services: string[];
}

interface BackendDocumentLinkResponse {
  id: string;
  sourceDocumentId: string;
  linkedDocumentId: string;
  linkedReferenceCode: string;
  linkedTitle: string;
  relationType: 'RELATED' | 'ANNEXE' | 'SOURCE' | 'REFERENCE';
  createdBy: string;
  createdAt: string;
}

interface BackendAuditLogResponse {
  id: string;
  entityType: string;
  entityId?: string | null;
  action: string;
  actorUsername: string;
  actorRoles: string;
  actorService: string;
  detailsJson: string;
  createdAt: string;
}

@Injectable({
  providedIn: 'root',
})
export class DocumentService {
  private documentsSubject = new BehaviorSubject<Document[]>([]);
  readonly documents$ = this.documentsSubject.asObservable();

  private categoriesSubject = new BehaviorSubject<Category[]>([]);
  readonly categories$ = this.categoriesSubject.asObservable();

  constructor(private http: HttpClient) {}

  getDocuments(query: GedDocumentQuery = {}): Observable<Document[]> {
    let params = new HttpParams()
      .set('page', String(query.page ?? 0))
      .set('size', String(query.size ?? 200));

    if (query.search) {
      params = params.set('search', query.search.trim());
    }
    if (query.category) {
      params = params.set('category', query.category.trim());
    }
    if (query.confidentiality) {
      params = params.set('confidentiality', query.confidentiality);
    }
    if (query.folderId) {
      params = params.set('folderId', query.folderId);
    }

    return this.http
      .get<ApiPageResponse<BackendDocumentResponse>>(buildApiUrl('/api/v1/documents'), { params })
      .pipe(
        map((response) => extractPageContent(response).map((item) => this.mapDocument(item))),
        tap((documents) => {
          this.documentsSubject.next(documents);
          this.categoriesSubject.next(this.buildCategories(documents));
        }),
      );
  }

  getDocumentById(id: string): Observable<Document> {
    return this.http
      .get<BackendDocumentResponse>(buildApiUrl(`/api/v1/documents/${id}`))
      .pipe(map((response) => this.mapDocument(response)));
  }

  getFoldersTree(): Observable<GedFolderTreeNode[]> {
    return this.http.get<GedFolderTreeNode[]>(buildApiUrl('/api/v1/documents/folders/tree'));
  }

  createFolder(request: GedCreateFolderRequest): Observable<GedFolderTreeNode> {
    return this.http.post<GedFolderTreeNode>(buildApiUrl('/api/v1/documents/folders'), {
      name: request.name.trim(),
      parentId: request.parentId ?? null,
      category: request.category?.trim() || null,
    });
  }

  updateFolder(folderId: string, request: GedCreateFolderRequest): Observable<GedFolderTreeNode> {
    return this.http.put<GedFolderTreeNode>(buildApiUrl(`/api/v1/documents/folders/${folderId}`), {
      name: request.name.trim(),
      parentId: request.parentId ?? null,
      category: request.category?.trim() || null,
    });
  }

  archiveFolder(folderId: string): Observable<void> {
    return this.http.delete<void>(buildApiUrl(`/api/v1/documents/folders/${folderId}`));
  }

  createDocument(request: GedCreateDocumentRequest): Observable<Document> {
    return this.http
      .post<BackendDocumentResponse>(buildApiUrl('/api/v1/documents'), {
        folderId: request.folderId,
        title: request.title.trim(),
        category: request.category.trim(),
        subCategory: request.subCategory?.trim() || null,
        description: request.description?.trim() || null,
        content: request.content,
        fileName: request.fileName.trim(),
        mimeType: request.mimeType.trim(),
        confidentialityLevel: request.confidentialityLevel,
        allowedRoles: request.allowedRoles,
        allowedServices: request.allowedServices,
      })
      .pipe(map((response) => this.mapDocument(response)));
  }

  createDocumentWithUpload(request: GedCreateDocumentUploadRequest, file: File): Observable<Document> {
    const formData = new FormData();
    formData.append(
      'metadata',
      new Blob(
        [
          JSON.stringify({
            folderId: request.folderId,
            title: request.title.trim(),
            category: request.category.trim(),
            subCategory: request.subCategory?.trim() || null,
            description: request.description?.trim() || null,
            confidentialityLevel: request.confidentialityLevel,
            allowedRoles: request.allowedRoles ?? [],
            allowedServices: request.allowedServices ?? [],
          }),
        ],
        { type: 'application/json' },
      ),
    );
    formData.append('file', file);

    return this.http
      .post<BackendDocumentResponse>(buildApiUrl('/api/v1/documents/upload'), formData)
      .pipe(map((response) => this.mapDocument(response)));
  }

  updateDocumentMetadata(documentId: string, request: GedUpdateDocumentRequest): Observable<Document> {
    return this.http
      .put<BackendDocumentResponse>(buildApiUrl(`/api/v1/documents/${documentId}`), {
        folderId: request.folderId,
        title: request.title.trim(),
        category: request.category.trim(),
        subCategory: request.subCategory?.trim() || null,
        description: request.description?.trim() || null,
        confidentialityLevel: request.confidentialityLevel,
      })
      .pipe(map((response) => this.mapDocument(response)));
  }

  archiveDocument(documentId: string): Observable<Document> {
    return this.http
      .put<BackendDocumentResponse>(buildApiUrl(`/api/v1/documents/${documentId}/archive`), {})
      .pipe(map((response) => this.mapDocument(response)));
  }

  deleteDocumentPermanently(documentId: string): Observable<void> {
    return this.http.delete<void>(buildApiUrl(`/api/v1/documents/${documentId}`));
  }

  submitWorkflow(documentId: string): Observable<Document> {
    return this.http
      .put<BackendDocumentResponse>(buildApiUrl(`/api/v1/documents/${documentId}/submit`), {})
      .pipe(map((response) => this.mapDocument(response)));
  }

  approveDocument(documentId: string): Observable<Document> {
    return this.http
      .put<BackendDocumentResponse>(buildApiUrl(`/api/v1/documents/${documentId}/approve`), {})
      .pipe(map((response) => this.mapDocument(response)));
  }

  publishDocument(documentId: string): Observable<Document> {
    return this.http
      .put<BackendDocumentResponse>(buildApiUrl(`/api/v1/documents/${documentId}/publish`), {})
      .pipe(map((response) => this.mapDocument(response)));
  }

  addDocumentVersion(documentId: string, request: GedAddVersionRequest): Observable<DocumentVersion> {
    return this.http
      .post<BackendVersionResponse>(buildApiUrl(`/api/v1/documents/${documentId}/versions`), {
        content: request.content,
        fileName: request.fileName.trim(),
        mimeType: request.mimeType.trim(),
        changeNote: request.changeNote?.trim() || null,
      })
      .pipe(map((response) => this.mapVersion(response)));
  }

  addDocumentVersionWithUpload(
    documentId: string,
    request: GedAddVersionUploadRequest,
    file: File,
  ): Observable<DocumentVersion> {
    const formData = new FormData();
    formData.append(
      'metadata',
      new Blob(
        [
          JSON.stringify({
            changeNote: request.changeNote?.trim() || null,
          }),
        ],
        { type: 'application/json' },
      ),
    );
    formData.append('file', file);
    return this.http
      .post<BackendVersionResponse>(buildApiUrl(`/api/v1/documents/${documentId}/versions/upload`), formData)
      .pipe(map((response) => this.mapVersion(response)));
  }

  getDocumentVersions(documentId: string): Observable<DocumentVersion[]> {
    return this.http
      .get<BackendVersionResponse[]>(buildApiUrl(`/api/v1/documents/${documentId}/versions`))
      .pipe(map((versions) => versions.map((version) => this.mapVersion(version))));
  }

  addDocumentLink(
    documentId: string,
    linkedDocumentId: string,
    relationType: 'RELATED' | 'ANNEXE' | 'SOURCE' | 'REFERENCE',
  ): Observable<GedDocumentLink> {
    return this.http
      .post<BackendDocumentLinkResponse>(buildApiUrl(`/api/v1/documents/${documentId}/links`), {
        linkedDocumentId,
        relationType,
      })
      .pipe(map((response) => this.mapDocumentLink(response)));
  }

  getDocumentLinks(documentId: string): Observable<GedDocumentLink[]> {
    return this.http
      .get<BackendDocumentLinkResponse[]>(buildApiUrl(`/api/v1/documents/${documentId}/links`))
      .pipe(map((links) => links.map((item) => this.mapDocumentLink(item))));
  }

  getDocumentAcl(documentId: string): Observable<GedDocumentAcl> {
    return this.http
      .get<BackendDocumentAclResponse>(buildApiUrl(`/api/v1/documents/${documentId}/acl`))
      .pipe(map((response) => ({ roles: response.roles ?? [], services: response.services ?? [] })));
  }

  updateDocumentAcl(documentId: string, acl: GedDocumentAcl): Observable<GedDocumentAcl> {
    return this.http
      .put<BackendDocumentAclResponse>(buildApiUrl(`/api/v1/documents/${documentId}/acl`), {
        roles: acl.roles ?? [],
        services: acl.services ?? [],
      })
      .pipe(map((response) => ({ roles: response.roles ?? [], services: response.services ?? [] })));
  }

  previewDocument(documentId: string, query: GedPreviewQuery = {}): Observable<GedPreviewPayload> {
    let params = new HttpParams();
    if (query.versionNumber != null) {
      params = params.set('versionNumber', String(query.versionNumber));
    }
    if (query.page != null) {
      params = params.set('page', String(query.page));
    }
    if (query.pageSize != null) {
      params = params.set('pageSize', String(query.pageSize));
    }
    if (query.zoomPercent != null) {
      params = params.set('zoomPercent', String(query.zoomPercent));
    }
    if (query.query) {
      params = params.set('query', query.query.trim());
    }

    return this.http
      .get<BackendPreviewResponse>(buildApiUrl(`/api/v1/documents/${documentId}/preview`), { params })
      .pipe(map((response) => this.mapPreview(response)));
  }

  downloadDocument(documentId: string, versionNumber?: number): Observable<string> {
    return this.downloadDocumentBinary(documentId, versionNumber).pipe(
      map((payload) => URL.createObjectURL(payload.content)),
    );
  }

  downloadDocumentBinary(
    documentId: string,
    versionNumber?: number,
  ): Observable<{ content: Blob; fileName: string; mimeType: string; fileSize: number }> {
    let params = new HttpParams();
    if (versionNumber != null) {
      params = params.set('versionNumber', String(versionNumber));
    }

    return this.http
      .get(buildApiUrl(`/api/v1/documents/${documentId}/download`), {
        params,
        observe: 'response',
        responseType: 'blob',
      })
      .pipe(
        map((response) => ({
          content: response.body ?? new Blob([], { type: 'application/octet-stream' }),
          fileName: this.extractFileName(response.headers),
          mimeType: this.extractMimeType(response.headers, response.body),
          fileSize: this.extractFileSize(response.headers, response.body),
        })),
      );
  }

  auditDocumentPrint(documentId: string, versionNumber?: number): Observable<void> {
    let params = new HttpParams();
    if (versionNumber != null) {
      params = params.set('versionNumber', String(versionNumber));
    }
    return this.http.post<void>(buildApiUrl(`/api/v1/documents/${documentId}/print`), null, { params });
  }

  listAuditLogs(query: GedAuditLogQuery = {}): Observable<ApiPageResponse<GedAuditLogEntry>> {
    let params = new HttpParams()
      .set('page', String(query.page ?? 0))
      .set('size', String(query.size ?? 30));
    if (query.entityId) {
      params = params.set('entityId', query.entityId);
    }
    if (query.entityType) {
      params = params.set('entityType', query.entityType);
    }
    if (query.action) {
      params = params.set('action', query.action);
    }
    if (query.actorUsername) {
      params = params.set('actorUsername', query.actorUsername);
    }

    return this.http
      .get<ApiPageResponse<BackendAuditLogResponse>>(buildApiUrl('/api/v1/documents/audit-logs'), { params })
      .pipe(
        map((response) => ({
          ...response,
          content: (response.content ?? []).map((item) => this.mapAudit(item)),
        })),
      );
  }

  searchDocuments(filter: DocumentSearchFilter): Observable<Document[]> {
    return this.getDocuments({
      search: filter.searchTerm,
      page: 0,
      size: 200,
    });
  }

  private mapDocument(response: BackendDocumentResponse): Document {
    const uploadedAt = this.toDate(response.createdAt);
    const updatedAt = this.toDate(response.updatedAt, uploadedAt);
    const categoryName = response.category?.trim() || 'General';
    const category: Category = {
      id: this.buildCategoryId(categoryName),
      name: categoryName,
      description: `Categorie ${categoryName}`,
      createdAt: uploadedAt,
    };
    const versionNumber = response.currentVersionNumber > 0 ? response.currentVersionNumber : 1;
    const currentVersion: DocumentVersion = {
      id: `${response.id}-v${versionNumber}`,
      documentId: response.id,
      versionNumber,
      fileName: `${response.referenceCode || response.title}-v${versionNumber}.txt`,
      fileSize: 0,
      mimeType: 'text/plain',
      uploadedBy: response.createdBy || 'systeme',
      uploadedAt,
      downloadUrl: '',
      changeLog: '',
    };

    const backendRole = this.guessRoleFromAuthor(response.createdBy);
    const accessRole = this.mapRoleToLegacyAccess(backendRole);

    return {
      id: response.id,
      folderId: response.folderId,
      title: response.title,
      description: response.description || '',
      category,
      categoryId: category.id,
      mainCategory: category.name,
      subCategory: response.subCategory || '',
      categorieNom: response.subCategory || '',
      typeCategorie: category.name,
      direction: response.ownerService || 'Direction',
      gedStatus: this.mapGedStatus(response.status),
      referenceCode: response.referenceCode,
      confidentialityLevel: response.confidentialityLevel,
      currentVersionNumber: response.currentVersionNumber,
      ownerService: response.ownerService || '',
      versions: [currentVersion],
      currentVersion,
      author: response.createdBy || 'systeme',
      uploadedAt,
      updatedAt,
      accessControl: {
        roles: [accessRole],
      },
      tags: [response.confidentialityLevel],
      isArchived: response.archived,
      fileSize: 0,
      previewUrl: '',
    };
  }

  private mapVersion(response: BackendVersionResponse): DocumentVersion {
    return {
      id: response.id,
      documentId: response.documentId,
      versionNumber: response.versionNumber,
      fileName: response.fileName,
      fileSize: response.fileSize,
      mimeType: response.mimeType,
      uploadedBy: response.createdBy,
      uploadedAt: this.toDate(response.createdAt),
      downloadUrl: '',
      changeLog: response.changeNote || '',
    };
  }

  private mapDocumentLink(response: BackendDocumentLinkResponse): GedDocumentLink {
    return {
      id: response.id,
      sourceDocumentId: response.sourceDocumentId,
      linkedDocumentId: response.linkedDocumentId,
      linkedReferenceCode: response.linkedReferenceCode,
      linkedTitle: response.linkedTitle,
      relationType: response.relationType,
      createdBy: response.createdBy,
      createdAt: response.createdAt,
    };
  }

  private mapPreview(response: BackendPreviewResponse): GedPreviewPayload {
    return {
      documentId: response.documentId,
      referenceCode: response.referenceCode,
      title: response.title,
      versionNumber: response.versionNumber,
      fileName: response.fileName,
      mimeType: response.mimeType,
      totalPages: response.totalPages,
      currentPage: response.currentPage,
      pageSize: response.pageSize,
      zoomPercent: response.zoomPercent,
      query: response.query,
      matchedPages: response.matchedPages ?? [],
      pageContent: response.pageContent ?? '',
      canDownload: response.canDownload,
    };
  }

  private mapAudit(response: BackendAuditLogResponse): GedAuditLogEntry {
    return {
      id: response.id,
      entityType: response.entityType,
      entityId: response.entityId ?? null,
      action: response.action,
      actorUsername: response.actorUsername,
      actorRoles: response.actorRoles,
      actorService: response.actorService,
      detailsJson: response.detailsJson,
      createdAt: response.createdAt,
    };
  }

  private mapGedStatus(status: BackendDocumentStatus): Document['gedStatus'] {
    switch (status) {
      case 'PUBLISHED':
        return 'Publie';
      case 'APPROVED':
        return 'Valide qualite';
      case 'IN_REVIEW':
        return 'En attente qualite';
      case 'REJECTED':
        return 'Refuse';
      case 'ARCHIVED':
        return 'Archive';
      default:
        return 'Brouillon';
    }
  }

  private buildCategoryId(name: string): string {
    const normalized = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return normalized || 'general';
  }

  private buildCategories(documents: Document[]): Category[] {
    const mapById = new Map<string, Category>();
    for (const doc of documents) {
      mapById.set(doc.category.id, doc.category);
    }
    return Array.from(mapById.values()).sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  }

  private toDate(value: string | null | undefined, fallback = new Date()): Date {
    if (!value) {
      return fallback;
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? fallback : parsed;
  }

  private extractFileName(headers: HttpHeaders): string {
    const disposition = headers.get('content-disposition') || headers.get('Content-Disposition') || '';
    const utfMatch = /filename\*=UTF-8''([^;]+)/i.exec(disposition);
    if (utfMatch?.[1]) {
      return decodeURIComponent(utfMatch[1]);
    }
    const match = /filename="([^"]+)"/i.exec(disposition);
    return match?.[1] || 'document.txt';
  }

  private extractMimeType(headers: HttpHeaders, body: Blob | null): string {
    const headerMime = headers.get('content-type') || headers.get('Content-Type') || '';
    const normalizedHeader = headerMime.split(';')[0].trim();
    if (normalizedHeader) {
      return normalizedHeader;
    }
    return body?.type || 'application/octet-stream';
  }

  private extractFileSize(headers: HttpHeaders, body: Blob | null): number {
    const headerSize = headers.get('content-length') || headers.get('Content-Length');
    const parsed = headerSize ? Number.parseInt(headerSize, 10) : Number.NaN;
    if (Number.isFinite(parsed) && parsed >= 0) {
      return parsed;
    }
    return body?.size ?? 0;
  }

  private guessRoleFromAuthor(author: string): GedAclRole {
    const value = (author || '').toLowerCase();
    if (value.includes('admin')) {
      return 'ADMIN';
    }
    if (value.includes('qualite')) {
      return 'RESPONSABLE_QUALITE';
    }
    if (value.includes('dsn')) {
      return 'DIRECTEUR_DSN';
    }
    if (value.includes('secur')) {
      return 'RESPONSABLE_SECURITE';
    }
    if (value.includes('salle')) {
      return 'RESPONSABLE_SALLE';
    }
    if (value.includes('chef') || value.includes('manager')) {
      return 'CHEF_HIERARCHIQUE';
    }
    return 'EMPLOYE';
  }

  private mapRoleToLegacyAccess(role: GedAclRole): UserRole {
    const frontendRole = toFrontendRole(role);
    switch (frontendRole) {
      case 'ADMIN':
        return UserRole.ADMIN;
      case 'MANAGER':
        return UserRole.MANAGER;
      default:
        return UserRole.USER;
    }
  }
}
