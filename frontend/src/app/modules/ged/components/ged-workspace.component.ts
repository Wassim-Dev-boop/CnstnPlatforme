import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  OnDestroy,
  OnInit,
  WritableSignal,
  effect,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import {
  DocumentService,
  GedAuditLogEntry,
  GedFolderTreeNode,
} from '../../../core/services/document.service';
import { GedKpiStripComponent } from './kpi-strip/ged-kpi-strip.component';
import { GedWorkspaceListComponent } from './workspace-list/ged-workspace-list.component';
import { GedBulkActionsBarComponent } from './workspace-list/ged-bulk-actions-bar.component';
import { GedWorkspaceSidebarComponent } from './workspace-sidebar/ged-workspace-sidebar.component';
import { GedWorkspaceInspectorComponent } from './workspace-inspector/ged-workspace-inspector.component';
import { GedWorkspaceModalsComponent } from './workspace-modals/ged-workspace-modals.component';
import { GedWorkspacePreviewComponent } from './workspace-preview/ged-workspace-preview.component';
import {
  GedWorkspaceService,
  type FlatFolderNode,
} from '../services/ged-workspace.service';

@Component({
  selector: 'app-ged-workspace',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    GedKpiStripComponent,
    GedWorkspaceSidebarComponent,
    GedWorkspaceListComponent,
    GedWorkspaceInspectorComponent,
    GedBulkActionsBarComponent,
    GedWorkspaceModalsComponent,
    GedWorkspacePreviewComponent,
  ],
  template: `
    <div
      class="ged-readable-shell mx-auto flex h-full max-w-[1800px] flex-col gap-3 px-4 py-4"
      data-testid="ged-workspace"
    >
      <header
        class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-theme-xs"
      >
        <div class="flex items-center gap-3">
          <span
            class="inline-flex size-10 items-center justify-center rounded-xl border border-blue-light-100 bg-blue-light-50 text-blue-light-600"
          >
            <svg class="size-5" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path
                d="M2.5 5.25C2.5 4.14543 3.39543 3.25 4.5 3.25H8.25L9.83333 4.83333H15.5C16.6046 4.83333 17.5 5.72876 17.5 6.83333V14.5C17.5 15.6046 16.6046 16.5 15.5 16.5H4.5C3.39543 16.5 2.5 15.6046 2.5 14.5V5.25Z"
                stroke="currentColor"
                stroke-width="1.4"
              />
            </svg>
          </span>
          <div>
            <h1 class="text-xl font-semibold text-gray-900">GED</h1>
            <p class="text-xs text-gray-500">Documents, dossiers, versions et droits d'acces</p>
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <button
            *ngIf="canCreateGedDocument()"
            type="button"
            (click)="openCreateDocument()"
            [disabled]="!canCreateDocumentFromSelection()"
            class="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-600 disabled:opacity-60"
            data-testid="ged-header-create-document"
          >
            + Nouveau document
          </button>
          <button
            *ngIf="canManageGed()"
            type="button"
            (click)="openCreateFolder()"
            class="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
            data-testid="ged-header-create-folder"
          >
            + Nouveau dossier
          </button>
        </div>
      </header>

      <app-ged-kpi-strip></app-ged-kpi-strip>

      <div
        class="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-[260px_minmax(0,1fr)_340px]"
      >
        <app-ged-workspace-sidebar class="min-h-[400px] lg:min-h-0"></app-ged-workspace-sidebar>
        <app-ged-workspace-list class="min-h-[500px] lg:min-h-0"></app-ged-workspace-list>
        <app-ged-workspace-inspector class="min-h-[400px] lg:min-h-0"></app-ged-workspace-inspector>
      </div>

      <app-ged-bulk-actions-bar></app-ged-bulk-actions-bar>

      <app-ged-workspace-modals></app-ged-workspace-modals>
      <app-ged-workspace-preview></app-ged-workspace-preview>

      <div
        *ngIf="workspace.feedbackMessage()"
        class="fixed bottom-4 right-4 z-50 rounded-xl border px-4 py-2 text-sm shadow-lg"
        [ngClass]="
          workspace.feedbackTone() === 'success'
            ? 'border-success-200 bg-success-50 text-success-700'
            : 'border-error-200 bg-error-50 text-error-700'
        "
      >
        {{ workspace.feedbackMessage() }}
      </div>

      <section
        *ngIf="workspace.showAuditPanel() && canViewAuditLogs()"
        class="rounded-xl border border-gray-200 bg-white shadow-theme-xs"
      >
        <div class="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <h3 class="text-sm font-semibold text-gray-900">Traces globales GED</h3>
          <button
            type="button"
            (click)="workspace.showAuditPanel.set(false)"
            class="rounded-md border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
          >
            Fermer
          </button>
        </div>
        <div class="max-h-72 overflow-auto">
          <table class="min-w-full divide-y divide-gray-200 text-sm">
            <thead class="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th class="px-3 py-2 text-left">Date</th>
                <th class="px-3 py-2 text-left">Action</th>
                <th class="px-3 py-2 text-left">Acteur</th>
                <th class="px-3 py-2 text-left">Entite</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr *ngFor="let log of auditLogs()">
                <td class="px-3 py-2 text-gray-700">{{ formatDate(log.createdAt) }}</td>
                <td class="px-3 py-2 text-gray-700">{{ log.action }}</td>
                <td class="px-3 py-2 text-gray-700">{{ log.actorUsername }}</td>
                <td class="px-3 py-2 text-gray-700">{{ log.entityType }}</td>
              </tr>
              <tr *ngIf="auditLogs().length === 0 && !isLoadingAuditLogs()">
                <td colspan="4" class="px-3 py-6 text-center text-sm text-gray-500">
                  Aucune trace disponible.
                </td>
              </tr>
              <tr *ngIf="isLoadingAuditLogs()">
                <td colspan="4" class="px-3 py-6 text-center text-sm text-gray-500">
                  Chargement...
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100%;
        font-family: var(--font-outfit, 'Segoe UI', Roboto, Arial, sans-serif);
        color: #111827;
      }
      .ged-readable-shell {
        font-size: 14px;
        line-height: 1.5;
      }
      .ged-panel {
        border-radius: 1rem;
        box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05), 0 10px 30px rgba(15, 23, 42, 0.06);
      }
    `,
  ],
})
export class GedWorkspaceComponent implements OnInit, OnDestroy {
  readonly workspace = inject(GedWorkspaceService);
  private readonly documentService = inject(DocumentService);
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);

  private readonly subscriptions = new Subscription();
  readonly auditLogs: WritableSignal<GedAuditLogEntry[]> = signal<GedAuditLogEntry[]>([]);
  readonly isLoadingAuditLogs: WritableSignal<boolean> = signal(false);

  constructor() {
    // Auto-load per-document deep data (versions, ACL, audit) when focus changes
    effect(() => {
      const id = this.workspace.focusedDocumentId();
      if (!id) {
        this.workspace.resetDocumentDeepData();
        return;
      }
      // Versions are visible to all who can read the document
      this.loadDocumentVersions(id);
      // ACL is admin/quality only - guard with permission to avoid 403 noise
      if (this.canManageGed() || this.authService.hasRole('QUALITY_MANAGER')) {
        this.loadDocumentAcl(id);
      } else {
        this.workspace.setAcl(id, { roles: [], services: [] });
      }
      // Audit logs are admin only
      if (this.canViewAuditLogs()) {
        this.loadDocumentAuditLogs(id);
      } else {
        this.workspace.setDocumentAuditLogs(id, []);
      }
    });

    // Recharger la liste des documents dès qu'un filtre de navigation change.
    // Sans cet effect, cliquer sur un dossier dans la sidebar mettait a jour
    // le signal selectedFolderId mais ne re-declenchait pas l'appel backend,
    // laissant la liste affichee sur l'ancien dossier.
    effect(() => {
      // Tracking explicite des dependances
      this.workspace.selectedFolderId();
      this.workspace.selectedCategory();
      this.workspace.selectedConfidentiality();
      this.workspace.searchTerm();
      this.loadDocuments();
    });
  }

  ngOnInit(): void {
    const routeSearch = (this.route.snapshot.queryParamMap.get('search') || '').trim();
    if (routeSearch) {
      this.workspace.searchTerm.set(routeSearch);
    }

    this.subscriptions.add(
      this.route.queryParamMap.subscribe((params) => {
        const next = (params.get('search') || params.get('q') || '').trim();
        if (next !== this.workspace.searchTerm()) {
          this.workspace.searchTerm.set(next);
        }
      })
    );

    this.loadFolders();
    this.loadDocuments();

    this.subscriptions.add(
      this.workspace.workspaceRefresh$.subscribe((scope) => {
        if (scope === 'folders' || scope === 'all') {
          this.loadFolders();
        }
        if (scope === 'documents' || scope === 'all') {
          this.loadDocuments();
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    // Close any open modal first, then clear selection
    if (this.workspace.showPreviewModal()) {
      this.workspace.showPreviewModal.set(false);
      return;
    }
    if (this.workspace.showFolderModal()) {
      this.workspace.showFolderModal.set(false);
      return;
    }
    if (this.workspace.showDocumentModal()) {
      this.workspace.showDocumentModal.set(false);
      return;
    }
    if (this.workspace.showVersionModal()) {
      this.workspace.showVersionModal.set(false);
      return;
    }
    if (this.workspace.showAclModal()) {
      this.workspace.showAclModal.set(false);
      return;
    }
    this.workspace.clearSelection();
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    // Don't intercept inside form fields (except Escape which is handled above)
    const target = event.target as HTMLElement | null;
    const isEditing = target && (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT' ||
      target.isContentEditable
    );

    // Ctrl/Cmd + K or "/" -> focus search
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.focusSearch();
      return;
    }
    if (!isEditing && event.key === '/') {
      event.preventDefault();
      this.focusSearch();
      return;
    }

    // Ctrl/Cmd + N -> new document
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'n' && !event.shiftKey) {
      event.preventDefault();
      this.openCreateDocument();
      return;
    }

    // Ctrl/Cmd + Shift + V -> new version (needs a focused document)
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'v') {
      event.preventDefault();
      if (this.workspace.focusedDocumentId()) {
        this.workspace.showVersionModal.set(true);
      } else {
        this.workspace.setFeedback('Selectionnez un document pour ajouter une version.', 'error');
      }
      return;
    }

    // J/K to navigate focused document in visible list
    if (!isEditing && (event.key === 'j' || event.key === 'k' || event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      const docs = this.workspace.visibleDocuments();
      if (docs.length === 0) return;
      const currentId = this.workspace.focusedDocumentId();
      const currentIndex = currentId ? docs.findIndex((d) => d.id === currentId) : -1;
      let nextIndex: number;
      if (event.key === 'j' || event.key === 'ArrowDown') {
        nextIndex = currentIndex < 0 ? 0 : Math.min(docs.length - 1, currentIndex + 1);
      } else {
        nextIndex = currentIndex < 0 ? 0 : Math.max(0, currentIndex - 1);
      }
      const nextDoc = docs[nextIndex];
      if (nextDoc) {
        event.preventDefault();
        this.workspace.setFocusedDocument(nextDoc.id);
        if (nextDoc.folderId) {
          this.workspace.expandFolderAncestors(nextDoc.folderId);
        }
      }
    }
  }

  focusSearch(): void {
    const input = document.querySelector<HTMLInputElement>('[data-testid="ged-list-search"]');
    if (input) {
      input.focus();
      input.select();
    }
  }

  canManageGed(): boolean {
    return this.authService.hasRole('ADMIN', 'QUALITY_MANAGER');
  }

  canCreateGedDocument(): boolean {
    return this.canManageGed() || this.authService.hasRole('EMPLOYEE');
  }

  canCreateDocumentFromSelection(): boolean {
    return !!this.workspace.selectedFolderId();
  }

  canViewAuditLogs(): boolean {
    return this.authService.hasRole('ADMIN');
  }

  openCreateFolder(): void {
    this.workspace.showFolderModal.set(true);
  }

  openCreateDocument(): void {
    if (!this.canCreateGedDocument() || !this.workspace.selectedFolderId()) {
      this.workspace.setFeedback('Selectionnez un dossier avant creation du document.', 'error');
      return;
    }
    this.workspace.showDocumentModal.set(true);
  }

  formatDate(value: string | undefined): string {
    if (!value) {
      return 'N/A';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return 'N/A';
    }
    return date.toLocaleString('fr-FR');
  }

  private loadFolders(): void {
    this.workspace.isLoadingFolders.set(true);
    this.subscriptions.add(
      this.documentService.getFoldersTree().subscribe({
        next: (folders) => {
          this.workspace.isLoadingFolders.set(false);
          const flat = this.flattenFolders(folders);
          this.workspace.folders.set(folders);
          this.workspace.flatFolders.set(flat);

          if (
            !this.workspace.selectedFolderId() ||
            !flat.some((f) => f.id === this.workspace.selectedFolderId())
          ) {
            this.workspace.selectedFolderId.set(this.resolvePreferredFolderId(flat));
          }
          this.refreshVisibleFolders(flat);
          this.syncFolderTreeState(flat);
        },
        error: () => {
          this.workspace.isLoadingFolders.set(false);
          this.workspace.setFeedback('Chargement des dossiers impossible.', 'error');
        },
      })
    );
  }

  private loadDocuments(): void {
    this.workspace.isLoadingDocuments.set(true);
    this.subscriptions.add(
      this.documentService
        .getDocuments({
          search: this.workspace.searchTerm().trim() || undefined,
          folderId: this.workspace.selectedFolderId() ?? undefined,
          category: this.workspace.selectedCategory() === 'ALL' ? undefined : this.workspace.selectedCategory(),
          confidentiality:
            this.workspace.selectedConfidentiality() === 'ALL'
              ? undefined
              : (this.workspace.selectedConfidentiality() as 'PUBLIC' | 'INTERNAL' | 'RESTRICTED' | 'CONFIDENTIAL'),
          page: 0,
          size: 300,
        })
        .subscribe({
          next: (documents) => {
            this.workspace.isLoadingDocuments.set(false);
            this.workspace.allDocuments.set(documents);
            this.refreshCategoryOptions(documents);
            this.applyDocumentPresentation();
          },
          error: () => {
            this.workspace.isLoadingDocuments.set(false);
            this.workspace.setFeedback('Chargement des documents impossible.', 'error');
          },
        })
    );
  }

  loadDocumentVersions(documentId: string): void {
    this.workspace.isLoadingVersions.set(true);
    this.subscriptions.add(
      this.documentService.getDocumentVersions(documentId).subscribe({
        next: (versions) => {
          this.workspace.isLoadingVersions.set(false);
          this.workspace.setVersions(documentId, versions);
        },
        error: (err) => {
          this.workspace.isLoadingVersions.set(false);
          this.workspace.setVersions(documentId, []);
          // 403/401 are expected for users without access - silent
          if (err?.status !== 403 && err?.status !== 401) {
            this.workspace.setFeedback('Chargement des versions impossible.', 'error');
          }
        },
      })
    );
  }

  loadDocumentAcl(documentId: string): void {
    this.workspace.isLoadingAcl.set(true);
    this.subscriptions.add(
      this.documentService.getDocumentAcl(documentId).subscribe({
        next: (acl) => {
          this.workspace.isLoadingAcl.set(false);
          this.workspace.setAcl(documentId, acl);
        },
        error: (err) => {
          this.workspace.isLoadingAcl.set(false);
          this.workspace.setAcl(documentId, { roles: [], services: [] });
          // 403/401 are expected when the user lacks ACL visibility - silent
        },
      })
    );
  }

  loadDocumentAuditLogs(documentId: string): void {
    this.workspace.isLoadingDocumentAudit.set(true);
    this.subscriptions.add(
      this.documentService
        .listAuditLogs({ entityId: documentId, page: 0, size: 50 })
        .subscribe({
          next: (response) => {
            this.workspace.isLoadingDocumentAudit.set(false);
            this.workspace.setDocumentAuditLogs(documentId, response.content || []);
          },
          error: (err) => {
            this.workspace.isLoadingDocumentAudit.set(false);
            this.workspace.setDocumentAuditLogs(documentId, []);
            // 403/401 are expected for non-admins - silent
          },
        })
    );
  }

  private refreshCategoryOptions(
    documents: ReadonlyArray<{ category?: { name?: string } }>
  ): void {
    const categories = Array.from(
      new Set(
        documents
          .map((doc) => (doc.category?.name || '').trim())
          .filter((value) => !!value)
      )
    ).sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));
    this.workspace.categoryOptions.set(categories);
    if (
      this.workspace.selectedCategory() !== 'ALL' &&
      !categories.includes(this.workspace.selectedCategory())
    ) {
      this.workspace.selectedCategory.set('ALL');
    }
  }

  private applyDocumentPresentation(): void {
    let prepared = [...this.workspace.allDocuments()];
    const tab = this.workspace.activeCategoryTab();
    prepared = prepared.filter((doc) => this.matchesCategoryTab(doc, tab));
    if (this.workspace.selectedStatus() !== 'ALL') {
      prepared = prepared.filter((doc) => doc.gedStatus === this.workspace.selectedStatus());
    }
    prepared = this.sortDocuments(prepared);
    this.workspace.totalDocumentsCount.set(prepared.length);

    const start = (this.workspace.currentPage() - 1) * this.workspace.pageSize();
    const end = start + this.workspace.pageSize();
    this.workspace.visibleDocuments.set(prepared.slice(start, end));

    this.ensureSelectedDocument();
  }

  private sortDocuments<T extends { title?: string; referenceCode?: string; updatedAt?: Date | string }>(
    documents: T[]
  ): T[] {
    const sort = this.workspace.selectedSortOption();
    return [...documents].sort((left, right) => {
      const compareText = (a: string, b: string): number =>
        a.localeCompare(b, 'fr', { sensitivity: 'base' });
      const compareDate = (a: Date | string | undefined, b: Date | string | undefined): number => {
        const ta = a ? new Date(a).getTime() : 0;
        const tb = b ? new Date(b).getTime() : 0;
        return ta - tb;
      };
      switch (sort) {
        case 'updatedAsc':
          return compareDate(left.updatedAt, right.updatedAt);
        case 'updatedDesc':
          return compareDate(right.updatedAt, left.updatedAt);
        case 'titleAsc':
          return compareText(left.title || '', right.title || '');
        case 'titleDesc':
          return compareText(right.title || '', left.title || '');
        case 'referenceAsc':
          return compareText(left.referenceCode || '', right.referenceCode || '');
        case 'referenceDesc':
          return compareText(right.referenceCode || '', left.referenceCode || '');
        default:
          return 0;
      }
    });
  }

  private matchesCategoryTab(
    doc: {
      category?: { name?: string };
      mainCategory?: string;
      subCategory?: string;
      categorieNom?: string;
      typeCategorie?: string;
      isArchived?: boolean;
      gedStatus?: string;
    },
    tabId: 'ALL' | 'PROCEDURES' | 'FORMULAIRES' | 'TECHNIQUES' | 'ARCHIVES'
  ): boolean {
    if (tabId === 'ALL') {
      return true;
    }
    const text = [
      doc.category?.name,
      doc.mainCategory,
      doc.subCategory,
      doc.categorieNom,
      doc.typeCategorie,
    ]
      .filter((v): v is string => !!v)
      .join(' ')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    const isArchive = doc.isArchived || doc.gedStatus === 'Archive' || doc.gedStatus === 'Obsolete';
    if (tabId === 'ARCHIVES') {
      return isArchive;
    }
    if (tabId === 'PROCEDURES') {
      return text.includes('procedure');
    }
    if (tabId === 'FORMULAIRES') {
      return text.includes('formulaire');
    }
    if (tabId === 'TECHNIQUES') {
      return text.includes('technique');
    }
    return true;
  }

  private ensureSelectedDocument(): void {
    const focused = this.workspace.focusedDocumentId();
    if (!focused) {
      return;
    }
    const all = this.workspace.allDocuments();
    const exists = all.some((doc) => doc.id === focused);
    if (!exists) {
      this.workspace.setFocusedDocument(null);
    }
  }

  private flattenFolders(
    nodes: GedFolderTreeNode[],
    depth = 0,
    ancestors: string[] = []
  ): FlatFolderNode[] {
    const flat: FlatFolderNode[] = [];
    for (const node of nodes) {
      const breadcrumbParts = [...ancestors, node.name];
      flat.push({
        id: node.id,
        name: node.name,
        parentId: node.parentId,
        category: node.category,
        archived: node.archived,
        documentCount: node.documentCount,
        depth,
        breadcrumb: breadcrumbParts.join(' / '),
      });
      flat.push(...this.flattenFolders(node.children || [], depth + 1, breadcrumbParts));
    }
    return flat;
  }

  private refreshVisibleFolders(flat: FlatFolderNode[]): void {
    if (flat.length === 0) {
      this.workspace.visibleFolders.set([]);
      return;
    }
    this.workspace.visibleFolders.set(
      flat.map((folder) => ({ ...folder, displayDepth: folder.depth }))
    );
  }

  private syncFolderTreeState(flat: FlatFolderNode[]): void {
    const validIds = new Set(flat.map((f) => f.id));
    const current = new Set(this.workspace.expandedFolderIds());
    for (const id of Array.from(current)) {
      if (!validIds.has(id)) {
        current.delete(id);
      }
    }
    const root = this.findGedRoot(flat);
    if (root) {
      current.add(root.id);
    }
    this.workspace.expandedFolderIds.set(current);
  }

  private findGedRoot(flat: FlatFolderNode[]): FlatFolderNode | null {
    return (
      flat.find((f) => !f.archived && f.name.trim().toUpperCase() === 'GED') ||
      flat.find((f) => !f.archived && f.depth === 0) ||
      flat[0] ||
      null
    );
  }

  private resolvePreferredFolderId(flat: FlatFolderNode[]): string | null {
    if (flat.length === 0) {
      return null;
    }
    const ged = this.findGedRoot(flat);
    if (ged) {
      return ged.id;
    }
    const withDocs = flat
      .filter((folder) => !folder.archived && folder.documentCount > 0)
      .sort((a, b) => b.documentCount - a.documentCount || a.depth - b.depth)[0];
    if (withDocs) {
      return withDocs.id;
    }
    return flat.find((f) => !f.archived)?.id || flat[0]?.id || null;
  }
}
