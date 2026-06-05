import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { take } from 'rxjs/operators';
import { FlatFolderNode, GedWorkspaceService } from '../../services/ged-workspace.service';
import { GedPermissionsService } from '../../services/ged-permissions.service';
import { AuthService } from '../../../../core/services/auth.service';
import {
  DocumentService,
  GedAclRole,
  GedConfidentialityLevel,
} from '../../../../core/services/document.service';

@Component({
  selector: 'app-ged-workspace-modals',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    <ng-container *ngIf="workspace.showFolderModal()">
      <div
        class="fixed left-0 top-0 z-[100000] flex h-screen w-screen items-center justify-center overflow-y-auto bg-gray-950/60 px-4 py-6"
        data-testid="ged-modal-folder"
      >
        <div class="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-5">
          <h3 class="text-lg font-semibold text-gray-900">Nouveau dossier</h3>
          <div class="mt-4 grid grid-cols-1 gap-3">
            <label class="block text-xs font-semibold uppercase tracking-wide text-gray-500">
              Nom du dossier
              <input
                [(ngModel)]="folderName"
                type="text"
                class="mt-1 h-10 w-full rounded-lg border border-gray-300 px-3 text-sm"
                data-testid="ged-modal-folder-name"
              />
            </label>
            <label class="block text-xs font-semibold uppercase tracking-wide text-gray-500">
              Parent
              <select
                [(ngModel)]="folderParentId"
                class="mt-1 h-10 w-full rounded-lg border border-gray-300 px-3 text-sm"
              >
                <option [ngValue]="null">Racine</option>
                <option *ngFor="let folder of workspace.flatFolders()" [ngValue]="folder.id">
                  {{ folder.breadcrumb }}
                </option>
              </select>
            </label>
            <label class="block text-xs font-semibold uppercase tracking-wide text-gray-500">
              Categorie (optionnel)
              <input
                [(ngModel)]="folderCategory"
                type="text"
                class="mt-1 h-10 w-full rounded-lg border border-gray-300 px-3 text-sm"
              />
            </label>
          </div>
          <div class="mt-5 flex justify-end gap-2">
            <button
              type="button"
              (click)="closeFolderModal()"
              class="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700"
            >
              Annuler
            </button>
            <button
              type="button"
              (click)="saveFolder()"
              [disabled]="workspace.isSavingFolder() || !folderName.trim()"
              class="rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
              data-testid="ged-modal-folder-save"
            >
              {{ workspace.isSavingFolder() ? 'Enregistrement...' : 'Enregistrer' }}
            </button>
          </div>
        </div>
      </div>
    </ng-container>

    <ng-container *ngIf="workspace.pendingFolderEdition() as editFolder">
      <div
        class="fixed left-0 top-0 z-[100000] flex h-screen w-screen items-center justify-center overflow-y-auto bg-gray-950/60 px-4 py-6"
        data-testid="ged-modal-edit-folder"
      >
        <div class="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-5">
          <h3 class="text-lg font-semibold text-gray-900">Modifier le dossier</h3>
          <p class="mt-1 text-xs text-gray-500">
            Vous pouvez renommer le dossier, changer son parent ou sa categorie.
            Le chemin complet sera mis a jour automatiquement.
          </p>
          <div class="mt-4 grid grid-cols-1 gap-3">
            <label class="block text-xs font-semibold uppercase tracking-wide text-gray-500">
              Nom du dossier
              <input
                [(ngModel)]="editFolderName"
                type="text"
                class="mt-1 h-10 w-full rounded-lg border border-gray-300 px-3 text-sm"
                data-testid="ged-modal-edit-folder-name"
              />
            </label>
            <label class="block text-xs font-semibold uppercase tracking-wide text-gray-500">
              Parent
              <select
                [(ngModel)]="editFolderParentId"
                class="mt-1 h-10 w-full rounded-lg border border-gray-300 px-3 text-sm"
              >
                <option [ngValue]="null">Racine</option>
                <option *ngFor="let folder of availableParentsForEdition()" [ngValue]="folder.id">
                  {{ folder.breadcrumb }}
                </option>
              </select>
            </label>
            <label class="block text-xs font-semibold uppercase tracking-wide text-gray-500">
              Categorie (optionnel)
              <input
                [(ngModel)]="editFolderCategory"
                type="text"
                class="mt-1 h-10 w-full rounded-lg border border-gray-300 px-3 text-sm"
              />
            </label>
            <div class="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900">
              <strong>Attention :</strong> deplacer un dossier peut modifier les ACL des sous-dossiers.
            </div>
          </div>
          <div class="mt-5 flex justify-end gap-2">
            <button
              type="button"
              (click)="closeEditFolderModal()"
              class="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700"
            >
              Annuler
            </button>
            <button
              type="button"
              (click)="saveEditFolder()"
              [disabled]="isSavingEditFolder() || !editFolderName.trim()"
              class="rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
              data-testid="ged-modal-edit-folder-save"
            >
              {{ isSavingEditFolder() ? 'Enregistrement...' : 'Enregistrer' }}
            </button>
          </div>
        </div>
      </div>
    </ng-container>

    <ng-container *ngIf="workspace.showDocumentModal()">
      <div
        class="fixed left-0 top-0 z-[100000] flex h-screen w-screen items-center justify-center overflow-y-auto bg-gray-950/60 px-4 py-6"
        data-testid="ged-modal-document"
      >
        <div class="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-2xl border border-gray-200 bg-white p-5">
          <h3 class="text-lg font-semibold text-gray-900">Nouveau document</h3>
          <div class="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <label class="block text-xs font-semibold uppercase tracking-wide text-gray-500">
              Dossier
              <select
                [(ngModel)]="documentFolderId"
                class="mt-1 h-10 w-full rounded-lg border border-gray-300 px-3 text-sm"
                data-testid="ged-modal-document-folder"
              >
                <option *ngFor="let folder of workspace.flatFolders()" [ngValue]="folder.id">
                  {{ folder.breadcrumb }}
                </option>
              </select>
            </label>
            <label class="block text-xs font-semibold uppercase tracking-wide text-gray-500">
              Confidentialite
              <select
                [(ngModel)]="documentConfidentiality"
                class="mt-1 h-10 w-full rounded-lg border border-gray-300 px-3 text-sm"
              >
                <option *ngFor="let level of confidentialityLevels" [value]="level">
                  {{ formatLevelLabel(level) }}
                </option>
              </select>
            </label>
            <label class="block text-xs font-semibold uppercase tracking-wide text-gray-500 md:col-span-2">
              Titre
              <input
                [(ngModel)]="documentTitle"
                type="text"
                class="mt-1 h-10 w-full rounded-lg border border-gray-300 px-3 text-sm"
                data-testid="ged-modal-document-title"
              />
            </label>
            <div class="md:col-span-2">
              <label class="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                Fichier (PDF, DOC, DOCX, XLS, XLSX, PNG, JPG, JPEG, TXT - 10 Mo max)
              </label>
              <div class="rounded-xl border border-dashed border-gray-300 p-3">
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.txt"
                  (change)="onFileSelected($event)"
                  class="block w-full text-sm text-gray-700 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-500 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
                  data-testid="ged-modal-document-file"
                />
                <div *ngIf="documentUploadFile()" class="mt-2 rounded-lg bg-gray-50 px-3 py-2 text-xs">
                  <p class="font-semibold text-gray-800">{{ documentUploadFile()!.name }}</p>
                  <p class="text-gray-600">{{ formatFileSize(documentUploadFile()!.size) }}</p>
                </div>
              </div>
            </div>
            <label class="block text-xs font-semibold uppercase tracking-wide text-gray-500 md:col-span-2">
              Description
              <textarea
                [(ngModel)]="documentDescription"
                rows="2"
                class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              ></textarea>
            </label>
            <label class="block text-xs font-semibold uppercase tracking-wide text-gray-500 md:col-span-2">
              Service proprietaire
              <select
                [(ngModel)]="documentOwnerService"
                class="mt-1 h-10 w-full rounded-lg border border-gray-300 px-3 text-sm"
              >
                <option value="">Selectionner un service</option>
                <option *ngFor="let service of serviceOptions()" [value]="service">{{ service }}</option>
              </select>
            </label>
          </div>
          <div class="mt-5 flex justify-end gap-2">
            <button
              type="button"
              (click)="closeDocumentModal()"
              class="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700"
            >
              Annuler
            </button>
            <button
              type="button"
              (click)="saveDocument()"
              [disabled]="workspace.isSavingDocument() || !canSaveDocument()"
              class="rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
              data-testid="ged-modal-document-save"
            >
              {{ workspace.isSavingDocument() ? 'Creation...' : 'Creer' }}
            </button>
          </div>
        </div>
      </div>
    </ng-container>

    <ng-container *ngIf="workspace.showVersionModal()">
      <div
        class="fixed left-0 top-0 z-[100000] flex h-screen w-screen items-center justify-center overflow-y-auto bg-gray-950/60 px-4 py-6"
        data-testid="ged-modal-version"
      >
        <div class="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-5">
          <h3 class="text-lg font-semibold text-gray-900">Ajouter une version</h3>
          <p *ngIf="workspace.selectedDocument() as doc" class="mt-1 text-sm text-gray-600">
            {{ doc.title }} - v{{ (doc.currentVersionNumber || 1) + 1 }}
          </p>
          <div class="mt-4 space-y-3">
            <label class="block text-xs font-semibold uppercase tracking-wide text-gray-500">
              Fichier
              <input
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.txt"
                (change)="onVersionFileSelected($event)"
                class="mt-1 block w-full text-sm text-gray-700 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-500 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
              />
            </label>
            <label class="block text-xs font-semibold uppercase tracking-wide text-gray-500">
              Note de version
              <textarea
                [(ngModel)]="versionChangeNote"
                rows="2"
                class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="Ex: Mise a jour des procedures Q3"
              ></textarea>
            </label>
          </div>
          <div class="mt-5 flex justify-end gap-2">
            <button
              type="button"
              (click)="workspace.showVersionModal.set(false)"
              class="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700"
            >
              Annuler
            </button>
            <button
              type="button"
              (click)="saveVersion()"
              [disabled]="workspace.isSavingVersion() || !versionUploadFile()"
              class="rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {{ workspace.isSavingVersion() ? 'Envoi...' : 'Ajouter' }}
            </button>
          </div>
        </div>
      </div>
    </ng-container>

    <ng-container *ngIf="workspace.showAclModal()">
      <div
        class="fixed left-0 top-0 z-[100000] flex h-screen w-screen items-center justify-center overflow-y-auto bg-gray-950/60 px-4 py-6"
        data-testid="ged-modal-acl"
      >
        <div class="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-2xl border border-gray-200 bg-white p-5">
          <h3 class="text-lg font-semibold text-gray-900">Gerer les droits d'acces</h3>
          <p *ngIf="workspace.selectedDocument() as doc" class="mt-1 text-sm text-gray-600">
            {{ doc.title }}
          </p>
          <div class="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <p class="text-xs font-semibold uppercase tracking-wide text-gray-500">Roles autorises</p>
              <div class="mt-2 space-y-2">
                <label
                  *ngFor="let role of aclRoleOptions"
                  class="flex items-center gap-2 rounded-md border border-gray-200 px-2 py-1.5"
                >
                  <input
                    type="checkbox"
                    [checked]="aclSelectedRoles().includes(role)"
                    [disabled]="isMandatoryRole(role)"
                    (change)="onToggleAclRole(role, $event)"
                    class="size-4 cursor-pointer rounded border-gray-300 text-brand-500"
                  />
                  <span class="text-sm text-gray-700">{{ formatRoleLabel(role) }}</span>
                </label>
              </div>
            </div>
            <div>
              <p class="text-xs font-semibold uppercase tracking-wide text-gray-500">Services autorises</p>
              <div class="mt-2 space-y-2 max-h-64 overflow-auto">
                <label
                  *ngFor="let service of serviceOptions()"
                  class="flex items-center gap-2 rounded-md border border-gray-200 px-2 py-1.5"
                >
                  <input
                    type="checkbox"
                    [checked]="aclSelectedServices().includes(service)"
                    (change)="onToggleAclService(service, $event)"
                    class="size-4 cursor-pointer rounded border-gray-300 text-brand-500"
                  />
                  <span class="text-sm text-gray-700">{{ service }}</span>
                </label>
              </div>
            </div>
          </div>
          <div class="mt-5 flex justify-end gap-2">
            <button
              type="button"
              (click)="workspace.showAclModal.set(false)"
              class="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700"
            >
              Annuler
            </button>
            <button
              type="button"
              (click)="saveAcl()"
              [disabled]="workspace.isSavingAcl()"
              class="rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {{ workspace.isSavingAcl() ? 'Enregistrement...' : 'Enregistrer' }}
            </button>
          </div>
        </div>
      </div>
    </ng-container>

    <!-- Modal de confirmation de suppression de dossier -->
    <ng-container *ngIf="workspace.pendingFolderDeletion() as pending">
      <div
        class="fixed left-0 top-0 z-[100100] flex h-screen w-screen items-center justify-center overflow-y-auto bg-gray-950/60 px-4 py-6"
        data-testid="ged-modal-delete-folder"
        (click)="onCancelDeleteFolder()"
      >
        <div
          class="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl"
          (click)="$event.stopPropagation()"
        >
          <div class="flex items-start gap-3">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
              <svg class="size-5" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M10 6.5v4M10 13.5v.5M3.5 16.5h13l-1.2-9.5a1.5 1.5 0 0 0-1.5-1.35H6.2a1.5 1.5 0 0 0-1.5 1.35L3.5 16.5zM7 4.5V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <div class="min-w-0 flex-1">
              <h3 class="text-lg font-semibold text-gray-900">Supprimer le dossier ?</h3>
              <p class="mt-1 text-sm text-gray-600">
                Vous etes sur le point de supprimer le dossier
                <strong class="text-gray-900">{{ pending.folder.name }}</strong>.
                Cette action archive recursivement le dossier et tout son contenu.
              </p>
            </div>
          </div>

          <div class="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            <p class="font-semibold">Impact de la suppression :</p>
            <ul class="mt-1 list-disc pl-4">
              <li><strong>{{ pending.subFolderCount }}</strong> sous-dossier(s) archive(s)</li>
              <li><strong>{{ pending.documentCount }}</strong> document(s) archive(s)</li>
              <li>Le dossier disparait de la navigation, l'historique est preserve</li>
            </ul>
          </div>

          <div class="mt-5 flex justify-end gap-2">
            <button
              type="button"
              (click)="onCancelDeleteFolder()"
              [disabled]="isDeletingFolder()"
              class="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="button"
              (click)="onConfirmDeleteFolder()"
              [disabled]="isDeletingFolder()"
              class="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              data-testid="ged-modal-delete-folder-confirm"
            >
              {{ isDeletingFolder() ? 'Suppression...' : 'Supprimer definitivement' }}
            </button>
          </div>
        </div>
      </div>
    </ng-container>
  `,
  styles: [
    `
      :host {
        display: contents;
      }
    `,
  ],
})
export class GedWorkspaceModalsComponent {
  readonly workspace = inject(GedWorkspaceService);
  private readonly documentService = inject(DocumentService);
  private readonly authService = inject(AuthService);
  readonly permissions = inject(GedPermissionsService);

  readonly confidentialityLevels: GedConfidentialityLevel[] = [
    'PUBLIC',
    'INTERNAL',
    'RESTRICTED',
    'CONFIDENTIAL',
  ];

  readonly aclRoleOptions: GedAclRole[] = [
    'ADMIN',
    'EMPLOYE',
    'CHEF_HIERARCHIQUE',
    'RESPONSABLE_SALLE',
    'RESPONSABLE_SECURITE',
    'DIRECTEUR_DSN',
    'RESPONSABLE_QUALITE',
  ];

  readonly mandatoryAclRoles: GedAclRole[] = ['ADMIN', 'RESPONSABLE_QUALITE'];

  folderName = '';
  folderCategory = '';
  folderParentId: string | null = null;

  editFolderName = '';
  editFolderCategory = '';
  editFolderParentId: string | null = null;
  readonly isSavingEditFolder = signal(false);

  readonly availableParentsForEdition = computed<FlatFolderNode[]>(() => {
    const editing = this.workspace.pendingFolderEdition();
    if (!editing) return this.workspace.flatFolders();
    return this.workspace.flatFolders().filter((folder) => {
      if (folder.id === editing.id) return false;
      return !this.isDescendantOf(folder.id, editing.id);
    });
  });

  private isDescendantOf(candidateId: string, ancestorId: string): boolean {
    const all = this.workspace.flatFolders();
    const byId = new Map(all.map((f) => [f.id, f] as const));
    let current = byId.get(candidateId);
    while (current?.parentId) {
      if (current.parentId === ancestorId) return true;
      current = byId.get(current.parentId);
    }
    return false;
  }

  documentTitle = '';
  documentFolderId: string | null = null;
  documentDescription = '';
  documentOwnerService = '';
  documentConfidentiality: GedConfidentialityLevel = 'INTERNAL';
  readonly documentUploadFile = signal<File | null>(null);

  versionChangeNote = '';
  readonly versionUploadFile = signal<File | null>(null);

  readonly aclSelectedRoles = signal<GedAclRole[]>([]);
  readonly aclSelectedServices = signal<string[]>([]);
  readonly serviceOptions = computed<string[]>(() => {
    const opts = this.workspace.documentServiceOptions();
    return opts.length > 0 ? opts : this.defaultServices();
  });

  readonly defaultServices = signal<string[]>([
    'DSI',
    'QUALITE',
    'SECURITE',
    'DIRECTION',
    'ADMINISTRATION',
    'LOGISTIQUE',
    'RESSOURCES HUMAINES',
  ]);

  readonly allowedExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'png', 'jpg', 'jpeg', 'txt'];
  readonly maxSizeBytes = 10 * 1024 * 1024;

  constructor() {
    this.workspace.documentServiceOptions.set(this.defaultServices());
    this.documentFolderId = this.workspace.selectedFolderId();
    effect(() => {
      if (this.workspace.pendingFolderEdition()) {
        this.openEditFolderModal();
      }
    });
  }

  closeFolderModal(): void {
    this.workspace.showFolderModal.set(false);
    this.folderName = '';
    this.folderCategory = '';
  }

  saveFolder(): void {
    const name = this.folderName.trim();
    if (!name) {
      this.workspace.setFeedback('Le nom du dossier est obligatoire.', 'error');
      return;
    }
    this.workspace.isSavingFolder.set(true);
    this.documentService
      .createFolder({
        name,
        parentId: this.folderParentId ?? this.workspace.selectedFolderId(),
        category: this.folderCategory.trim() || null,
      })
      .subscribe({
        next: () => {
          this.workspace.isSavingFolder.set(false);
          this.closeFolderModal();
          this.workspace.setFeedback('Dossier cree avec succes.', 'success');
          this.refreshFoldersAndDocuments();
        },
        error: (error: unknown) => {
          this.workspace.isSavingFolder.set(false);
          this.workspace.setFeedback(this.toError(error, 'Creation du dossier impossible.'), 'error');
        },
      });
  }

  openEditFolderModal(): void {
    const folder = this.workspace.pendingFolderEdition();
    if (!folder) return;
    this.editFolderName = folder.name;
    this.editFolderCategory = folder.category ?? '';
    this.editFolderParentId = folder.parentId;
  }

  closeEditFolderModal(): void {
    if (this.isSavingEditFolder()) return;
    this.workspace.cancelFolderEdition();
    this.editFolderName = '';
    this.editFolderCategory = '';
    this.editFolderParentId = null;
  }

  saveEditFolder(): void {
    const folder = this.workspace.pendingFolderEdition();
    if (!folder) return;
    const name = this.editFolderName.trim();
    if (!name) {
      this.workspace.setFeedback('Le nom du dossier est obligatoire.', 'error');
      return;
    }
    this.isSavingEditFolder.set(true);
    this.documentService
      .updateFolder(folder.id, {
        name,
        parentId: this.editFolderParentId,
        category: this.editFolderCategory.trim() || null,
      })
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.isSavingEditFolder.set(false);
          this.workspace.cancelFolderEdition();
          this.editFolderName = '';
          this.editFolderCategory = '';
          this.editFolderParentId = null;
          this.workspace.setFeedback(`Dossier "${name}" mis a jour avec succes.`, 'success');
          this.workspace.workspaceRefresh$.next('all');
        },
        error: (error) => {
          this.isSavingEditFolder.set(false);
          this.workspace.setFeedback(this.toError(error, 'Modification du dossier impossible.'), 'error');
        },
      });
  }

  closeDocumentModal(): void {
    this.workspace.showDocumentModal.set(false);
    this.documentTitle = '';
    this.documentDescription = '';
    this.documentUploadFile.set(null);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      this.documentUploadFile.set(null);
      return;
    }
    const error = this.validateFile(file);
    if (error) {
      this.workspace.setFeedback(error, 'error');
      this.documentUploadFile.set(null);
      input.value = '';
      return;
    }
    this.documentUploadFile.set(file);
  }

  onVersionFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      this.versionUploadFile.set(null);
      return;
    }
    const error = this.validateFile(file);
    if (error) {
      this.workspace.setFeedback(error, 'error');
      this.versionUploadFile.set(null);
      input.value = '';
      return;
    }
    this.versionUploadFile.set(file);
  }

  canSaveDocument(): boolean {
    return !!this.documentFolderId && !!this.documentTitle.trim() && !!this.documentUploadFile() && !!this.documentOwnerService;
  }

  saveDocument(): void {
    if (!this.canSaveDocument()) {
      this.workspace.setFeedback('Tous les champs obligatoires doivent etre remplis.', 'error');
      return;
    }
    const file = this.documentUploadFile()!;
    const folder = this.workspace.flatFolders().find((f) => f.id === this.documentFolderId);
    const category = (folder?.category || folder?.name || 'General').trim();
    this.workspace.isSavingDocument.set(true);
    this.documentService
      .createDocumentWithUpload(
        {
          folderId: this.documentFolderId!,
          title: this.documentTitle.trim(),
          category,
          description: this.documentDescription.trim() || undefined,
          confidentialityLevel: this.documentConfidentiality,
          allowedRoles: [],
          allowedServices: this.documentOwnerService ? [this.documentOwnerService] : [],
        },
        file
      )
      .subscribe({
        next: () => {
          this.workspace.isSavingDocument.set(false);
          this.closeDocumentModal();
          this.workspace.setFeedback('Document cree avec succes.', 'success');
          this.refreshFoldersAndDocuments();
        },
        error: (error: unknown) => {
          this.workspace.isSavingDocument.set(false);
          this.workspace.setFeedback(this.toError(error, 'Creation impossible.'), 'error');
        },
      });
  }

  saveVersion(): void {
    const doc = this.workspace.selectedDocument();
    const file = this.versionUploadFile();
    if (!doc || !file) {
      return;
    }
    this.workspace.isSavingVersion.set(true);
    this.documentService
      .addDocumentVersionWithUpload(
        doc.id,
        { changeNote: this.versionChangeNote.trim() || undefined },
        file
      )
      .subscribe({
        next: () => {
          this.workspace.isSavingVersion.set(false);
          this.versionUploadFile.set(null);
          this.versionChangeNote = '';
          this.workspace.showVersionModal.set(false);
          this.workspace.setFeedback('Nouvelle version ajoutee.', 'success');
        },
        error: (error: unknown) => {
          this.workspace.isSavingVersion.set(false);
          this.workspace.setFeedback(this.toError(error, 'Ajout de version impossible.'), 'error');
        },
      });
  }

  isMandatoryRole(role: GedAclRole): boolean {
    return this.mandatoryAclRoles.includes(role);
  }

  onToggleAclRole(role: GedAclRole, event: Event): void {
    if (this.isMandatoryRole(role)) {
      return;
    }
    const checked = (event.target as HTMLInputElement).checked;
    const next = new Set(this.aclSelectedRoles());
    if (checked) {
      next.add(role);
    } else {
      next.delete(role);
    }
    this.aclSelectedRoles.set(Array.from(next));
  }

  onToggleAclService(service: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const next = new Set(this.aclSelectedServices());
    if (checked) {
      next.add(service);
    } else {
      next.delete(service);
    }
    this.aclSelectedServices.set(Array.from(next));
  }

  saveAcl(): void {
    const doc = this.workspace.selectedDocument();
    if (!doc) {
      return;
    }
    this.workspace.isSavingAcl.set(true);
    this.documentService
      .updateDocumentAcl(doc.id, {
        roles: this.aclSelectedRoles(),
        services: this.aclSelectedServices(),
      })
      .subscribe({
        next: () => {
          this.workspace.isSavingAcl.set(false);
          this.workspace.showAclModal.set(false);
          this.workspace.setFeedback('Droits mis a jour.', 'success');
        },
        error: (error: unknown) => {
          this.workspace.isSavingAcl.set(false);
          this.workspace.setFeedback(this.toError(error, 'Mise a jour ACL impossible.'), 'error');
        },
      });
  }

  formatLevelLabel(level: GedConfidentialityLevel): string {
    const labels: Record<GedConfidentialityLevel, string> = {
      PUBLIC: 'Public',
      INTERNAL: 'Interne',
      RESTRICTED: 'Restreint',
      CONFIDENTIAL: 'Confidentiel',
    };
    return labels[level];
  }

  formatRoleLabel(role: GedAclRole): string {
    const labels: Record<GedAclRole, string> = {
      ADMIN: 'Administrateur',
      EMPLOYE: 'Employe',
      CHEF_HIERARCHIQUE: 'Chef hierarchique',
      RESPONSABLE_SALLE: 'Responsable salle',
      RESPONSABLE_SECURITE: 'Responsable securite',
      DIRECTEUR_DSN: 'Directeur DSN',
      RESPONSABLE_QUALITE: 'Responsable qualite',
    };
    return labels[role];
  }

  formatFileSize(size: number): string {
    if (!Number.isFinite(size) || size <= 0) {
      return '0 o';
    }
    const units = ['o', 'Ko', 'Mo', 'Go'];
    let value = size;
    let unit = 0;
    while (value >= 1024 && unit < units.length - 1) {
      value /= 1024;
      unit += 1;
    }
    return `${value.toFixed(value >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
  }

  private validateFile(file: File): string | null {
    if (file.size <= 0) {
      return 'Le fichier est vide.';
    }
    if (file.size > this.maxSizeBytes) {
      return 'Le fichier depasse 10 Mo.';
    }
    const extension = (file.name.split('.').pop() || '').toLowerCase();
    if (!this.allowedExtensions.includes(extension)) {
      return 'Type de fichier non autorise.';
    }
    return null;
  }

  private refreshFoldersAndDocuments(): void {
    this.workspace.folders.set([]);
    this.workspace.flatFolders.set([]);
    this.workspace.allDocuments.set([]);
  }

  private toError(error: unknown, fallback: string): string {
    if (error && typeof error === 'object' && 'status' in error) {
      const status = (error as { status: number }).status;
      if (status === 403) return 'Action non autorisee.';
      if (status === 401) return 'Session invalide.';
      if (status === 404) return 'Ressource introuvable.';
    }
    if (error instanceof Error && error.message) {
      return error.message;
    }
    return fallback;
  }

  readonly isDeletingFolder = signal(false);

  onCancelDeleteFolder(): void {
    if (this.isDeletingFolder()) return;
    this.workspace.cancelFolderDeletion();
  }

  onConfirmDeleteFolder(): void {
    const pending = this.workspace.pendingFolderDeletion();
    if (!pending || this.isDeletingFolder()) return;

    this.isDeletingFolder.set(true);
    this.documentService
      .archiveFolder(pending.folder.id)
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.isDeletingFolder.set(false);
          this.workspace.cancelFolderDeletion();
          this.workspace.clearSelection();
          this.workspace.workspaceRefresh$.next('all');
          this.workspace.setFeedback(
            `Dossier "${pending.folder.name}" archive avec succes.`,
            'success'
          );
        },
        error: (error) => {
          this.isDeletingFolder.set(false);
          this.workspace.cancelFolderDeletion();
          this.workspace.setFeedback(this.toError(error, 'Suppression impossible.'), 'error');
        },
      });
  }
}
