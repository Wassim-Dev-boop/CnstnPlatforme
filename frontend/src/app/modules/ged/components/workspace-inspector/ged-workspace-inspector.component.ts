import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject
} from '@angular/core';
import { GedWorkspaceService, type GedInspectorTab } from '../../services/ged-workspace.service';
import { GedPermissionsService } from '../../services/ged-permissions.service';
import { DocumentService, GedAuditLogEntry } from '../../../../core/services/document.service';
import type { Document } from '../../../../core/models';

interface InspectorTab {
  id: GedInspectorTab;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-ged-workspace-inspector',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <aside
      class="cnstn-card ged-panel flex h-full min-w-0 flex-col"
      data-testid="ged-workspace-inspector"
    >
      <div class="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <div>
          <h2 class="text-sm font-semibold uppercase tracking-wide text-gray-600">Inspecteur</h2>
          <p class="text-xs text-gray-500" *ngIf="document() as doc">
            {{ doc.referenceCode || 'REF-N/A' }}
          </p>
          <p class="text-xs text-gray-500" *ngIf="!document()">Aucun document selectionne</p>
        </div>
        <button
          *ngIf="document()"
          type="button"
          (click)="onPreview()"
          class="rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
        >
          Consulter
        </button>
      </div>

      <div *ngIf="!document()" class="flex-1 px-4 py-8 text-center text-sm text-gray-500">
        Selectionnez un document dans la liste pour afficher ses details.
      </div>

      <ng-container *ngIf="document() as doc">
        <div class="flex border-b border-gray-100 px-2">
          <button
            *ngFor="let tab of visibleTabs"
            type="button"
            (click)="workspace.activeInspectorTab.set(tab.id)"
            class="flex-1 border-b-2 px-2 py-2 text-xs font-semibold transition"
            [ngClass]="workspace.activeInspectorTab() === tab.id
              ? 'border-brand-500 text-brand-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'"
            [attr.data-testid]="'ged-inspector-tab-' + tab.id"
          >
            {{ tab.label }}
          </button>
        </div>

        <div class="flex-1 overflow-auto p-4">
          <ng-container *ngIf="workspace.activeInspectorTab() === 'meta'">
            <div class="space-y-3">
              <div class="rounded-xl border border-gray-200 bg-gray-50 p-3">
                <p class="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{{ doc.referenceCode || 'REF-N/A' }}</p>
                <p class="mt-1 text-base font-semibold text-gray-900">{{ doc.title }}</p>
                <div class="mt-2 flex flex-wrap gap-2">
                  <span class="rounded-full px-2 py-0.5 text-[11px] font-semibold" [ngClass]="getStatusClass(doc.gedStatus)">{{ doc.gedStatus }}</span>
                  <span class="rounded-full px-2 py-0.5 text-[11px] font-semibold" [ngClass]="getConfidentialityClass(doc.confidentialityLevel || 'INTERNAL')">
                    {{ formatConfidentialityLabel(doc.confidentialityLevel || 'INTERNAL') }}
                  </span>
                  <span class="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-700">v{{ doc.currentVersionNumber || 1 }}</span>
                </div>
              </div>
              <dl class="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div class="rounded-lg border border-gray-200 bg-white px-3 py-2">
                  <dt class="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Categorie</dt>
                  <dd class="mt-1 text-sm font-semibold text-gray-800">{{ doc.category?.name || 'N/A' }}</dd>
                </div>
                <div class="rounded-lg border border-gray-200 bg-white px-3 py-2">
                  <dt class="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Sous-categorie</dt>
                  <dd class="mt-1 text-sm font-semibold text-gray-800">{{ doc.subCategory || 'Non definie' }}</dd>
                </div>
                <div class="rounded-lg border border-gray-200 bg-white px-3 py-2">
                  <dt class="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Dossier</dt>
                  <dd class="mt-1 text-sm font-semibold text-gray-800">{{ workspace.selectedDocumentFolderLabel() }}</dd>
                </div>
                <div class="rounded-lg border border-gray-200 bg-white px-3 py-2">
                  <dt class="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Modifie le</dt>
                  <dd class="mt-1 text-sm font-semibold text-gray-800">{{ formatDate(doc.updatedAt) }}</dd>
                </div>
                <div class="rounded-lg border border-gray-200 bg-white px-3 py-2 sm:col-span-2">
                  <dt class="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Service proprietaire</dt>
                  <dd class="mt-1 text-sm font-semibold text-gray-800">{{ doc.ownerService || 'N/A' }}</dd>
                </div>
              </dl>
              <div *ngIf="doc.description" class="rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-700">
                {{ doc.description }}
              </div>
            </div>
          </ng-container>

