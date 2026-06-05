import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { GedWorkspaceService } from '../../services/ged-workspace.service';
import { DocumentService } from '../../../../core/services/document.service';
import { resolveGedPreviewRenderMode } from '../../utils/ged-preview.util';

@Component({
  selector: 'app-ged-workspace-preview',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div
      *ngIf="workspace.showPreviewModal() && workspace.selectedDocument() as doc"
      class="fixed inset-y-0 right-0 z-[99999] flex w-full max-w-3xl flex-col border-l border-gray-200 bg-white shadow-2xl"
      data-testid="ged-preview-pane"
    >
      <header class="flex items-start justify-between gap-3 border-b border-gray-100 px-4 py-3">
        <div class="min-w-0 flex-1">
          <p class="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Apercu</p>
          <h3 class="truncate text-base font-semibold text-gray-900" [attr.title]="doc.title">
            {{ doc.title }}
          </h3>
          <p class="mt-0.5 text-xs text-gray-500">
            {{ doc.referenceCode }} • v{{ doc.currentVersionNumber || 1 }} • {{ formatFileName() }}
          </p>
        </div>
        <div class="flex shrink-0 items-center gap-1">
          <button
            type="button"
            (click)="zoomOut()"
            [disabled]="!isText()"
            class="rounded-md border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            aria-label="Zoom arriere"
          >
            −
          </button>
          <span class="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-600">
            {{ zoom() }}%
          </span>
          <button
            type="button"
            (click)="zoomIn()"
            [disabled]="!isText()"
            class="rounded-md border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            aria-label="Zoom avant"
          >
            +
          </button>
          <button
            type="button"
            (click)="onDownload()"
            class="rounded-md bg-brand-500 px-2 py-1 text-xs font-semibold text-white hover:bg-brand-600"
          >
            Telecharger
          </button>
          <button
            type="button"
            (click)="workspace.showPreviewModal.set(false)"
            class="rounded-md border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
            aria-label="Fermer"
          >
            ×
          </button>
        </div>
      </header>

      <div class="flex-1 overflow-auto bg-gray-50">
        <div *ngIf="isLoading()" class="flex h-full items-center justify-center text-sm text-gray-500">
          Chargement de l'apercu...
        </div>

        <div *ngIf="!isLoading() && isPdf()" class="h-full w-full">
          <iframe
            *ngIf="pdfUrl()"
            [src]="pdfUrl()"
            class="h-full w-full border-0"
            title="Apercu PDF"
          ></iframe>
          <div *ngIf="!pdfUrl()" class="p-4 text-sm text-gray-600">
            Apercu PDF non disponible.
          </div>
        </div>

        <div *ngIf="!isLoading() && isText()" class="p-4">
          <pre
            class="whitespace-pre-wrap rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-800"
            [style.font-size.px]="fontSize()"
          >{{ textContent() }}</pre>
        </div>

        <div *ngIf="!isLoading() && isImage()" class="flex h-full items-center justify-center p-4">
          <img *ngIf="blobUrl()" [src]="blobUrl()!" alt="Apercu" class="max-h-full max-w-full" />
        </div>

        <div *ngIf="!isLoading() && isFallback()" class="p-6 text-center">
          <p class="text-sm text-gray-600">
            Apercu non disponible pour ce format. Utilisez le telechargement pour consulter le fichier original.
          </p>
          <button
            type="button"
            (click)="onDownload()"
            class="mt-3 rounded-md bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-600"
          >
            Telecharger le fichier
          </button>
        </div>
      </div>

      <footer class="border-t border-gray-100 px-4 py-2 text-xs text-gray-500">
        Mode : {{ renderMode() }} • Taille : {{ formatSize() }}
      </footer>
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
export class GedWorkspacePreviewComponent implements OnDestroy {
  readonly workspace = inject(GedWorkspaceService);
  private readonly documentService = inject(DocumentService);
  private readonly sanitizer = inject(DomSanitizer);

  readonly isLoading = signal(false);
  readonly renderMode = signal<'pdf' | 'image' | 'text' | 'fallback'>('fallback');
  readonly textContent = signal('');
  readonly blobUrl = signal<string | null>(null);
  readonly pdfUrl = signal<SafeResourceUrl | null>(null);
  readonly zoom = signal(100);
  readonly fileName = signal('');
  readonly fileSize = signal(0);
  readonly mimeType = signal('application/octet-stream');

  readonly isText = computed(() => this.renderMode() === 'text');
  readonly isPdf = computed(() => this.renderMode() === 'pdf');
  readonly isImage = computed(() => this.renderMode() === 'image');
  readonly isFallback = computed(() => this.renderMode() === 'fallback');

  readonly fontSize = computed(() => 13 * (this.zoom() / 100));

  private currentBlob: string | null = null;

  constructor() {
    effect(() => {
      const open = this.workspace.showPreviewModal();
      const doc = this.workspace.selectedDocument();
      if (open && doc) {
        this.loadPreview(doc.id);
      } else if (!open) {
        this.cleanup();
      }
    });
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  zoomIn(): void {
    this.zoom.set(Math.min(this.zoom() + 10, 200));
  }

  zoomOut(): void {
    this.zoom.set(Math.max(this.zoom() - 10, 50));
  }

  formatSize(): string {
    const size = this.fileSize();
    if (!Number.isFinite(size) || size <= 0) return '0 o';
    const units = ['o', 'Ko', 'Mo', 'Go'];
    let value = size;
    let unit = 0;
    while (value >= 1024 && unit < units.length - 1) {
      value /= 1024;
      unit += 1;
    }
    return `${value.toFixed(value >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
  }

  formatFileName(): string {
    return this.fileName() || this.workspace.selectedDocument()?.referenceCode || '';
  }

  onDownload(): void {
    const doc = this.workspace.selectedDocument();
    if (!doc) return;
    this.documentService.downloadDocumentBinary(doc.id).subscribe({
      next: ({ content, fileName }) => {
        const url = URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName || `${doc.referenceCode || doc.title}.txt`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      },
      error: () => this.workspace.setFeedback('Telechargement impossible.', 'error'),
    });
  }

  private loadPreview(documentId: string): void {
    this.isLoading.set(true);
    this.documentService.downloadDocumentBinary(documentId).subscribe({
      next: async ({ content, fileName, mimeType, fileSize }) => {
        this.fileName.set(fileName);
        this.fileSize.set(fileSize);
        this.mimeType.set(mimeType || content.type || 'application/octet-stream');
        const mode = resolveGedPreviewRenderMode(this.mimeType(), fileName);
        this.renderMode.set(mode);

        this.cleanupBlob();
        this.currentBlob = URL.createObjectURL(content);
        this.blobUrl.set(this.currentBlob);

        if (mode === 'pdf') {
          this.pdfUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(this.currentBlob));
        } else if (mode === 'text') {
          try {
            this.textContent.set(await content.text());
          } catch {
            this.textContent.set('[Contenu texte illisible]');
          }
          this.renderMode.set('text');
        } else if (mode === 'image') {
          this.renderMode.set('image');
        } else {
          this.renderMode.set('fallback');
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.renderMode.set('fallback');
        this.isLoading.set(false);
        this.workspace.setFeedback('Chargement de l\'apercu impossible.', 'error');
      },
    });
  }

  private cleanupBlob(): void {
    if (this.currentBlob) {
      URL.revokeObjectURL(this.currentBlob);
      this.currentBlob = null;
    }
    this.blobUrl.set(null);
    this.pdfUrl.set(null);
  }

  private cleanup(): void {
    this.cleanupBlob();
    this.textContent.set('');
    this.renderMode.set('fallback');
    this.isLoading.set(false);
  }
}
