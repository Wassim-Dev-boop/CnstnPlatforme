import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { GedWorkspaceService, type FlatFolderNode, type VisibleFolderNode } from '../../services/ged-workspace.service';
import { GedPermissionsService } from '../../services/ged-permissions.service';
import { Document } from '../../../../core/models';

@Component({
  selector: 'app-ged-workspace-sidebar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <aside
      class="cnstn-card ged-panel flex h-full min-w-0 flex-col"
      data-testid="ged-workspace-sidebar"
    >
      <div class="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <div>
          <h2 class="text-sm font-semibold uppercase tracking-wide text-gray-600">Navigation</h2>
          <p class="text-xs text-gray-500">{{ visibleFolders().length }} dossier(s)</p>
        </div>
        <button
          *ngIf="permissions.canManageGed()"
          type="button"
          (click)="onCreateGedSubFolder()"
          [disabled]="!gedRootFolder()"
          class="rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs font-semibold text-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Sous-dossier
        </button>
      </div>

      <div class="ged-path-bar border-b border-gray-100 px-4 py-2">
        <ng-container *ngIf="breadcrumbs().length > 0; else noPath">
          <div class="flex flex-wrap items-center gap-1 text-xs">
            <ng-container *ngFor="let crumb of breadcrumbs(); let isLast = last">
              <button
                type="button"
                (click)="onSelectFolder(crumb.id)"
                class="rounded-md px-2 py-1 font-semibold transition"
                [ngClass]="isLast
                  ? 'bg-brand-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'"
              >
                {{ crumb.name }}
              </button>
              <span *ngIf="!isLast" class="text-gray-400">›</span>
            </ng-container>
          </div>
        </ng-container>
        <ng-template #noPath>
          <p class="text-xs text-gray-500">Selectionnez un dossier.</p>
        </ng-template>
      </div>

      <div class="max-h-[480px] flex-1 overflow-auto px-3 py-3">
        <div
          *ngIf="workspace.isLoadingFolders()"
          class="rounded-xl border border-dashed border-gray-300 px-3 py-8 text-center text-sm text-gray-500"
        >
          Chargement des dossiers...
        </div>

        <div
          *ngIf="!workspace.isLoadingFolders() && visibleFolders().length === 0"
          class="rounded-xl border border-dashed border-gray-300 px-3 py-8 text-center text-sm text-gray-500"
        >
          Aucun dossier disponible.
        </div>

        <div *ngFor="let folder of sidebarFolders(); trackBy: trackByFolderId" class="mb-1">
          <div
            class="rounded-lg px-1 py-0.5"
            [ngClass]="isGedRoot(folder) ? 'mb-2 border-b border-gray-100 pb-2' : 'hover:bg-gray-50'"
          >
            <div
              class="group flex w-full min-w-0 items-center gap-1 rounded-lg px-2 py-1.5 transition"
              [style.paddingLeft.px]="indentFor(folder)"
            >
              <button
                type="button"
                (click)="onToggleFolder(folder, $event)"
                class="inline-flex size-6 shrink-0 items-center justify-center rounded-md transition hover:bg-indigo-50 hover:text-indigo-700 disabled:cursor-default"
                [disabled]="!isFolderExpandable(folder)"
                [attr.aria-label]="isFolderExpanded(folder) ? 'Replier' : 'Deplier'"
                [attr.aria-expanded]="isFolderExpandable(folder) ? isFolderExpanded(folder) : null"
              >
                <svg
                  class="size-3.5 transition-transform duration-150"
                  [ngClass]="[
                    isFolderExpanded(folder) ? 'rotate-90 text-brand-600' : 'text-gray-400',
                    !isFolderExpandable(folder) ? 'opacity-0' : ''
                  ]"
                  viewBox="0 0 20 20"
                  fill="none"
                  aria-hidden="true"
                >
                  <path d="M7 5.5L12 10L7 14.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </button>

              <button
                type="button"
                [attr.data-testid]="'ged-folder-' + folder.id"
                (click)="onSelectFolder(folder.id)"
                class="group flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-left transition"
                [ngClass]="[
                  isGedRoot(folder) ? 'text-sm font-semibold' : 'text-sm',
                  workspace.selectedFolderId() === folder.id
                    ? 'border border-brand-300 bg-brand-50 text-brand-700'
                    : 'border border-transparent text-gray-700 hover:bg-white'
                ]"
                [attr.title]="folder.breadcrumb"
              >
                <svg class="size-4 shrink-0 text-gray-400 group-hover:text-brand-500" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="M2.5 5.25C2.5 4.14543 3.39543 3.25 4.5 3.25H8.25L9.83333 4.83333H15.5C16.6046 4.83333 17.5 5.72876 17.5 6.83333V14.5C17.5 15.6046 16.6046 16.5 15.5 16.5H4.5C3.39543 16.5 2.5 15.6046 2.5 14.5V5.25Z" stroke="currentColor" stroke-width="1.4"/>
                </svg>
                <span class="min-w-0 flex-1 truncate font-medium" [attr.title]="folder.breadcrumb">
                  {{ isGedRoot(folder) ? 'GED' : folder.name }}
                </span>
                <span class="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-600">
                  {{ folder.documentCount }}
                </span>
                <button
                  *ngIf="canEditFolder(folder)"
                  type="button"
                  (click)="onRequestEditFolder($event, folder)"
                  class="shrink-0 rounded-md p-1 text-gray-400 opacity-0 transition hover:bg-amber-50 hover:text-amber-600 group-hover:opacity-100 focus:opacity-100"
                  [attr.aria-label]="'Modifier le dossier ' + folder.name"
                  [attr.data-testid]="'ged-edit-folder-' + folder.id"
                  title="Modifier ce dossier"
                >
                  <svg class="size-3.5" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M11.5 2.5l2 2-7.5 7.5H4v-2l7.5-7.5zM10 4l2 2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </button>
                <button
                  *ngIf="canDeleteFolder(folder)"
                  type="button"
                  (click)="onRequestDeleteFolder($event, folder)"
                  class="shrink-0 rounded-md p-1 text-gray-400 opacity-0 transition hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 focus:opacity-100"
                  [attr.aria-label]="'Supprimer le dossier ' + folder.name"
                  [attr.data-testid]="'ged-delete-folder-' + folder.id"
                  title="Supprimer ce dossier (archivage recursif)"
                >
                  <svg class="size-3.5" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M3 4.5h10M6.5 4.5V3.25A.75.75 0 0 1 7.25 2.5h1.5a.75.75 0 0 1 .75.75V4.5M4.5 4.5l.7 8.5a1 1 0 0 0 1 .92h3.6a1 1 0 0 0 1-.92l.7-8.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </button>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div *ngIf="recents().length > 0" class="border-t border-gray-100 px-4 py-3">
        <div class="flex items-center justify-between">
          <h3 class="text-xs font-semibold uppercase tracking-wide text-gray-500">Documents recents</h3>
          <button
            type="button"
            (click)="onClearRecents()"
            class="text-[11px] font-semibold text-gray-400 hover:text-gray-700"
            title="Effacer l'historique"
          >
            Effacer
          </button>
        </div>
        <ul class="mt-2 space-y-1">
          <li
            *ngFor="let doc of recents()"
            class="flex items-center gap-2 rounded-md px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
            [ngClass]="workspace.focusedDocumentId() === doc.id ? 'bg-brand-50 text-brand-800' : ''"
          >
            <svg class="size-3.5 shrink-0 text-gray-400" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M10 4a6 6 0 1 0 3.5 10.79l-1.21-1.21A4 4 0 1 1 14 10h2l-3 3-3-3h2a4 4 0 0 0-3.87-3H10Z" fill="currentColor"/>
            </svg>
            <button
              type="button"
              (click)="onSelectDocument(doc.id)"
              class="flex-1 truncate text-left font-medium"
              [attr.title]="doc.title"
            >
              {{ doc.title }}
            </button>
          </li>
        </ul>
      </div>

      <div *ngIf="pinned().length > 0" class="border-t border-gray-100 px-4 py-3">
        <h3 class="text-xs font-semibold uppercase tracking-wide text-gray-500">Epingles recemment</h3>
        <ul class="mt-2 space-y-1">
          <li
            *ngFor="let doc of pinned()"
            class="flex items-center gap-2 rounded-md px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
          >
            <svg class="size-3.5 text-gray-400" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M10 3.5l1.5 4 4.5 0.5-3.5 3 1 4.5L10 13l-3.5 2.5 1-4.5-3.5-3 4.5-0.5 1.5-4Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" />
            </svg>
            <button
              type="button"
              (click)="onSelectDocument(doc.id)"
              class="flex-1 truncate text-left font-medium"
              [attr.title]="doc.title"
            >
              {{ doc.title }}
            </button>
            <button
              type="button"
              (click)="onUnpin(doc.id)"
              class="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              [attr.aria-label]="'Retirer ' + doc.title"
            >
              ×
            </button>
          </li>
        </ul>
      </div>
    </aside>
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
export class GedWorkspaceSidebarComponent {
  readonly workspace = inject(GedWorkspaceService);
  readonly permissions = inject(GedPermissionsService);