          <ng-container *ngIf="workspace.activeInspectorTab() === 'actions'">
            <div class="grid grid-cols-1 gap-2">
              <button
                type="button"
                (click)="onDownload()"
                [disabled]="!document()"
                class="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-800 transition hover:border-brand-300 hover:bg-brand-50"
              >
                <span class="inline-flex items-center gap-2">📥 Telecharger</span>
                <span class="text-xs text-gray-500">↓</span>
              </button>
              <button
                type="button"
                (click)="onPrint()"
                [disabled]="!document()"
                class="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-800 transition hover:border-brand-300 hover:bg-brand-50"
              >
                <span class="inline-flex items-center gap-2">🖨️ Imprimer</span>
                <span class="text-xs text-gray-500">→</span>
              </button>
              <button
                *ngIf="permissions.canSubmit(doc)"
                type="button"
                (click)="onSubmit()"
                class="flex items-center justify-between rounded-lg border border-warning-200 bg-warning-50 px-3 py-2 text-sm font-semibold text-warning-700 transition hover:bg-warning-100"
              >
                <span>📤 Soumettre</span>
              </button>
              <button
                *ngIf="permissions.canApprove(doc)"
                type="button"
                (click)="onApprove()"
                class="flex items-center justify-between rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-700 transition hover:bg-brand-100"
              >
                <span>✓ Valider</span>
              </button>
              <button
                *ngIf="permissions.canPublishDocument(doc)"
                type="button"
                (click)="onPublish()"
                class="flex items-center justify-between rounded-lg border border-success-200 bg-success-50 px-3 py-2 text-sm font-semibold text-success-700 transition hover:bg-success-100"
              >
                <span>🌐 Publier</span>
              </button>
              <button
                *ngIf="permissions.canEditDocument()"
                type="button"
                (click)="onEdit()"
                class="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-800 transition hover:border-brand-300 hover:bg-brand-50"
              >
                <span>✏️ Editer</span>
              </button>
              <button
                *ngIf="permissions.canManageGed()"
                type="button"
                (click)="onOpenVersions()"
                class="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-800 transition hover:border-brand-300 hover:bg-brand-50"
              >
                <span>📚 Versions</span>
              </button>
              <button
                *ngIf="permissions.canManageGed()"
                type="button"
                (click)="onOpenAcl()"
                class="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-800 transition hover:border-brand-300 hover:bg-brand-50"
              >
                <span>🔐 Acces (ACL)</span>
              </button>
              <button
                *ngIf="permissions.canArchiveDocument(doc)"
                type="button"
                (click)="onArchive()"
                class="flex items-center justify-between rounded-lg border border-error-200 bg-error-50 px-3 py-2 text-sm font-semibold text-error-700 transition hover:bg-error-100"
              >
                <span>🗃️ Archiver</span>
              </button>
              <button
                *ngIf="permissions.canManageGed()"
                type="button"
                (click)="onDelete()"
                class="flex items-center justify-between rounded-lg border border-error-300 bg-white px-3 py-2 text-sm font-semibold text-error-800 transition hover:bg-error-50"
              >
                <span>🗑️ Supprimer</span>
              </button>
            </div>
          </ng-container>

          <ng-container *ngIf="workspace.activeInspectorTab() === 'versions'">
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <p class="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Historique des versions
                </p>
                <span class="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700">
                  v{{ doc.currentVersionNumber || 1 }} courante
                </span>
              </div>

              <div *ngIf="workspace.isLoadingVersions()" class="rounded-lg border border-gray-200 bg-gray-50 p-3 text-center text-xs text-gray-500">
                Chargement des versions...
              </div>

              <div *ngIf="!workspace.isLoadingVersions() && workspace.versionsLoadedFor() === doc.id && workspace.documentVersions().length === 0"
                   class="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-center text-xs text-gray-500">
                Aucune version supplementaire. Le document est en v{{ doc.currentVersionNumber || 1 }}.
              </div>

