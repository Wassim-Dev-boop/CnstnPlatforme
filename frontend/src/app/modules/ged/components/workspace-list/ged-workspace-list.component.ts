import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GedWorkspaceService, type GedViewMode } from '../../services/ged-workspace.service';
import { GedPermissionsService } from '../../services/ged-permissions.service';
import { DocumentService, type GedConfidentialityLevel } from '../../../../core/services/document.service';
import type { Document } from '../../../../core/models';

interface CategoryChip {
  id: 'ALL' | 'PROCEDURES' | 'FORMULAIRES' | 'TECHNIQUES' | 'ARCHIVES';
  label: string;
}

@Component({
  selector: 'app-ged-workspace-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    <section
      class="cnstn-table-shell ged-panel flex h-full min-w-0 flex-col"
      data-testid="ged-workspace-list"
    >
      <div class="border-b border-gray-100 px-4 py-3">
        <div class="flex flex-wrap items-center gap-2">
          <div class="relative min-w-[180px] flex-1">
            <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <svg class="size-4" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M14.58 13.41L18 16.83L16.83 18L13.41 14.58C12.17 15.55 10.62 16.12 8.92 16.12C4.97 16.12 1.75 12.9 1.75 8.95C1.75 5 4.97 1.78 8.92 1.78C12.87 1.78 16.09 5 16.09 8.95C16.09 10.65 15.52 12.2 14.58 13.41Z" fill="currentColor"/>
              </svg>
            </span>
            <input
              data-testid="ged-list-search"
              [ngModel]="workspace.searchTerm()"
              (ngModelChange)="workspace.searchTerm.set($event)"
              (keyup.enter)="onApplySearch()"
              type="text"
              placeholder="Rechercher par titre, reference, categorie..."
              class="cnstn-input pl-9"
            />
          </div>

          <button type="button" (click)="onApplySearch()" class="cnstn-btn-primary">Rechercher</button>
          <button type="button" (click)="onResetFilters()" class="cnstn-btn-secondary">Reinitialiser</button>

          <span class="mx-2 hidden h-6 w-px bg-gray-200 sm:inline-block"></span>

          <div
            class="inline-flex shrink-0 overflow-hidden rounded-lg border border-gray-200"
            role="group"
            aria-label="Mode d'affichage"
          >
            <button
              *ngFor="let mode of viewModes"
              type="button"
              (click)="workspace.viewMode.set(mode.id)"
              [attr.aria-pressed]="workspace.viewMode() === mode.id"
              class="px-2.5 py-1.5 text-xs font-semibold transition"
              [ngClass]="workspace.viewMode() === mode.id
                ? 'bg-brand-500 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'"
              [attr.data-testid]="'ged-view-' + mode.id"
            >
              {{ mode.label }}
            </button>
          </div>

          <button
            type="button"
            (click)="workspace.showAdvancedFilters.set(!workspace.showAdvancedFilters())"
            class="cnstn-btn-secondary"
          >
            {{ workspace.showAdvancedFilters() ? 'Masquer filtres' : 'Filtres' }}
          </button>
        </div>

        <div *ngIf="workspace.showAdvancedFilters()" class="mt-3 grid grid-cols-1 gap-3 border-t border-gray-100 pt-3 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <label class="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Confidentialite</label>
            <select
              data-testid="ged-list-confidentiality"
              [ngModel]="workspace.selectedConfidentiality()"
              (ngModelChange)="workspace.selectedConfidentiality.set($event)"
              class="cnstn-select"
            >
              <option value="ALL">Toutes</option>
              <option *ngFor="let level of confidentialityLevels" [value]="level">{{ confidentialityLabel(level) }}</option>
            </select>
          </div>
          <div>
            <label class="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Statut</label>
            <select
              data-testid="ged-list-status"
              [ngModel]="workspace.selectedStatus()"
              (ngModelChange)="workspace.selectedStatus.set($event); workspace.currentPage.set(1)"
              class="cnstn-select"
            >
              <option *ngFor="let option of statusOptions" [ngValue]="option.value">{{ option.label }}</option>
            </select>
          </div>
          <div>
            <label class="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Categorie</label>
            <select
              data-testid="ged-list-category"
              [ngModel]="workspace.selectedCategory()"
              (ngModelChange)="workspace.selectedCategory.set($event); workspace.currentPage.set(1)"
              class="cnstn-select"
            >
              <option value="ALL">Toutes</option>
              <option *ngFor="let category of workspace.categoryOptions()" [value]="category">{{ category }}</option>
            </select>
          </div>
          <div>
            <label class="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Tri</label>
            <select
              data-testid="ged-list-sort"
              [ngModel]="workspace.selectedSortOption()"
              (ngModelChange)="workspace.selectedSortOption.set($event); workspace.currentPage.set(1)"
              class="cnstn-select"
            >
              <option value="updatedDesc">Date modification</option>
              <option value="updatedAsc">Date ancienne</option>
              <option value="titleAsc">Titre A-Z</option>
              <option value="titleDesc">Titre Z-A</option>
              <option value="referenceAsc">Reference A-Z</option>
              <option value="referenceDesc">Reference Z-A</option>
            </select>
          </div>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-2 border-b border-gray-100 px-4 py-2">
        <button
          *ngFor="let tab of categoryTabs"
          type="button"
          (click)="onSelectCategoryTab(tab.id)"
          class="inline-flex shrink-0 items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold transition"
          [ngClass]="workspace.activeCategoryTab() === tab.id
            ? 'border-brand-500 bg-brand-500 text-white'
            : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'"
        >
          <span>{{ tab.label }}</span>
          <span
            class="rounded-full px-1.5 py-0.5 text-[10px]"
            [ngClass]="workspace.activeCategoryTab() === tab.id
              ? 'bg-white/20 text-white'
              : 'bg-gray-100 text-gray-700'"
          >
            {{ categoryTabCount(tab.id) }}
          </span>
        </button>
      </div>

      <div *ngIf="workspace.isLoadingDocuments()" class="flex-1 px-4 py-12 text-center text-sm text-gray-500">
        <div class="mx-auto inline-flex items-center gap-2">
          <svg class="size-4 animate-spin text-gray-400" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <circle cx="10" cy="10" r="7" stroke="currentColor" stroke-width="2" stroke-opacity="0.25"/>
            <path d="M17 10a7 7 0 0 0-7-7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          Chargement des documents...
        </div>
      </div>

      <div
        *ngIf="!workspace.isLoadingDocuments() && workspace.visibleDocuments().length === 0"
        class="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center"
        data-testid="ged-empty-state"
      >
        <div class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
          <svg class="size-8 text-gray-400" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M5 4h11l3 3v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
            <path d="M8 11h8M8 15h6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
          </svg>
        </div>
        <h3 class="text-base font-semibold text-gray-900">Aucun document visible</h3>
        <p class="mt-1 max-w-md text-sm text-gray-500">
          <ng-container *ngIf="hasActiveFilters(); else noDocsInFolder">
            Aucun resultat ne correspond a vos filtres. Essayez d'elargir la recherche ou reinitialisez les filtres.
          </ng-container>
          <ng-template #noDocsInFolder>
            <ng-container *ngIf="folderHasHiddenDocuments(); else noDocsYet">
              Ce dossier contient des documents, mais aucun n'est visible pour vous actuellement.
              Cela peut etre parce qu'ils ne sont pas encore publies, ou parce que vos droits d'acces (ACL) ne vous y autorisent pas.
              <br>
              <span class="mt-1 inline-block text-xs text-gray-400">
                Astuce : les employes ne voient que les documents au statut "Publie".
              </span>
            </ng-container>
            <ng-template #noDocsYet>
              Ce dossier ne contient pas encore de document. Vous pouvez en creer un depuis le bouton "Nouveau document".
            </ng-template>
          </ng-template>
        </p>
        <div class="mt-4 flex flex-wrap items-center justify-center gap-2">
          <button
            *ngIf="hasActiveFilters()"
            type="button"
            (click)="onResetFilters()"
            class="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
          >
            Reinitialiser les filtres
          </button>
          <button
            *ngIf="!hasActiveFilters() && permissions.canCreateGedDocument() && workspace.selectedFolderId()"
            type="button"
            (click)="onCreateDocument()"
            class="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-600"
          >
            + Creer un document
          </button>
        </div>
      </div>

      <ng-container *ngIf="!workspace.isLoadingDocuments() && workspace.visibleDocuments().length > 0">
        <div *ngIf="workspace.viewMode() === 'list'" class="flex-1 space-y-2 overflow-auto p-4" data-testid="ged-list-mode-list">
          <article
            *ngFor="let doc of workspace.visibleDocuments(); trackBy: trackByDocumentId"
            class="ged-doc-card flex w-full items-start gap-3 rounded-xl border bg-white p-3 text-left transition"
            [ngClass]="workspace.focusedDocumentId() === doc.id
              ? 'border-brand-400 bg-brand-50/70 shadow-theme-xs'
              : 'border-gray-200 hover:border-brand-300 hover:bg-brand-50/40'"
            (click)="onSelectDocument(doc, $event)"
            tabindex="0"
            (keydown.enter)="onSelectDocument(doc, $event)"
          >
            <input
              type="checkbox"
              class="mt-1 size-4 shrink-0 cursor-pointer rounded border-gray-300 text-brand-500 focus:ring-brand-500"
              [checked]="workspace.isDocumentSelected(doc.id)"
              (click)="onToggleSelection(doc.id, $event)"
              (change)="onToggleSelection(doc.id, $event)"
              [attr.aria-label]="'Selectionner ' + doc.title"
            />
            <div class="min-w-0 flex-1">
              <div class="mb-1 flex flex-wrap items-center gap-2">
                <span class="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-700">{{ doc.referenceCode }}</span>
                <span class="rounded-full px-2 py-0.5 text-[11px] font-semibold" [ngClass]="getStatusClass(doc.gedStatus)">
                  {{ doc.gedStatus }}
                </span>
                <span class="rounded-full px-2 py-0.5 text-[11px] font-semibold" [ngClass]="getConfidentialityClass(doc.confidentialityLevel || 'INTERNAL')">
                  {{ formatConfidentialityLabel(doc.confidentialityLevel || 'INTERNAL') }}
                </span>
              </div>
              <h3 class="truncate text-sm font-semibold text-gray-900" [attr.title]="doc.title">{{ doc.title }}</h3>
              <p class="mt-0.5 text-xs text-gray-500">
                {{ doc.category?.name || 'General' }} • v{{ doc.currentVersionNumber || 1 }} • {{ formatDate(doc.updatedAt) }}
              </p>
            </div>
            <div class="flex shrink-0 flex-col items-end gap-1">
              <button
                type="button"
                (click)="onPreview(doc); $event.stopPropagation()"
                class="rounded-md bg-brand-500 px-2 py-1 text-[11px] font-semibold text-white hover:bg-brand-600"
              >
                Consulter
              </button>
              <button
                type="button"
                (click)="onDownload(doc); $event.stopPropagation()"
                class="rounded-md border border-gray-300 px-2 py-1 text-[11px] font-semibold text-gray-700 hover:bg-gray-50"
              >
                Telecharger
              </button>
            </div>
          </article>
        </div>

        <div *ngIf="workspace.viewMode() === 'grid'" class="grid flex-1 auto-rows-min grid-cols-1 gap-3 overflow-auto p-4 sm:grid-cols-2 xl:grid-cols-3" data-testid="ged-list-mode-grid">
          <article
            *ngFor="let doc of workspace.visibleDocuments(); trackBy: trackByDocumentId"
            class="ged-doc-card flex flex-col gap-2 rounded-xl border bg-white p-3 text-left transition"
            [ngClass]="workspace.focusedDocumentId() === doc.id
              ? 'border-brand-400 bg-brand-50/70 shadow-theme-xs'
              : 'border-gray-200 hover:border-brand-300 hover:bg-brand-50/40'"
            (click)="onSelectDocument(doc, $event)"
            tabindex="0"
            (keydown.enter)="onSelectDocument(doc, $event)"
          >
            <div class="flex items-start justify-between gap-2">
              <span class="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-700">{{ doc.referenceCode }}</span>
              <input
                type="checkbox"
                class="size-4 cursor-pointer rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                [checked]="workspace.isDocumentSelected(doc.id)"
                (click)="onToggleSelection(doc.id, $event)"
                (change)="onToggleSelection(doc.id, $event)"
              />
            </div>
            <h3 class="truncate text-sm font-semibold text-gray-900" [attr.title]="doc.title">{{ doc.title }}</h3>
            <div class="flex flex-wrap gap-1">
              <span class="rounded-full px-2 py-0.5 text-[11px] font-semibold" [ngClass]="getStatusClass(doc.gedStatus)">{{ doc.gedStatus }}</span>
              <span class="rounded-full px-2 py-0.5 text-[11px] font-semibold" [ngClass]="getConfidentialityClass(doc.confidentialityLevel || 'INTERNAL')">
                {{ formatConfidentialityLabel(doc.confidentialityLevel || 'INTERNAL') }}
              </span>
            </div>
            <p class="text-[11px] text-gray-500">{{ formatDate(doc.updatedAt) }} • v{{ doc.currentVersionNumber || 1 }}</p>
            <div class="mt-auto flex gap-1">
              <button type="button" (click)="onPreview(doc); $event.stopPropagation()" class="flex-1 rounded-md bg-brand-500 px-2 py-1 text-[11px] font-semibold text-white hover:bg-brand-600">Consulter</button>
              <button type="button" (click)="onDownload(doc); $event.stopPropagation()" class="rounded-md border border-gray-300 px-2 py-1 text-[11px] font-semibold text-gray-700 hover:bg-gray-50">↓</button>
            </div>
          </article>
        </div>

        <div *ngIf="workspace.viewMode() === 'table'" class="flex-1 overflow-auto" data-testid="ged-list-mode-table">
          <table class="min-w-full divide-y divide-gray-200 text-sm">
            <thead class="sticky top-0 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th class="w-8 px-3 py-2 text-left">
                  <input
                    type="checkbox"
                    class="size-4 cursor-pointer rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                    [checked]="allVisibleSelected()"
                    (change)="onToggleAllVisible($event)"
                    aria-label="Tout selectionner"
                  />
                </th>
                <th class="px-3 py-2 text-left">Reference</th>
                <th class="px-3 py-2 text-left">Titre</th>
                <th class="px-3 py-2 text-left">Statut</th>
                <th class="px-3 py-2 text-left">Confidentialite</th>
                <th class="px-3 py-2 text-left">Modifie le</th>
                <th class="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr
                *ngFor="let doc of workspace.visibleDocuments(); trackBy: trackByDocumentId"
                class="cursor-pointer transition hover:bg-gray-50"
                [ngClass]="workspace.focusedDocumentId() === doc.id ? 'bg-brand-50/70' : ''"
                (click)="onSelectDocument(doc, $event)"
              >
                <td class="px-3 py-2">
                  <input
                    type="checkbox"
                    class="size-4 cursor-pointer rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                    [checked]="workspace.isDocumentSelected(doc.id)"
                    (click)="onToggleSelection(doc.id, $event)"
                    (change)="onToggleSelection(doc.id, $event)"
                  />
                </td>
                <td class="px-3 py-2 font-mono text-xs text-gray-700">{{ doc.referenceCode }}</td>
                <td class="px-3 py-2 font-medium text-gray-900">{{ doc.title }}</td>
                <td class="px-3 py-2">
                  <span class="rounded-full px-2 py-0.5 text-[11px] font-semibold" [ngClass]="getStatusClass(doc.gedStatus)">{{ doc.gedStatus }}</span>
                </td>
                <td class="px-3 py-2">
                  <span class="rounded-full px-2 py-0.5 text-[11px] font-semibold" [ngClass]="getConfidentialityClass(doc.confidentialityLevel || 'INTERNAL')">
                    {{ formatConfidentialityLabel(doc.confidentialityLevel || 'INTERNAL') }}
                  </span>
                </td>
                <td class="px-3 py-2 text-xs text-gray-600">{{ formatDate(doc.updatedAt) }}</td>
                <td class="px-3 py-2 text-right">
                  <button type="button" (click)="onPreview(doc); $event.stopPropagation()" class="rounded-md bg-brand-500 px-2 py-1 text-[11px] font-semibold text-white hover:bg-brand-600">Voir</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </ng-container>

      <div class="flex flex-col gap-2 border-t border-gray-100 px-4 py-2 sm:flex-row sm:items-center sm:justify-between">
        <p class="text-xs text-gray-600">
          Affichage {{ rangeStart() }}-{{ rangeEnd() }} sur {{ workspace.totalDocumentsCount() }} documents
        </p>
        <div class="flex items-center gap-1">
          <button type="button" (click)="prevPage()" [disabled]="!canPrevPage()" class="rounded-md border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50">Precedent</button>
          <button
            *ngFor="let page of paginationPages()"
            type="button"
            (click)="goToPage(page)"
            class="rounded-md border px-2 py-1 text-xs font-semibold transition"
            [ngClass]="page === workspace.currentPage()
              ? 'border-brand-500 bg-brand-500 text-white'
              : 'border-gray-300 text-gray-700 hover:bg-gray-50'"
          >
            {{ page }}
          </button>
          <button type="button" (click)="nextPage()" [disabled]="!canNextPage()" class="rounded-md border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50">Suivant</button>
        </div>
      </div>
    </section>
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100%;
      }
    `,
  ],
})
export class GedWorkspaceListComponent {
  readonly workspace = inject(GedWorkspaceService);
  private readonly documentService = inject(DocumentService);
  readonly permissions = inject(GedPermissionsService);

  readonly viewModes: ReadonlyArray<{ id: GedViewMode; label: string }> = [
    { id: 'list', label: '☰ Liste' },
    { id: 'grid', label: '▦ Grille' },
    { id: 'table', label: '▤ Table' },
  ];

  readonly confidentialityLevels: GedConfidentialityLevel[] = [
    'PUBLIC',
    'INTERNAL',
    'RESTRICTED',
    'CONFIDENTIAL',
  ];

  readonly statusOptions: ReadonlyArray<{ value: Document['gedStatus'] | 'ALL'; label: string }> = [
    { value: 'ALL', label: 'Tous les statuts' },
    { value: 'Brouillon', label: 'Brouillon' },
    { value: 'En attente qualite', label: 'En attente qualite' },
    { value: 'Valide qualite', label: 'Valide qualite' },
    { value: 'Valide qualite (publiable)', label: 'Valide qualite (publiable)' },
    { value: 'Publie', label: 'Publie' },
    { value: 'Refuse', label: 'Refuse' },
    { value: 'Archive', label: 'Archive' },
    { value: 'Obsolete', label: 'Obsolete' },
  ];

  readonly categoryTabs: CategoryChip[] = [
    { id: 'ALL', label: 'Tous' },
    { id: 'PROCEDURES', label: 'Procedures' },
    { id: 'FORMULAIRES', label: 'Formulaires' },
    { id: 'TECHNIQUES', label: 'Techniques' },
    { id: 'ARCHIVES', label: 'Archives' },
  ];

  readonly allVisibleSelected = computed(() => {
    const visible = this.workspace.visibleDocuments();
    if (visible.length === 0) {
      return false;
    }
    return visible.every((doc) => this.workspace.isDocumentSelected(doc.id));
  });

  trackByDocumentId(_index: number, doc: Document): string {
    return doc.id;
  }

  onApplySearch(): void {
    this.workspace.currentPage.set(1);
  }

  onResetFilters(): void {
    this.workspace.resetFilters();
  }

  hasActiveFilters(): boolean {
    return (
      this.workspace.searchTerm().trim().length > 0 ||
      this.workspace.selectedStatus() !== 'ALL' ||
      this.workspace.selectedCategory() !== 'ALL' ||
      this.workspace.selectedConfidentiality() !== 'ALL' ||
      this.workspace.activeCategoryTab() !== 'ALL'
    );
  }

  /**
   * If the current folder (in the sidebar tree) has documents according to the
   * backend count, but the list shows 0, then all of them are hidden from the
   * current user (by ACL or because they are not PUBLISHED). We surface this
   * to the user via a contextual message.
   */
  folderHasHiddenDocuments(): boolean {
    const selectedId = this.workspace.selectedFolderId();
    if (!selectedId) {
      return false;
    }
    const folder = this.workspace.flatFolders().find((f) => f.id === selectedId);
    if (!folder) {
      return false;
    }
    // If the sidebar reports documents exist here but the user can see none
    // and no filter is active, then they are all hidden by ACL/status.
    return folder.documentCount > 0 && this.workspace.visibleDocuments().length === 0;
  }

  onCreateDocument(): void {
    if (!this.permissions.canCreateGedDocument() || !this.workspace.selectedFolderId()) {
      this.workspace.setFeedback('Selectionnez un dossier avant creation du document.', 'error');
      return;
    }
    this.workspace.showDocumentModal.set(true);
  }

  onSelectCategoryTab(tabId: CategoryChip['id']): void {
    this.workspace.activeCategoryTab.set(tabId);
    this.workspace.currentPage.set(1);
  }

  categoryTabCount(tabId: CategoryChip['id']): number {
    return this.workspace.allDocuments().filter((doc) => this.matchesCategoryTab(doc, tabId)).length;
  }

  onSelectDocument(doc: Document, event?: Event): void {
    event?.stopPropagation();
    this.workspace.setFocusedDocument(doc.id);
  }

  onToggleSelection(documentId: string, event: Event): void {
    event.stopPropagation();
    const additive = event instanceof MouseEvent ? (event.ctrlKey || event.metaKey) : false;
    this.workspace.toggleDocumentSelection(documentId, additive);
  }

  onToggleAllVisible(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      this.workspace.selectAllVisible();
    } else {
      this.workspace.clearSelection();
    }
  }

  onPreview(doc: Document): void {
    this.workspace.setFocusedDocument(doc.id);
    this.workspace.showPreviewModal.set(true);
  }

  onDownload(doc: Document): void {
    this.documentService.downloadDocumentBinary(doc.id).subscribe({
      next: ({ content, fileName }) => {
        const url = URL.createObjectURL(content);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = fileName || `${doc.referenceCode || doc.title}.txt`;
        anchor.click();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
        this.workspace.setFeedback('Document telecharge avec succes.', 'success');
      },
      error: () => {
        this.workspace.setFeedback('Telechargement impossible.', 'error');
      },
    });
  }

  rangeStart(): number {
    if (this.workspace.totalDocumentsCount() === 0) {
      return 0;
    }
    return (this.workspace.currentPage() - 1) * this.workspace.pageSize() + 1;
  }

  rangeEnd(): number {
    if (this.workspace.totalDocumentsCount() === 0) {
      return 0;
    }
    return Math.min(
      this.workspace.currentPage() * this.workspace.pageSize(),
      this.workspace.totalDocumentsCount()
    );
  }

  canPrevPage(): boolean {
    return this.workspace.currentPage() > 1;
  }

  canNextPage(): boolean {
    return this.workspace.currentPage() < this.workspace.totalPages();
  }

  prevPage(): void {
    if (!this.canPrevPage()) {
      return;
    }
    this.workspace.currentPage.set(this.workspace.currentPage() - 1);
  }

  nextPage(): void {
    if (!this.canNextPage()) {
      return;
    }
    this.workspace.currentPage.set(this.workspace.currentPage() + 1);
  }

  goToPage(page: number): void {
    const bounded = Math.max(1, Math.min(page, this.workspace.totalPages()));
    this.workspace.currentPage.set(bounded);
  }

  paginationPages(): number[] {
    const total = this.workspace.totalPages();
    const start = Math.max(1, this.workspace.currentPage() - 1);
    const end = Math.min(total, start + 2);
    const pages: number[] = [];
    for (let p = start; p <= end; p += 1) {
      pages.push(p);
    }
    return pages;
  }

  getStatusClass(status: Document['gedStatus'] | undefined): string {
    switch (status) {
      case 'Publie':
        return 'bg-success-500/10 text-success-700';
      case 'Valide qualite':
      case 'Valide qualite (publiable)':
        return 'bg-brand-500/10 text-brand-700';
      case 'En attente qualite':
        return 'bg-warning-500/10 text-warning-700';
      case 'Refuse':
        return 'bg-error-500/10 text-error-700';
      case 'Archive':
        return 'bg-gray-200 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  }

  confidentialityLabel(level: GedConfidentialityLevel): string {
    return this.formatConfidentialityLabel(level);
  }

  getConfidentialityClass(level: GedConfidentialityLevel): string {
    switch (level) {
      case 'PUBLIC':
        return 'bg-success-500/10 text-success-700';
      case 'INTERNAL':
        return 'bg-gray-100 text-gray-700';
      case 'RESTRICTED':
        return 'bg-warning-500/10 text-warning-700';
      case 'CONFIDENTIAL':
        return 'bg-error-500/10 text-error-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  }

  formatConfidentialityLabel(level: GedConfidentialityLevel): string {
    const labels: Record<GedConfidentialityLevel, string> = {
      PUBLIC: 'Public',
      INTERNAL: 'Interne',
      RESTRICTED: 'Restreint',
      CONFIDENTIAL: 'Confidentiel',
    };
    return labels[level];
  }

  formatDate(value: Date | string | undefined): string {
    if (!value) {
      return 'N/A';
    }
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      return 'N/A';
    }
    return date.toLocaleDateString('fr-FR');
  }

  private matchesCategoryTab(document: Document, tabId: CategoryChip['id']): boolean {
    if (tabId === 'ALL') {
      return true;
    }
    const text = [
      document.category?.name,
      document.mainCategory,
      document.subCategory,
      document.categorieNom,
      document.typeCategorie,
    ]
      .filter((v): v is string => !!v)
      .join(' ')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    const isArchive =
      document.isArchived || document.gedStatus === 'Archive' || document.gedStatus === 'Obsolete';
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
}