  readonly visibleFolders = this.workspace.visibleFolders;
  readonly sidebarFolders = computed<VisibleFolderNode[]>(() => {
    const root = this.gedRootFolder();
    if (!root) {
      return this.visibleFolders();
    }
    return this.visibleFolders().filter((folder) => this.isDescendantOf(folder.id, root.id));
  });

  readonly breadcrumbs = computed<FlatFolderNode[]>(() => {
    const selectedId = this.workspace.selectedFolderId();
    if (!selectedId) {
      return [];
    }
    const byId = new Map(this.workspace.flatFolders().map((folder) => [folder.id, folder]));
    const path: FlatFolderNode[] = [];
    let current: FlatFolderNode | undefined = byId.get(selectedId);
    while (current) {
      path.unshift(current);
      if (!current.parentId) {
        break;
      }
      current = byId.get(current.parentId);
    }
    return path;
  });

  readonly pinned = computed<Document[]>(() => {
    const ids = this.workspace.pinnedDocumentIds();
    const docs = this.workspace.allDocuments();
    return ids
      .map((id) => docs.find((doc) => doc.id === id))
      .filter((doc): doc is Document => !!doc);
  });

  readonly recents = computed<Document[]>(() => {
    const ids = this.workspace.recentDocumentIds();
    const docs = this.workspace.allDocuments();
    return ids
      .map((id) => docs.find((doc) => doc.id === id))
      .filter((doc): doc is Document => !!doc);
  });

