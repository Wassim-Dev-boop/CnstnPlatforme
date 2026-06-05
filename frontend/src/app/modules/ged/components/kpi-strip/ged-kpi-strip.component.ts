import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { GedWorkspaceService } from '../../services/ged-workspace.service';

interface KpiTile {
  id: 'drafts' | 'inReview' | 'published' | 'archived';
  label: string;
  count: number;
  tone: 'gray' | 'warning' | 'success' | 'muted';
  icon: string;
}

@Component({
  selector: 'app-ged-kpi-strip',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div
      class="grid grid-cols-2 gap-2 sm:grid-cols-4"
      data-testid="ged-kpi-strip"
    >
      <button
        *ngFor="let tile of tiles(); trackBy: trackTile"
        type="button"
        (click)="onTileClick(tile.id)"
        [attr.data-testid]="'ged-kpi-' + tile.id"
        class="flex items-center gap-3 rounded-xl border bg-white px-3 py-2.5 text-left shadow-theme-xs transition hover:border-brand-300 hover:shadow"
        [ngClass]="{
          'border-warning-200': tile.tone === 'warning',
          'border-success-200': tile.tone === 'success',
          'border-gray-200': tile.tone === 'gray',
          'border-gray-200 opacity-80': tile.tone === 'muted'
        }"
      >
        <span
          class="inline-flex size-9 shrink-0 items-center justify-center rounded-lg"
          [ngClass]="{
            'bg-warning-500/10 text-warning-700': tile.tone === 'warning',
            'bg-success-500/10 text-success-700': tile.tone === 'success',
            'bg-gray-100 text-gray-700': tile.tone === 'gray' || tile.tone === 'muted'
          }"
        >
          <svg class="size-4" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path [attr.d]="tile.icon" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </span>
        <span class="min-w-0">
          <span class="block text-[11px] font-semibold uppercase tracking-wide text-gray-500">{{ tile.label }}</span>
          <span class="block text-lg font-bold text-gray-900">{{ tile.count }}</span>
        </span>
      </button>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
})
export class GedKpiStripComponent {
  private readonly workspace = inject(GedWorkspaceService);

  readonly tiles = computed<KpiTile[]>(() => {
    const kpi = this.workspace.kpi();
    const status = this.workspace.selectedStatus();
    return [
      {
        id: 'drafts',
        label: 'Brouillons',
        count: kpi.drafts,
        tone: 'gray',
        icon: 'M5 4.5h7l3 3v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-10a1 1 0 0 1 1-1Z',
        active: status === 'Brouillon',
      },
      {
        id: 'inReview',
        label: 'En attente',
        count: kpi.inReview,
        tone: 'warning',
        icon: 'M10 3.5l6 2v4c0 4-3 7-6 7.5-3-0.5-6-3.5-6-7.5v-4l6-2Z',
        active: status === 'En attente qualite',
      },
      {
        id: 'published',
        label: 'Publies',
        count: kpi.published,
        tone: 'success',
        icon: 'M3.5 10l4 4 9-9',
        active: status === 'Publie',
      },
      {
        id: 'archived',
        label: 'Archives',
        count: kpi.archived,
        tone: 'muted',
        icon: 'M3.5 6.5h13M6 6.5v9h8v-9M8.5 6.5V4.5h3v2',
        active: status === 'Archive' || status === 'Obsolete',
      },
    ];
  });

  trackTile(_index: number, tile: KpiTile): string {
    return tile.id;
  }

  onTileClick(tileId: KpiTile['id']): void {
    const current = this.workspace.selectedStatus();
    let next: typeof current = 'ALL';
    if (tileId === 'drafts' && current !== 'Brouillon') {
      next = 'Brouillon';
    } else if (tileId === 'inReview' && current !== 'En attente qualite') {
      next = 'En attente qualite';
    } else if (tileId === 'published' && current !== 'Publie') {
      next = 'Publie';
    } else if (tileId === 'archived' && current !== 'Archive') {
      next = 'Archive';
    }
    this.workspace.selectedStatus.set(next);
    this.workspace.currentPage.set(1);
  }
}
