import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { GedWorkspaceService } from '../../services/ged-workspace.service';
import { GedPermissionsService } from '../../services/ged-permissions.service';
import { DocumentService } from '../../../../core/services/document.service';

@Component({
  selector: 'app-ged-bulk-actions-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div
      *ngIf="workspace.hasSelection()"
      class="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-2 shadow-lg"
      data-testid="ged-bulk-actions-bar"
    >
      <span class="rounded-full bg-brand-500 px-3 py-1 text-xs font-semibold text-white">
        {{ selectionCount() }} selectionne(s)
      </span>
      <button
        *ngIf="permissions.canManageGed()"
        type="button"
        (click)="onBulkSubmit()"
        class="rounded-full border border-warning-200 bg-warning-50 px-3 py-1 text-xs font-semibold text-warning-700 hover:bg-warning-100"
      >
        Soumettre en lot
      </button>
      <button
        *ngIf="permissions.canManageGed()"
        type="button"
        (click)="onBulkApprove()"
        class="rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-100"
      >
        Valider en lot
      </button>
      <button
        *ngIf="permissions.canManageGed() && permissions.canPublish()"
        type="button"
        (click)="onBulkPublish()"
        class="rounded-full border border-success-200 bg-success-50 px-3 py-1 text-xs font-semibold text-success-700 hover:bg-success-100"
      >
        Publier en lot
      </button>
      <button
        *ngIf="permissions.canManageGed()"
        type="button"
        (click)="onBulkArchive()"
        class="rounded-full border border-error-200 bg-error-50 px-3 py-1 text-xs font-semibold text-error-700 hover:bg-error-100"
      >
        Archiver en lot
      </button>
      <button
        type="button"
        (click)="onClearSelection()"
        class="rounded-full border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
      >
        Effacer
      </button>
    </div>
  `,
  styles: [
    `
      :host {
        display: contents;
      }
    `,
  ],
})
export class GedBulkActionsBarComponent {
  readonly workspace = inject(GedWorkspaceService);
  private readonly documentService = inject(DocumentService);
  readonly permissions = inject(GedPermissionsService);

  readonly selectionCount = computed(() => this.workspace.selectedDocumentIds().size);

  onBulkSubmit(): void {
    const ids = Array.from(this.workspace.selectedDocumentIds());
    this.runBulk(ids, 'submitWorkflow', 'Soumission en lot lancee.');
  }

  onBulkApprove(): void {
    const ids = Array.from(this.workspace.selectedDocumentIds());
    this.runBulk(ids, 'approveDocument', 'Validation en lot lancee.');
  }

  onBulkPublish(): void {
    const ids = Array.from(this.workspace.selectedDocumentIds());
    this.runBulk(ids, 'publishDocument', 'Publication en lot lancee.');
  }

  onBulkArchive(): void {
    const ids = Array.from(this.workspace.selectedDocumentIds());
    this.runBulk(ids, 'archiveDocument', 'Archivage en lot lance.');
  }

  onClearSelection(): void {
    this.workspace.clearSelection();
  }

  private runBulk(
    ids: string[],
    method:
      | 'submitWorkflow'
      | 'approveDocument'
      | 'publishDocument'
      | 'archiveDocument',
    successMessage: string
  ): void {
    if (ids.length === 0) {
      return;
    }
    if (!confirm(`Confirmer l'action en lot sur ${ids.length} document(s) ?`)) {
      return;
    }
    let processed = 0;
    let failed = 0;
    for (const id of ids) {
      const obs = this.documentService[method](id);
      obs.subscribe({
        next: () => {
          processed += 1;
          if (processed + failed === ids.length) {
            this.workspace.setFeedback(
              failed === 0 ? successMessage : `${processed} succes, ${failed} echecs.`,
              failed === 0 ? 'success' : 'error'
            );
            this.workspace.clearSelection();
          }
        },
        error: () => {
          failed += 1;
          if (processed + failed === ids.length) {
            this.workspace.setFeedback(`${processed} succes, ${failed} echecs.`, 'error');
            this.workspace.clearSelection();
          }
        },
      });
    }
  }
}
