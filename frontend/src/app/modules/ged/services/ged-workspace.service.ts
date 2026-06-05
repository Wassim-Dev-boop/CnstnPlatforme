import { computed, Injectable, signal, type Signal, type WritableSignal } from '@angular/core';
import { Subject } from 'rxjs';
import type { Document, DocumentVersion } from '../../../core/models';
import type {
  GedConfidentialityLevel,
  GedFolderTreeNode,
  GedDocumentAcl,
  GedAuditLogEntry,
} from '../../../core/services/document.service';

export type GedViewMode = 'list' | 'grid' | 'table';
export type GedStatusFilter = Document['gedStatus'] | 'ALL';
export type GedSortOption = 'updatedDesc' | 'updatedAsc' | 'titleAsc' | 'titleDesc' | 'referenceAsc' | 'referenceDesc';
export type GedCategoryTabId = 'ALL' | 'PROCEDURES' | 'FORMULAIRES' | 'TECHNIQUES' | 'ARCHIVES';
export type GedInspectorTab = 'meta' | 'actions' | 'versions' | 'acl' | 'history';

export interface FlatFolderNode {
  id: string;
  name: string;
  parentId: string | null;
  category: string | null;
  archived: boolean;
  documentCount: number;
  depth: number;
  breadcrumb: string;
}

export interface VisibleFolderNode extends FlatFolderNode {
  displayDepth: number;
}

export interface GedKpiSnapshot {
  total: number;
  drafts: number;
  inReview: number;
  approved: number;
  published: number;
  rejected: number;
  archived: number;
}

@Injectable({ providedIn: 'root' })
export class GedWorkspaceService {
  readonly searchTerm: WritableSignal<string> = signal('');
  readonly selectedFolderId: WritableSignal<string | null> = signal(null);
  readonly selectedStatus: WritableSignal<GedStatusFilter> = signal('ALL');
  readonly selectedCategory: WritableSignal<string> = signal('ALL');
  readonly selectedConfidentiality: WritableSignal<GedConfidentialityLevel | 'ALL'> = signal('ALL');
  readonly selectedSortOption: WritableSignal<GedSortOption> = signal('updatedDesc');
  readonly activeCategoryTab: WritableSignal<GedCategoryTabId> = signal('ALL');
  readonly viewMode: WritableSignal<GedViewMode> = signal('list');
  readonly currentPage: WritableSignal<number> = signal(1);
  readonly pageSize: WritableSignal<number> = signal(12);
  readonly showAdvancedFilters: WritableSignal<boolean> = signal(false);
  readonly showAuditPanel: WritableSignal<boolean> = signal(false);

  readonly folders: WritableSignal<GedFolderTreeNode[]> = signal([]);
  readonly flatFolders: WritableSignal<FlatFolderNode[]> = signal([]);
  readonly visibleFolders: WritableSignal<VisibleFolderNode[]> = signal([]);
  readonly expandedFolderIds: WritableSignal<Set<string>> = signal(new Set());
  readonly activeTabFolderId: WritableSignal<string | null> = signal(null);
  readonly categoryOptions: WritableSignal<string[]> = signal([]);
  readonly documentServiceOptions: WritableSignal<string[]> = signal([]);

  readonly allDocuments: WritableSignal<Document[]> = signal([]);
  readonly visibleDocuments: WritableSignal<Document[]> = signal([]);
  readonly totalDocumentsCount: WritableSignal<number> = signal(0);
  readonly pinnedDocumentIds: WritableSignal<string[]> = signal([]);

  readonly selectedDocumentIds: WritableSignal<Set<string>> = signal(new Set());
  readonly focusedDocumentId: WritableSignal<string | null> = signal(null);
  readonly activeInspectorTab: WritableSignal<GedInspectorTab> = signal('meta');

  readonly isLoadingFolders: WritableSignal<boolean> = signal(false);
  readonly isLoadingDocuments: WritableSignal<boolean> = signal(false);
  readonly isSavingFolder: WritableSignal<boolean> = signal(false);
  readonly isSavingDocument: WritableSignal<boolean> = signal(false);
  readonly isSavingVersion: WritableSignal<boolean> = signal(false);
  readonly isSavingAcl: WritableSignal<boolean> = signal(false);
  readonly isLoadingPreview: WritableSignal<boolean> = signal(false);
  readonly isLoadingAuditLogs: WritableSignal<boolean> = signal(false);

  readonly feedbackMessage: WritableSignal<string> = signal('');
  readonly feedbackTone: WritableSignal<'success' | 'error' | 'idle'> = signal('idle');