              <ol class="relative space-y-2 border-l-2 border-gray-200 pl-4">
                <li
                  *ngFor="let version of workspace.documentVersions(); let i = index; let isFirst = first"
                  class="relative"
                >
                  <span
                    class="absolute -left-[1.4rem] top-2 inline-flex h-3 w-3 rounded-full"
                    [ngClass]="isFirst ? 'bg-brand-500 ring-4 ring-brand-100' : 'bg-gray-300'"
                    [attr.aria-hidden]="true"
                  ></span>
                  <div
                    class="rounded-lg border p-3 transition"
                    [ngClass]="isFirst ? 'border-brand-300 bg-brand-50/50' : 'border-gray-200 bg-white hover:border-gray-300'"
                  >
                    <div class="flex items-center justify-between gap-2">
                      <div class="flex items-center gap-2">
                        <span class="text-sm font-semibold text-gray-900">v{{ version.versionNumber }}</span>
                        <span *ngIf="isFirst" class="rounded-full bg-brand-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                          Courante
                        </span>
                      </div>
                      <span class="text-[11px] text-gray-500">{{ formatDate(version.uploadedAt) }}</span>
                    </div>
                    <p *ngIf="version.changeLog" class="mt-1 text-xs text-gray-600">
                      {{ version.changeLog }}
                    </p>
                    <p *ngIf="!version.changeLog" class="mt-1 text-xs italic text-gray-400">
                      (aucune note de version)
                    </p>
                    <p *ngIf="version.uploadedBy" class="text-[11px] text-gray-500">
                      Par {{ version.uploadedBy }}
                    </p>
                    <div class="mt-2 flex items-center justify-between text-[11px] text-gray-500">
                      <span>{{ version.fileName || 'fichier' }}</span>
                      <span>{{ formatBytes(version.fileSize) }}</span>
                    </div>
                    <div class="mt-2 flex flex-wrap gap-1">
                      <button
                        type="button"
                        (click)="onPreviewVersion(version.versionNumber)"
                        class="rounded border border-gray-300 px-2 py-0.5 text-[11px] font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        Consulter
                      </button>
                      <button
                        type="button"
                        (click)="onDownloadVersion(version.versionNumber)"
                        class="rounded border border-gray-300 px-2 py-0.5 text-[11px] font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        Telecharger
                      </button>
                      <button
                        *ngIf="!isFirst && permissions.canManageGed()"
                        type="button"
                        (click)="onRestoreVersion(version.versionNumber)"
                        class="rounded border border-warning-300 bg-warning-50 px-2 py-0.5 text-[11px] font-semibold text-warning-700 hover:bg-warning-100"
                        title="Creer une nouvelle version a partir de celle-ci"
                      >
                        Restaurer
                      </button>
                    </div>
                  </div>
                </li>
              </ol>

              <button
                *ngIf="permissions.canEditDocument()"
                type="button"
                (click)="workspace.showVersionModal.set(true)"
                class="mt-2 w-full rounded-lg border border-dashed border-brand-300 bg-brand-50/50 px-3 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-100"
              >
                + Ajouter une nouvelle version
              </button>
            </div>
          </ng-container>

          <ng-container *ngIf="workspace.activeInspectorTab() === 'acl'">
            <div class="space-y-3">
              <p class="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Droits d'acces actuels
              </p>

              <div *ngIf="workspace.isLoadingAcl()" class="rounded-lg border border-gray-200 bg-gray-50 p-3 text-center text-xs text-gray-500">
                Chargement des ACL...
              </div>

              <ng-container *ngIf="!workspace.isLoadingAcl() && workspace.documentAcl() as acl">
                <div class="rounded-lg border border-gray-200 bg-white p-3">
                  <p class="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Roles autorises</p>
                  <div *ngIf="acl.roles.length === 0" class="mt-1 text-xs italic text-gray-500">Aucun role specifique</div>
                  <div *ngIf="acl.roles.length > 0" class="mt-2 flex flex-wrap gap-1">
                    <span *ngFor="let role of acl.roles"
                          class="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700">
                      {{ role }}
                    </span>
                  </div>
                </div>

                <div class="rounded-lg border border-gray-200 bg-white p-3">
                  <p class="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Services autorises</p>
                  <div *ngIf="acl.services.length === 0" class="mt-1 text-xs italic text-gray-500">Aucun service specifique</div>
                  <div *ngIf="acl.services.length > 0" class="mt-2 flex flex-wrap gap-1">
                    <span *ngFor="let service of acl.services"
                          class="rounded-full bg-warning-50 px-2 py-0.5 text-[11px] font-semibold text-warning-700">
                      {{ service }}
                    </span>
                  </div>
                </div>
              </ng-container>

