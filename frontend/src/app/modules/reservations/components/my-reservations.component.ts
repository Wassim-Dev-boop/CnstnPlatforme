import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subscription, forkJoin } from 'rxjs';
import { AppUserProfile, EquipmentReservation, RoomReservation } from '../../../core/models';
import { AuthService } from '../../../core/services/auth.service';
import { ReservationService } from '../../../core/services/reservation.service';

type ReservationKind = 'room' | 'equipment';
type ReservationScopeFilter = 'all' | ReservationKind;

interface PersonalReservationCard {
  id: string;
  kind: ReservationKind;
  userId: string;
  userName: string;
  title: string;
  description: string;
  purpose: string;
  status: RoomReservation['status'] | EquipmentReservation['status'];
  startDate: Date;
  endDate: Date;
  createdAt: Date;
  referenceCode?: string;
  eventId?: string;
  quantityLabel: string;
  sourceRoute: string;
  sourceQueryParams: Record<string, string>;
}

@Component({
  selector: 'app-my-reservations',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="space-y-6">
      <section class="relative overflow-hidden rounded-3xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900 sm:p-8">
        <div class="absolute inset-0 bg-gradient-to-br from-brand-500/10 via-transparent to-success-500/10"></div>

        <div class="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700 dark:text-brand-300">Reservations personnelles</p>
            <h1 class="mt-2 text-2xl font-bold text-gray-900 dark:text-white/90 lg:text-3xl">Mes reservations</h1>
            <p class="mt-3 max-w-3xl text-sm text-gray-600 dark:text-gray-300">
              Retrouvez ici vos reservations de salles et d'equipements sous forme de cartes, avec le statut, les dates et les actions utiles.
            </p>
            <p *ngIf="currentUserLabel" class="mt-2 text-sm font-medium text-gray-500 dark:text-gray-400">
              Connecte en tant que {{ currentUserLabel }}
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <a
              routerLink="/reservations/salles"
              class="inline-flex h-11 items-center justify-center rounded-xl border border-brand-300 px-4 text-sm font-semibold text-brand-700 transition hover:bg-brand-50 dark:border-brand-500/50 dark:text-brand-300 dark:hover:bg-brand-500/10"
            >
              Reserver une salle
            </a>
            <a
              routerLink="/reservations/equipements"
              class="inline-flex h-11 items-center justify-center rounded-xl border border-gray-300 px-4 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
            >
              Reserver un equipement
            </a>
            <button
              type="button"
              (click)="reloadReservations()"
              [disabled]="loading"
              class="inline-flex h-11 items-center justify-center rounded-xl bg-success-500 px-4 text-sm font-semibold text-white transition hover:bg-success-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {{ loading ? 'Actualisation...' : 'Actualiser' }}
            </button>
          </div>
        </div>

        <div class="relative mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <article class="rounded-2xl border border-gray-200 bg-white/80 p-4 backdrop-blur dark:border-gray-700 dark:bg-gray-950/30">
            <p class="text-3xl font-semibold text-gray-900 dark:text-white/90">{{ totalReservations }}</p>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Reservations visibles</p>
          </article>

          <article class="rounded-2xl border border-gray-200 bg-white/80 p-4 backdrop-blur dark:border-gray-700 dark:bg-gray-950/30">
            <p class="text-3xl font-semibold text-brand-600 dark:text-brand-300">{{ upcomingCount }}</p>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">A venir</p>
          </article>

          <article class="rounded-2xl border border-gray-200 bg-white/80 p-4 backdrop-blur dark:border-gray-700 dark:bg-gray-950/30">
            <p class="text-3xl font-semibold text-warning-600 dark:text-warning-300">{{ pendingCount }}</p>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">En attente</p>
          </article>

          <article class="rounded-2xl border border-gray-200 bg-white/80 p-4 backdrop-blur dark:border-gray-700 dark:bg-gray-950/30">
            <p class="text-3xl font-semibold text-success-600 dark:text-success-300">{{ approvedCount }}</p>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Approuvees</p>
          </article>
        </div>
      </section>

      <section class="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div class="flex flex-wrap gap-2">
            <button
              *ngFor="let filter of scopeFilters"
              type="button"
              (click)="scopeFilter = filter.value"
              class="rounded-full border px-4 py-2 text-sm font-semibold transition"
              [ngClass]="scopeFilter === filter.value
                ? 'border-brand-500 bg-brand-500 text-white'
                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-white/[0.03]'"
            >
              {{ filter.label }}
            </button>
          </div>

          <div class="flex w-full gap-2 lg:max-w-2xl">
            <input
              type="search"
              [(ngModel)]="searchTerm"
              placeholder="Rechercher une reservation, un motif ou une reference..."
              class="h-11 min-w-0 flex-1 rounded-xl border border-gray-300 bg-transparent px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            />
            <button
              type="button"
              (click)="clearSearch()"
              [disabled]="!searchTerm.trim()"
              class="h-11 rounded-xl border border-gray-300 px-4 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
            >
              Effacer
            </button>
          </div>
        </div>
      </section>

      <div *ngIf="loading" class="rounded-2xl border border-gray-200 bg-white px-6 py-8 text-center text-sm text-gray-500 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-300">
        Chargement de vos reservations...
      </div>

      <div *ngIf="!loading && loadError" class="rounded-2xl border border-error-200 bg-error-50 px-6 py-4 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-300">
        {{ loadError }}
      </div>

      <div *ngIf="!loading && !loadError && filteredReservations.length === 0" class="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-10 text-center dark:border-gray-700 dark:bg-gray-900">
        <p class="text-lg font-semibold text-gray-900 dark:text-white/90">Aucune reservation trouvee</p>
        <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Essayez un autre mot-cle ou commencez une nouvelle reservation depuis les pages salles et equipements.
        </p>
        <div class="mt-5 flex flex-wrap justify-center gap-2">
          <a
            routerLink="/reservations/salles"
            class="inline-flex h-10 items-center justify-center rounded-lg border border-brand-300 px-4 text-sm font-semibold text-brand-700 transition hover:bg-brand-50 dark:border-brand-500/50 dark:text-brand-300 dark:hover:bg-brand-500/10"
          >
            Reserver une salle
          </a>
          <a
            routerLink="/reservations/equipements"
            class="inline-flex h-10 items-center justify-center rounded-lg border border-gray-300 px-4 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
          >
            Reserver un equipement
          </a>
        </div>
      </div>

      <div *ngIf="!loading && !loadError && upcomingReservations.length > 0" class="space-y-3">
        <div class="flex items-center justify-between gap-3">
          <div>
            <h2 class="text-xl font-semibold text-gray-900 dark:text-white/90">A venir</h2>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Les reservations qui commencent ou se poursuivent bientot.</p>
          </div>
          <span class="inline-flex rounded-full bg-brand-500/10 px-3 py-1 text-xs font-semibold text-brand-700 dark:text-brand-300">
            {{ upcomingReservations.length }}
          </span>
        </div>

        <div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <article
            *ngFor="let reservation of upcomingReservations; trackBy: trackByReservation"
            class="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg dark:border-gray-800 dark:bg-white/[0.03]"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="inline-flex rounded-full px-3 py-1 text-xs font-semibold" [ngClass]="getKindBadgeClass(reservation.kind)">
                    {{ getKindLabel(reservation.kind) }}
                  </span>
                  <span *ngIf="reservation.referenceCode" class="inline-flex rounded-full border border-gray-200 bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                    {{ reservation.referenceCode }}
                  </span>
                </div>
                <h3 class="mt-3 text-lg font-semibold text-gray-900 dark:text-white/90">{{ reservation.title }}</h3>
                <p class="mt-1 text-sm text-gray-600 dark:text-gray-300">{{ reservation.description }}</p>
              </div>

              <span class="inline-flex shrink-0 rounded-full px-3 py-1 text-xs font-semibold" [ngClass]="getStatusBadgeClass(reservation.status)">
                {{ getStatusLabel(reservation.status) }}
              </span>
            </div>

            <div class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div class="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900">
                <p class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Debut</p>
                <p class="mt-1 text-sm font-semibold text-gray-900 dark:text-white/90">{{ formatDateTime(reservation.startDate) }}</p>
              </div>
              <div class="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900">
                <p class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Fin</p>
                <p class="mt-1 text-sm font-semibold text-gray-900 dark:text-white/90">{{ formatDateTime(reservation.endDate) }}</p>
              </div>
              <div class="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900">
                <p class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Details</p>
                <p class="mt-1 text-sm font-semibold text-gray-900 dark:text-white/90">{{ reservation.quantityLabel }}</p>
              </div>
              <div class="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900">
                <p class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Duree</p>
                <p class="mt-1 text-sm font-semibold text-gray-900 dark:text-white/90">{{ formatDuration(reservation.startDate, reservation.endDate) }}</p>
              </div>
            </div>

            <div class="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
              <p class="font-medium text-gray-800 dark:text-gray-100">Motif</p>
              <p class="mt-1">{{ reservation.purpose || 'Aucun motif renseigne.' }}</p>
              <p class="mt-3 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {{ reservation.eventId ? 'Evenement lie' : 'Reservation independante' }}
              </p>
            </div>

            <div class="mt-4 flex flex-wrap gap-2">
              <a
                [routerLink]="reservation.sourceRoute"
                [queryParams]="reservation.sourceQueryParams"
                class="inline-flex h-10 items-center justify-center rounded-lg border border-gray-300 px-3 text-xs font-semibold text-gray-700 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
              >
                Ouvrir le module
              </a>
              <button
                type="button"
                (click)="downloadReservationPdf(reservation)"
                class="inline-flex h-10 items-center justify-center rounded-lg border border-brand-300 px-3 text-xs font-semibold text-brand-700 transition hover:bg-brand-50 dark:border-brand-500/50 dark:text-brand-300 dark:hover:bg-brand-500/10"
              >
                Telecharger PDF
              </button>
            </div>
          </article>
        </div>
      </div>

      <div *ngIf="!loading && !loadError && pastReservations.length > 0" class="space-y-3">
        <div class="flex items-center justify-between gap-3">
          <div>
            <h2 class="text-xl font-semibold text-gray-900 dark:text-white/90">Historique</h2>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Les reservations deja terminees ou archivees.</p>
          </div>
          <span class="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
            {{ pastReservations.length }}
          </span>
        </div>

        <div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <article
            *ngFor="let reservation of pastReservations; trackBy: trackByReservation"
            class="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg dark:border-gray-800 dark:bg-white/[0.03]"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="inline-flex rounded-full px-3 py-1 text-xs font-semibold" [ngClass]="getKindBadgeClass(reservation.kind)">
                    {{ getKindLabel(reservation.kind) }}
                  </span>
                  <span *ngIf="reservation.referenceCode" class="inline-flex rounded-full border border-gray-200 bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                    {{ reservation.referenceCode }}
                  </span>
                </div>
                <h3 class="mt-3 text-lg font-semibold text-gray-900 dark:text-white/90">{{ reservation.title }}</h3>
                <p class="mt-1 text-sm text-gray-600 dark:text-gray-300">{{ reservation.description }}</p>
              </div>

              <span class="inline-flex shrink-0 rounded-full px-3 py-1 text-xs font-semibold" [ngClass]="getStatusBadgeClass(reservation.status)">
                {{ getStatusLabel(reservation.status) }}
              </span>
            </div>

            <div class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div class="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900">
                <p class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Debut</p>
                <p class="mt-1 text-sm font-semibold text-gray-900 dark:text-white/90">{{ formatDateTime(reservation.startDate) }}</p>
              </div>
              <div class="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900">
                <p class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Fin</p>
                <p class="mt-1 text-sm font-semibold text-gray-900 dark:text-white/90">{{ formatDateTime(reservation.endDate) }}</p>
              </div>
              <div class="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900">
                <p class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Details</p>
                <p class="mt-1 text-sm font-semibold text-gray-900 dark:text-white/90">{{ reservation.quantityLabel }}</p>
              </div>
              <div class="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900">
                <p class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Duree</p>
                <p class="mt-1 text-sm font-semibold text-gray-900 dark:text-white/90">{{ formatDuration(reservation.startDate, reservation.endDate) }}</p>
              </div>
            </div>

            <div class="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
              <p class="font-medium text-gray-800 dark:text-gray-100">Motif</p>
              <p class="mt-1">{{ reservation.purpose || 'Aucun motif renseigne.' }}</p>
              <p class="mt-3 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {{ reservation.eventId ? 'Evenement lie' : 'Reservation independante' }}
              </p>
            </div>

            <div class="mt-4 flex flex-wrap gap-2">
              <a
                [routerLink]="reservation.sourceRoute"
                [queryParams]="reservation.sourceQueryParams"
                class="inline-flex h-10 items-center justify-center rounded-lg border border-gray-300 px-3 text-xs font-semibold text-gray-700 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
              >
                Ouvrir le module
              </a>
              <button
                type="button"
                (click)="downloadReservationPdf(reservation)"
                class="inline-flex h-10 items-center justify-center rounded-lg border border-brand-300 px-3 text-xs font-semibold text-brand-700 transition hover:bg-brand-50 dark:border-brand-500/50 dark:text-brand-300 dark:hover:bg-brand-500/10"
              >
                Telecharger PDF
              </button>
            </div>
          </article>
        </div>
      </div>

      <div
        *ngIf="feedbackMessage"
        class="rounded-xl border px-4 py-3 text-sm"
        [ngClass]="feedbackTone === 'success'
          ? 'border-success-200 bg-success-50 text-success-700 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-300'
          : 'border-error-200 bg-error-50 text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-300'"
      >
        {{ feedbackMessage }}
      </div>
    </div>
  `,
})
export class MyReservationsComponent implements OnInit, OnDestroy {
  currentUser: AppUserProfile | null = null;
  currentUserLabel = '';

  loading = false;
  loadError = '';
  feedbackMessage = '';
  feedbackTone: 'success' | 'error' = 'success';
  searchTerm = '';
  scopeFilter: ReservationScopeFilter = 'all';

  reservations: PersonalReservationCard[] = [];

  readonly scopeFilters: Array<{ value: ReservationScopeFilter; label: string }> = [
    { value: 'all', label: 'Toutes' },
    { value: 'room', label: 'Salles' },
    { value: 'equipment', label: 'Equipements' },
  ];

  private readonly subscriptions = new Subscription();
  private loadSubscription?: Subscription;

  constructor(
    private readonly authService: AuthService,
    private readonly reservationService: ReservationService,
  ) {}

  ngOnInit(): void {
    this.subscriptions.add(
      this.authService.currentUser$.subscribe((user) => {
        this.currentUser = user;
        this.currentUserLabel = this.formatUserLabel(user);
        if (user) {
          this.loadReservations();
        } else {
          this.reservations = [];
          this.loading = false;
        }
      }),
    );
  }

  ngOnDestroy(): void {
    this.loadSubscription?.unsubscribe();
    this.subscriptions.unsubscribe();
  }

  get filteredReservations(): PersonalReservationCard[] {
    const term = this.normalize(this.searchTerm);
    return [...this.reservations]
      .filter((reservation) => this.matchesScopeFilter(reservation) && this.matchesSearch(reservation, term))
      .sort((left, right) => this.sortReservations(left, right));
  }

  get upcomingReservations(): PersonalReservationCard[] {
    const now = Date.now();
    return this.filteredReservations.filter((reservation) => reservation.endDate.getTime() >= now);
  }

  get pastReservations(): PersonalReservationCard[] {
    const now = Date.now();
    return this.filteredReservations.filter((reservation) => reservation.endDate.getTime() < now);
  }

  get totalReservations(): number {
    return this.filteredReservations.length;
  }

  get upcomingCount(): number {
    return this.upcomingReservations.length;
  }

  get pendingCount(): number {
    return this.filteredReservations.filter((reservation) => reservation.status === 'PENDING').length;
  }

  get approvedCount(): number {
    return this.filteredReservations.filter((reservation) => reservation.status === 'APPROVED').length;
  }

  reloadReservations(): void {
    this.loadReservations();
  }

  clearSearch(): void {
    this.searchTerm = '';
  }

  trackByReservation(_index: number, reservation: PersonalReservationCard): string {
    return `${reservation.kind}-${reservation.id}`;
  }

  getKindLabel(kind: ReservationKind): string {
    return kind === 'room' ? 'Salle' : 'Equipement';
  }

  getKindBadgeClass(kind: ReservationKind): string {
    if (kind === 'room') {
      return 'bg-brand-500/10 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300';
    }

    return 'bg-warning-500/10 text-warning-700 dark:bg-warning-500/20 dark:text-warning-300';
  }

  getStatusLabel(status: RoomReservation['status'] | EquipmentReservation['status']): string {
    if (status === 'PENDING') {
      return 'En attente';
    }
    if (status === 'APPROVED') {
      return 'Approuvee';
    }
    if (status === 'IN_USE') {
      return 'En cours';
    }
    if (status === 'RETURNED' || status === 'COMPLETED') {
      return 'Terminee';
    }
    return 'Annulee';
  }

  getStatusBadgeClass(status: RoomReservation['status'] | EquipmentReservation['status']): string {
    if (status === 'PENDING') {
      return 'bg-warning-50 text-warning-700 dark:bg-warning-500/20 dark:text-warning-300';
    }
    if (status === 'APPROVED') {
      return 'bg-success-50 text-success-700 dark:bg-success-500/20 dark:text-success-300';
    }
    if (status === 'IN_USE') {
      return 'bg-brand-50 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300';
    }
    if (status === 'RETURNED' || status === 'COMPLETED') {
      return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
    }
    return 'bg-error-50 text-error-700 dark:bg-error-500/20 dark:text-error-300';
  }

  formatDateTime(date: Date): string {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  formatDuration(startDate: Date, endDate: Date): string {
    const durationMinutes = Math.max(0, Math.round((endDate.getTime() - startDate.getTime()) / 60000));
    if (durationMinutes < 60) {
      return `${durationMinutes} min`;
    }

    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;
    return minutes > 0 ? `${hours}h ${minutes}` : `${hours}h`;
  }

  downloadReservationPdf(reservation: PersonalReservationCard): void {
    this.reservationService.downloadLatestOfficialDocument(reservation.id).subscribe({
      next: () => {
        this.showFeedback('PDF officiel de reservation telecharge.', 'success');
      },
      error: () => {
        this.showFeedback('Aucun PDF officiel disponible pour cette reservation.', 'error');
      },
    });
  }

  private loadReservations(): void {
    const user = this.currentUser ?? this.authService.currentUser;
    if (!user) {
      this.reservations = [];
      this.loading = false;
      this.loadError = 'Utilisateur non authentifie.';
      return;
    }

    this.loadSubscription?.unsubscribe();
    this.loading = true;
    this.loadError = '';
    this.feedbackMessage = '';

    const requesterUsername = user.username?.trim() || user.email?.split('@')[0]?.trim() || '';
    const queryOptions = {
      page: 0,
      size: 500,
      sort: 'startAt,desc',
      ...(requesterUsername ? { requesterUsername } : {}),
    };

    this.loadSubscription = forkJoin({
      rooms: this.reservationService.getRoomReservations(queryOptions),
      equipment: this.reservationService.getEquipmentReservations(queryOptions),
    }).subscribe({
      next: ({ rooms, equipment }) => {
        const cards = [
          ...rooms.map((reservation) => this.toRoomCard(reservation)),
          ...equipment.map((reservation) => this.toEquipmentCard(reservation)),
        ]
          .filter((reservation) => this.belongsToCurrentUser(reservation))
          .sort((left, right) => this.sortReservations(left, right));

        this.reservations = cards;
        this.loading = false;
      },
      error: () => {
        this.reservations = [];
        this.loading = false;
        this.loadError = 'Chargement des reservations impossible. Verifiez vos droits puis reessayez.';
      },
    });
  }

  private toRoomCard(reservation: RoomReservation): PersonalReservationCard {
    return {
      id: reservation.id,
      kind: 'room',
      userId: reservation.userId,
      userName: reservation.userName,
      title: reservation.roomName || 'Salle',
      description: reservation.referenceCode ? `Reference ${reservation.referenceCode}` : 'Reservation de salle',
      purpose: reservation.purpose || reservation.title || '',
      status: reservation.status,
      startDate: reservation.startDate,
      endDate: reservation.endDate,
      createdAt: reservation.createdAt,
      referenceCode: reservation.referenceCode,
      eventId: reservation.eventId,
      quantityLabel: `${Math.max(1, reservation.attendeeCount || 1)} participant(s)`,
      sourceRoute: '/reservations/salles',
      sourceQueryParams: reservation.roomName ? { search: reservation.roomName } : {},
    };
  }

  private toEquipmentCard(reservation: EquipmentReservation): PersonalReservationCard {
    return {
      id: reservation.id,
      kind: 'equipment',
      userId: reservation.userId,
      userName: reservation.userName,
      title: reservation.equipmentName || 'Equipement',
      description: reservation.referenceCode ? `Reference ${reservation.referenceCode}` : 'Reservation equipement',
      purpose: reservation.purpose || '',
      status: reservation.status,
      startDate: reservation.startDate,
      endDate: reservation.endDate,
      createdAt: reservation.createdAt,
      referenceCode: reservation.referenceCode,
      eventId: reservation.eventId,
      quantityLabel: `${Math.max(1, reservation.quantityRequested || 1)} exemplaire(s)`,
      sourceRoute: '/reservations/equipements',
      sourceQueryParams: reservation.equipmentName ? { search: reservation.equipmentName } : {},
    };
  }

  private matchesScopeFilter(reservation: PersonalReservationCard): boolean {
    if (this.scopeFilter === 'all') {
      return true;
    }

    return reservation.kind === this.scopeFilter;
  }

  private matchesSearch(reservation: PersonalReservationCard, term: string): boolean {
    if (!term) {
      return true;
    }

    return this.normalize([
      reservation.title,
      reservation.description,
      reservation.purpose,
      reservation.referenceCode || '',
      reservation.eventId || '',
      reservation.userName,
      reservation.quantityLabel,
      reservation.kind === 'room' ? 'salle' : 'equipement',
    ].join(' ')).includes(term);
  }

  private sortReservations(left: PersonalReservationCard, right: PersonalReservationCard): number {
    const leftUpcoming = left.endDate.getTime() >= Date.now();
    const rightUpcoming = right.endDate.getTime() >= Date.now();

    if (leftUpcoming !== rightUpcoming) {
      return leftUpcoming ? -1 : 1;
    }

    if (leftUpcoming) {
      return left.startDate.getTime() - right.startDate.getTime();
    }

    return right.startDate.getTime() - left.startDate.getTime();
  }

  private belongsToCurrentUser(reservation: PersonalReservationCard): boolean {
    const user = this.currentUser ?? this.authService.currentUser;
    if (!user) {
      return false;
    }

    const identities = this.currentUserIdentities(user);
    return this.matchesIdentityValue(reservation.userId, identities, false)
      || this.matchesIdentityValue(reservation.userName, identities, true);
  }

  private currentUserIdentities(user: AppUserProfile): string[] {
    const values = new Set<string>();
    const add = (value?: string): void => {
      const normalized = this.normalizeIdentity(value);
      if (normalized) {
        values.add(normalized);
      }
    };

    add(user.id);
    add(user.username);
    add(user.username?.split('.')[0]);
    add(user.username?.split('@')[0]);
    add(user.email);
    add(user.email?.split('@')[0]);
    add(`${user.firstName} ${user.lastName}`);
    add(`${user.lastName} ${user.firstName}`);
    add(user.firstName);
    add(user.lastName);

    return Array.from(values);
  }

  private matchesIdentityValue(targetValue: string | undefined, identities: string[], allowContains: boolean): boolean {
    const normalizedTarget = this.normalizeIdentity(targetValue);
    if (!normalizedTarget) {
      return false;
    }

    if (identities.includes(normalizedTarget)) {
      return true;
    }

    if (!allowContains) {
      return false;
    }

    return identities.some((identity) =>
      identity.length >= 3 && (normalizedTarget.includes(identity) || identity.includes(normalizedTarget)),
    );
  }

  private normalizeIdentity(value?: string): string {
    return (value ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private normalize(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private formatUserLabel(user: AppUserProfile | null): string {
    if (!user) {
      return '';
    }

    const displayName = `${user.firstName} ${user.lastName}`.trim();
    if (displayName) {
      return displayName;
    }

    return user.username || user.email || 'Utilisateur';
  }

  private showFeedback(message: string, tone: 'success' | 'error'): void {
    this.feedbackMessage = tone === 'error' ? this.sanitizeFeedbackMessage(message) : message;
    this.feedbackTone = tone;
  }

  private sanitizeFeedbackMessage(message: string): string {
    const trimmed = message.trim();
    if (!trimmed) {
      return '';
    }

    if (trimmed.length > 260) {
      return 'Erreur serveur lors du telechargement de la reservation.';
    }

    return trimmed;
  }
}