  readonly showFolderModal: WritableSignal<boolean> = signal(false);
  readonly showFolderDetailsModal: WritableSignal<boolean> = signal(false);
  readonly showDocumentModal: WritableSignal<boolean> = signal(false);
  readonly showVersionModal: WritableSignal<boolean> = signal(false);
  readonly showAclModal: WritableSignal<boolean> = signal(false);
  readonly showPreviewModal: WritableSignal<boolean> = signal(false);
  readonly pendingFolderDeletion: WritableSignal<{
    folder: VisibleFolderNode;
    subFolderCount: number;
    documentCount: number;
  } | null> = signal(null);

  readonly pendingFolderEdition: WritableSignal<VisibleFolderNode | null> = signal(null);

  /**
   * Bus d'evenements : emet quand un consommateur (modale, sidebar, etc.)
   * demande au composant principal de recharger les folders et les documents.
   * Le composant `GedWorkspaceComponent` s'y abonne et appelle ses loaders prives.
   */
  readonly workspaceRefresh$ = new Subject<'folders' | 'documents' | 'all'>();

  // -------- Per-document deep data (loaded on demand) --------
  readonly documentVersions: WritableSignal<DocumentVersion[]> = signal([]);
  readonly isLoadingVersions: WritableSignal<boolean> = signal(false);
  readonly versionsLoadedFor: WritableSignal<string | null> = signal(null);

  readonly documentAcl: WritableSignal<GedDocumentAcl | null> = signal(null);
  readonly isLoadingAcl: WritableSignal<boolean> = signal(false);
  readonly aclLoadedFor: WritableSignal<string | null> = signal(null);

  readonly documentAuditLogs: WritableSignal<GedAuditLogEntry[]> = signal([]);
  readonly isLoadingDocumentAudit: WritableSignal<boolean> = signal(false);
  readonly auditLoadedFor: WritableSignal<string | null> = signal(null);

  readonly recentDocumentIds: WritableSignal<string[]> = signal([]);
  readonly searchInputRef: WritableSignal<HTMLInputElement | null> = signal(null);

  readonly selectedDocument: Signal<Document | null> = computed(() => {
    const id = this.focusedDocumentId();
    if (!id) {
      return null;
    }
    return this.allDocuments().find((doc) => doc.id === id) ?? null;
  });

  readonly selectedDocumentFolderLabel: Signal<string> = computed(() => {
    const doc = this.selectedDocument();
    if (!doc?.folderId) {
      return 'Non defini';
    }
    const folder = this.flatFolders().find((item) => item.id === doc.folderId);
    return folder?.breadcrumb ?? doc.folderId;
  });

  readonly kpi: Signal<GedKpiSnapshot> = computed(() => {
    const docs = this.allDocuments();
    const kpi: GedKpiSnapshot = {
      total: docs.length,
      drafts: 0,
      inReview: 0,
      approved: 0,
      published: 0,
      rejected: 0,
      archived: 0,
    };
    for (const doc of docs) {
      if (doc.isArchived || doc.gedStatus === 'Archive' || doc.gedStatus === 'Obsolete') {
        kpi.archived += 1;
        continue;
      }
      switch (doc.gedStatus) {
        case 'Brouillon':
          kpi.drafts += 1;
          break;
        case 'En attente qualite':
          kpi.inReview += 1;
          break;
        case 'Valide qualite':
        case 'Valide qualite (publiable)':
          kpi.approved += 1;
          break;
        case 'Publie':
          kpi.published += 1;
          break;
        case 'Refuse':
          kpi.rejected += 1;
          break;
        default:
          break;
      }
    }
    return kpi;
  });

  readonly totalPages: Signal<number> = computed(() => {
    return Math.max(1, Math.ceil(this.totalDocumentsCount() / this.pageSize()));
  });

  readonly hasSelection: Signal<boolean> = computed(() => this.selectedDocumentIds().size > 0);

  toggleFolderExpansion(folderId: string): void {
    const current = this.expandedFolderIds();
    const next = new Set(current);
    if (next.has(folderId)) {
      next.delete(folderId);
    } else {
      next.add(folderId);
    }
    this.expandedFolderIds.set(next);
  }

  expandFolderAncestors(folderId: string): void {
    const folders = this.flatFolders();
    const byId = new Map(folders.map((folder) => [folder.id, folder]));
    const current = byId.get(folderId);
    if (!current) {
      return;
    }
    const next = new Set(this.expandedFolderIds());
    let parentId: string | null = current.parentId;
    while (parentId) {
      next.add(parentId);
      const parent: FlatFolderNode | undefined = byId.get(parentId);
      parentId = parent?.parentId ?? null;
    }
    this.expandedFolderIds.set(next);
  }