              <button
                *ngIf="permissions.canManageGed()"
                type="button"
                (click)="onOpenAcl()"
                class="mt-2 w-full rounded-lg border border-brand-300 bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-100"
              >
                Ouvrir l'editeur ACL
              </button>
            </div>
          </ng-container>

          <ng-container *ngIf="workspace.activeInspectorTab() === 'history'">
            <div class="space-y-3">
              <p class="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Traces du document
              </p>

              <p *ngIf="!permissions.canViewAuditLogs()" class="rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600">
                Consultation des traces reservee aux administrateurs.
              </p>

              <div *ngIf="permissions.canViewAuditLogs() && workspace.isLoadingDocumentAudit()"
                   class="rounded-lg border border-gray-200 bg-gray-50 p-3 text-center text-xs text-gray-500">
                Chargement des traces...
              </div>

              <ol *ngIf="permissions.canViewAuditLogs() && !workspace.isLoadingDocumentAudit()"
                  class="relative space-y-2 border-l-2 border-gray-200 pl-4">
                <li *ngFor="let log of workspace.documentAuditLogs(); let isLast = last" class="relative">
                  <span class="absolute -left-[1.05rem] top-2 inline-flex h-2.5 w-2.5 rounded-full bg-gray-400" aria-hidden="true"></span>
                  <div class="rounded-lg border border-gray-200 bg-white p-2.5">
                    <div class="flex items-center justify-between gap-2">
                      <span class="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-700">
                        {{ log.action }}
                      </span>
                      <span class="text-[10px] text-gray-500">{{ formatDate(log.createdAt) }}</span>
                    </div>
                    <p class="mt-1 text-xs font-semibold text-gray-800">{{ log.actorUsername }}</p>
                    <p *ngIf="log.actorService" class="text-[11px] text-gray-500">{{ log.actorService }}</p>
                    <p *ngIf="log.actorRoles" class="text-[11px] text-gray-500">Roles : {{ log.actorRoles }}</p>
                    <p *ngIf="log.detailsJson" class="mt-1 text-[11px] italic text-gray-500">
                      {{ log.detailsJson.length > 100 ? (log.detailsJson | slice:0:100) + '...' : log.detailsJson }}
                    </p>
                  </div>
                </li>
                <li *ngIf="workspace.documentAuditLogs().length === 0" class="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-3 text-center text-xs italic text-gray-500">
                  Aucune trace pour ce document.
                </li>
              </ol>
            </div>
          </ng-container>
        </div>
      </ng-container>
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
export class GedWorkspaceInspectorComponent {
  readonly workspace = inject(GedWorkspaceService);
  private readonly documentService = inject(DocumentService);
  readonly permissions = inject(GedPermissionsService);

  readonly document = this.workspace.selectedDocument;

  private readonly allTabs: InspectorTab[] = [
    { id: 'meta', label: 'Details', icon: 'M5 4.5h10v11H5z' },
    { id: 'actions', label: 'Actions', icon: 'M10 4v12M4 10h12' },
    { id: 'versions', label: 'Versions', icon: 'M5 4.5h7l3 3v8H5z' },
    { id: 'acl', label: 'ACL', icon: 'M10 3l5 2v4c0 4-2.5 7-5 8-2.5-1-5-4-5-8V5z' },
    { id: 'history', label: 'Traces', icon: 'M4 10a6 6 0 1 0 1.5-4M4 4v3h3' },
  ];

  readonly visibleTabs: InspectorTab[] = (() => {
    const canManage = this.permissions.canManageGed();
    const canViewAudit = this.permissions.canViewAuditLogs();
    return this.allTabs.filter((tab) => {
      if (tab.id === 'acl') return canManage;
      if (tab.id === 'history') return canViewAudit;
      return true;
    });
  })();

  constructor() {
    effect(() => {
      const current = this.workspace.activeInspectorTab();
      if (!this.visibleTabs.some((tab) => tab.id === current)) {
        this.workspace.activeInspectorTab.set('meta');
      }
    });
  }

  onPreview(): void {
    this.workspace.showPreviewModal.set(true);
  }