  trackByFolderId(_index: number, folder: VisibleFolderNode): string {
    return folder.id;
  }

  gedRootFolder(): VisibleFolderNode | null {
    const folders = this.visibleFolders();
    const root = folders.find(
      (folder) => !folder.archived && folder.name.trim().toUpperCase() === 'GED'
    );
    return root ?? folders.find((folder) => !folder.archived && folder.depth === 0) ?? null;
  }

  isGedRoot(folder: VisibleFolderNode): boolean {
    return folder.id === this.gedRootFolder()?.id;
  }

  isFolderExpandable(folder: VisibleFolderNode): boolean {
    return this.workspace.isFolderExpandable(folder);
  }

  isFolderExpanded(folder: VisibleFolderNode): boolean {
    return this.workspace.isFolderExpanded(folder.id);
  }

  indentFor(folder: VisibleFolderNode): number {
    if (this.isGedRoot(folder)) {
      return 4;
    }
    return 10 + Math.max(0, folder.displayDepth - 1) * 14;
  }

  onSelectFolder(folderId: string): void {
    this.workspace.selectedFolderId.set(folderId);
    this.workspace.expandFolderAncestors(folderId);
    this.workspace.currentPage.set(1);
  }

  canDeleteFolder(folder: VisibleFolderNode): boolean {
    if (!this.permissions.canManageGed()) {
      return false;
    }
    if (this.isGedRoot(folder)) {
      return false;
    }
    return true;
  }

  onRequestDeleteFolder(event: MouseEvent, folder: VisibleFolderNode): void {
    event.stopPropagation();
    event.preventDefault();
    this.workspace.requestFolderDeletion(folder);
  }

  canEditFolder(folder: VisibleFolderNode): boolean {
    if (!this.permissions.canManageGed()) {
      return false;
    }
    if (this.isGedRoot(folder)) {
      return false;
    }
    return true;
  }

  onRequestEditFolder(event: MouseEvent, folder: VisibleFolderNode): void {
    event.stopPropagation();
    event.preventDefault();
    this.workspace.requestFolderEdition(folder);
  }

  onToggleFolder(folder: VisibleFolderNode, event: MouseEvent): void {
    event.stopPropagation();
    if (!this.isFolderExpandable(folder)) {
      return;
    }
    this.workspace.toggleFolderExpansion(folder.id);
  }

  onCreateGedSubFolder(): void {
    const root = this.gedRootFolder();
    if (!root) {
      return;
    }
    this.workspace.selectedFolderId.set(root.id);
    this.workspace.showFolderModal.set(true);
  }

  onSelectDocument(documentId: string): void {
    this.workspace.setFocusedDocument(documentId);
    this.workspace.pinDocument(documentId);
  }

  onUnpin(documentId: string): void {
    this.workspace.unpinDocument(documentId);
  }

  onClearRecents(): void {
    this.workspace.clearRecentDocuments();
  }

  private isDescendantOf(folderId: string, ancestorId: string): boolean {
    const folders = this.workspace.flatFolders();
    const byId = new Map(folders.map((folder) => [folder.id, folder]));
    let current: FlatFolderNode | undefined = byId.get(folderId);
    while (current) {
      if (current.id === ancestorId) {
        return true;
      }
      current = current.parentId ? byId.get(current.parentId) : undefined;
    }
    return false;
  }
}