  toggleDocumentSelection(documentId: string, additive: boolean): void {
    const current = this.selectedDocumentIds();
    const next = additive ? new Set(current) : new Set<string>();
    if (next.has(documentId)) {
      next.delete(documentId);
    } else {
      next.add(documentId);
    }
    this.selectedDocumentIds.set(next);
  }

  selectAllVisible(): void {
    this.selectedDocumentIds.set(new Set(this.visibleDocuments().map((doc) => doc.id)));
  }

  clearSelection(): void {
    this.selectedDocumentIds.set(new Set());
  }

  setFeedback(message: string, tone: 'success' | 'error' = 'success'): void {
    this.feedbackMessage.set(message);
    this.feedbackTone.set(tone);
  }

  requestFolderDeletion(folder: VisibleFolderNode): void {
    const subFolderCount = this.countSubFoldersRecursive(folder.id);
    const documentCount = folder.documentCount;
    this.pendingFolderDeletion.set({ folder, subFolderCount, documentCount });
  }

  cancelFolderDeletion(): void {
    this.pendingFolderDeletion.set(null);
  }

  requestFolderEdition(folder: VisibleFolderNode): void {
    this.pendingFolderEdition.set(folder);
  }

  cancelFolderEdition(): void {
    this.pendingFolderEdition.set(null);
  }

  private countSubFoldersRecursive(folderId: string): number {
    const tree = this.visibleFolders();
    const directChildren = tree.filter((f) => f.parentId === folderId);
    let total = directChildren.length;
    for (const child of directChildren) {
      total += this.countSubFoldersRecursive(child.id);
    }
    return total;
  }

  clearFeedback(): void {
    this.feedbackMessage.set('');
    this.feedbackTone.set('idle');
  }

  setFocusedDocument(documentId: string | null): void {
    this.focusedDocumentId.set(documentId);
    if (documentId) {
      this.recordRecentDocument(documentId);
    }
  }

  recordRecentDocument(documentId: string): void {
    const current = this.recentDocumentIds().filter((id) => id !== documentId);
    this.recentDocumentIds.set([documentId, ...current].slice(0, 5));
  }

  clearRecentDocuments(): void {
    this.recentDocumentIds.set([]);
  }

  resetDocumentDeepData(): void {
    this.documentVersions.set([]);
    this.versionsLoadedFor.set(null);
    this.documentAcl.set(null);
    this.aclLoadedFor.set(null);
    this.documentAuditLogs.set([]);
    this.auditLoadedFor.set(null);
  }

  setVersions(documentId: string, versions: DocumentVersion[]): void {
    this.documentVersions.set(versions);
    this.versionsLoadedFor.set(documentId);
  }

  setAcl(documentId: string, acl: GedDocumentAcl): void {
    this.documentAcl.set(acl);
    this.aclLoadedFor.set(documentId);
  }

  setDocumentAuditLogs(documentId: string, logs: GedAuditLogEntry[]): void {
    this.documentAuditLogs.set(logs);
    this.auditLoadedFor.set(documentId);
  }

  pinDocument(documentId: string): void {
    const current = this.pinnedDocumentIds();
    if (current.includes(documentId)) {
      return;
    }
    this.pinnedDocumentIds.set([documentId, ...current].slice(0, 8));
  }

  unpinDocument(documentId: string): void {
    this.pinnedDocumentIds.set(this.pinnedDocumentIds().filter((id) => id !== documentId));
  }

  resetFilters(): void {
    this.searchTerm.set('');
    this.selectedStatus.set('ALL');
    this.selectedCategory.set('ALL');
    this.selectedConfidentiality.set('ALL');
    this.selectedSortOption.set('updatedDesc');
    this.activeCategoryTab.set('ALL');
    this.currentPage.set(1);
  }

  isFolderExpanded(folderId: string): boolean {
    return this.expandedFolderIds().has(folderId);
  }

  isFolderExpandable(folder: VisibleFolderNode): boolean {
    return this.visibleFolders().some((item) => item.parentId === folder.id);
  }

  isDocumentSelected(documentId: string): boolean {
    return this.selectedDocumentIds().has(documentId);
  }

  isDocumentPinned(documentId: string): boolean {
    return this.pinnedDocumentIds().includes(documentId);
  }
}