  onDownload(): void {
    const doc = this.document();
    if (!doc) {
      return;
    }
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

  onPrint(): void {
    this.workspace.setFeedback('Utilisez le bouton Imprimer dans la fenetre de consultation.', 'success');
  }

  onSubmit(): void {
    const doc = this.document();
    if (!doc) {
      return;
    }
    this.documentService.submitWorkflow(doc.id).subscribe({
      next: () => this.workspace.setFeedback('Document soumis au workflow qualite.', 'success'),
      error: () => this.workspace.setFeedback('Soumission impossible.', 'error'),
    });
  }

  onApprove(): void {
    const doc = this.document();
    if (!doc) {
      return;
    }
    this.documentService.approveDocument(doc.id).subscribe({
      next: () => this.workspace.setFeedback('Document valide avec succes.', 'success'),
      error: () => this.workspace.setFeedback('Validation impossible.', 'error'),
    });
  }

  onPublish(): void {
    const doc = this.document();
    if (!doc) {
      return;
    }
    this.documentService.publishDocument(doc.id).subscribe({
      next: () => this.workspace.setFeedback('Document publie avec succes.', 'success'),
      error: () => this.workspace.setFeedback('Publication impossible.', 'error'),
    });
  }

  onArchive(): void {
    const doc = this.document();
    if (!doc) {
      return;
    }
    if (!confirm(`Archiver le document "${doc.title}" ?`)) {
      return;
    }
    this.documentService.archiveDocument(doc.id).subscribe({
      next: () => this.workspace.setFeedback('Document archive avec succes.', 'success'),
      error: () => this.workspace.setFeedback('Archivage impossible.', 'error'),
    });
  }

  onDelete(): void {
    const doc = this.document();
    if (!doc) {
      return;
    }
    if (!confirm(`Supprimer definitivement le document "${doc.title}" ?`)) {
      return;
    }
    this.documentService.deleteDocumentPermanently(doc.id).subscribe({
      next: () => {
        this.workspace.setFocusedDocument(null);
        this.workspace.setFeedback('Document supprime definitivement.', 'success');
      },
      error: () => this.workspace.setFeedback('Suppression impossible.', 'error'),
    });
  }

  onEdit(): void {
    this.workspace.showDocumentModal.set(true);
  }

  onOpenVersions(): void {
    this.workspace.showVersionModal.set(true);
  }

  onOpenAcl(): void {
    this.workspace.showAclModal.set(true);
  }

  onToggleAuditPanel(): void {
    this.workspace.showAuditPanel.set(!this.workspace.showAuditPanel());
  }

  onDownloadVersion(versionNumber: number): void {
    const doc = this.document();
    if (!doc) {
      return;
    }
    this.documentService.downloadDocumentBinary(doc.id, versionNumber).subscribe({
      next: ({ content, fileName }) => {
        const url = URL.createObjectURL(content);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = fileName || `${doc.referenceCode || doc.title}-v${versionNumber}.txt`;
        anchor.click();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
        this.workspace.setFeedback(`Version v${versionNumber} telechargee.`, 'success');
      },
      error: () => {
        this.workspace.setFeedback(`Telechargement de v${versionNumber} impossible.`, 'error');
      },
    });
  }

  onPreviewVersion(versionNumber: number): void {
    this.workspace.showPreviewModal.set(true);
    // The preview service picks the focused document and version, so we
    // simply open it - the user can navigate versions inside the preview drawer.
    this.workspace.setFeedback(`Consultation de la version v${versionNumber}.`, 'success');
  }

  onRestoreVersion(versionNumber: number): void {
    const doc = this.document();
    if (!doc) {
      return;
    }
    if (!confirm(`Restaurer le contenu de la version v${versionNumber} ?\nTelechargez d'abord cette version, puis televersez-la comme nouvelle version depuis le bouton "Ajouter une version".`)) {
      return;
    }
    // Help the user by pre-filling the modal with a descriptive change note.
    this.workspace.setFeedback(`Restauration : ouvrez le modal d'ajout de version et televersez le fichier de v${versionNumber}.`, 'success');
    this.workspace.showVersionModal.set(true);
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

  getConfidentialityClass(level: 'PUBLIC' | 'INTERNAL' | 'RESTRICTED' | 'CONFIDENTIAL'): string {
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

  formatConfidentialityLabel(level: 'PUBLIC' | 'INTERNAL' | 'RESTRICTED' | 'CONFIDENTIAL'): string {
    const labels = {
      PUBLIC: 'Public',
      INTERNAL: 'Interne',
      RESTRICTED: 'Restreint',
      CONFIDENTIAL: 'Confidentiel',
    } as const;
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
    return date.toLocaleString('fr-FR');
  }

  formatBytes(bytes: number | undefined | null): string {
    if (!bytes || bytes <= 0) {
      return '-';
    }
    const units = ['o', 'Ko', 'Mo', 'Go'];
    let value = bytes;
    let unitIndex = 0;
    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex += 1;
    }
    return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
  }
}
