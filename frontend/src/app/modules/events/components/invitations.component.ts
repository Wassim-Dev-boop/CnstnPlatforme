import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { InvitationService } from '../../../core/services/invitation.service';
import { AuthService } from '../../../core/services/auth.service';
import { AppRole, Invitation, InvitationStatus } from '../../../core/models';

type InvitationTab = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';
type InvitationDirectionFilter = 'ALL' | 'RECEIVED' | 'SENT';

@Component({
  selector: 'app-invitations',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="mx-auto max-w-7xl space-y-6 px-4 py-6">
      <section class="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 class="mb-1 text-2xl font-bold text-gray-900 dark:text-white/90 lg:text-3xl">Invitations</h1>
            <p class="max-w-2xl text-sm text-gray-600 dark:text-gray-400">
              Suivi des invitations aux événements et réponses attendues.
            </p>
            <div class="mt-3 flex flex-wrap items-center gap-2">
              <span class="inline-flex rounded-full bg-brand-500/10 px-3 py-1 text-xs font-semibold text-brand-700 dark:text-brand-300">
                {{ roleLabels[currentRole] }}
              </span>
              <span class="inline-flex rounded-full bg-success-500/10 px-3 py-1 text-xs font-semibold text-success-700 dark:text-success-300">
                Contrôle invitations actif
              </span>
            </div>
          </div>
          <span class="inline-flex w-fit rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
            Total invitations: {{ invitations.length }}
          </span>
        </div>

        <div class="mt-5 grid grid-cols-1 gap-3 md:grid-cols-4">
          <a
            routerLink="/invitations"
            [queryParams]="{ tab: 'PENDING' }"
            (click)="selectTab('PENDING', $event)"
            class="rounded-xl border p-4 text-left transition"
            [ngClass]="activeTab === 'PENDING'
              ? 'border-brand-500 bg-brand-50 dark:border-brand-500/60 dark:bg-brand-500/10'
              : 'border-gray-200 bg-gray-50 hover:border-brand-300 hover:bg-brand-50/40 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-brand-500/10'"
          >
            <p class="text-3xl font-semibold text-gray-900 dark:text-white/90">{{ getFilteredTabCount('PENDING') }}</p>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">En attente</p>
          </a>

          <a
            routerLink="/invitations"
            [queryParams]="{ tab: 'ACCEPTED' }"
            (click)="selectTab('ACCEPTED', $event)"
            class="rounded-xl border p-4 text-left transition"
            [ngClass]="activeTab === 'ACCEPTED'
              ? 'border-brand-500 bg-brand-50 dark:border-brand-500/60 dark:bg-brand-500/10'
              : 'border-gray-200 bg-gray-50 hover:border-brand-300 hover:bg-brand-50/40 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-brand-500/10'"
          >
            <p class="text-3xl font-semibold text-gray-900 dark:text-white/90">{{ getFilteredTabCount('ACCEPTED') }}</p>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Acceptées</p>
          </a>

          <a
            routerLink="/invitations"
            [queryParams]="{ tab: 'DECLINED' }"
            (click)="selectTab('DECLINED', $event)"
            class="rounded-xl border p-4 text-left transition"
            [ngClass]="activeTab === 'DECLINED'
              ? 'border-brand-500 bg-brand-50 dark:border-brand-500/60 dark:bg-brand-500/10'
              : 'border-gray-200 bg-gray-50 hover:border-brand-300 hover:bg-brand-50/40 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-brand-500/10'"
          >
            <p class="text-3xl font-semibold text-gray-900 dark:text-white/90">{{ getFilteredTabCount('DECLINED') }}</p>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Refusées</p>
          </a>

          <a
            routerLink="/invitations"
            [queryParams]="{ tab: 'EXPIRED' }"
            (click)="selectTab('EXPIRED', $event)"
            class="rounded-xl border p-4 text-left transition"
            [ngClass]="activeTab === 'EXPIRED'
              ? 'border-brand-500 bg-brand-50 dark:border-brand-500/60 dark:bg-brand-500/10'
              : 'border-gray-200 bg-gray-50 hover:border-brand-300 hover:bg-brand-50/40 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-brand-500/10'"
          >
            <p class="text-3xl font-semibold text-gray-900 dark:text-white/90">{{ getFilteredTabCount('EXPIRED') }}</p>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Expirées</p>
          </a>
        </div>

        <div class="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_240px_auto_auto]">
          <input
            type="text"
            [(ngModel)]="searchTerm"
            placeholder="Rechercher par événement, expéditeur ou partenaire..."
            class="h-11 w-full rounded-xl border border-gray-300 bg-transparent px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
          />

          <select
            [(ngModel)]="directionFilter"
            class="h-11 rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-700 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
          >
            <option value="ALL">Toutes les directions</option>
            <option value="RECEIVED">Reçues</option>
            <option value="SENT">Envoyées</option>
          </select>

          <button
            type="button"
            (click)="applyFilters()"
            class="h-11 rounded-xl border border-brand-300 px-4 text-sm font-semibold text-brand-700 transition hover:bg-brand-50 dark:border-brand-500/50 dark:text-brand-300 dark:hover:bg-brand-500/10"
          >
            Appliquer
          </button>

          <button
            type="button"
            (click)="resetSearch()"
            class="h-11 rounded-xl border border-gray-300 px-4 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
          >
            Réinitialiser
          </button>
        </div>
      </section>

      <section class="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <div class="mb-5 flex flex-wrap gap-2">
          <a
            *ngFor="let tab of visibleTabs"
            routerLink="/invitations"
            [queryParams]="{ tab: tab.value }"
            (click)="selectTab(tab.value, $event)"
            [ngClass]="activeTab === tab.value
              ? 'border-brand-500 bg-brand-500 text-white'
              : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-white/[0.03]'"
            class="rounded-xl border px-4 py-2 text-sm font-semibold transition"
          >
            {{ tab.label }}
            <span class="ml-1 text-xs">({{ getFilteredTabCount(tab.value) }})</span>
          </a>
        </div>

        <div
          *ngIf="actionFeedback"
          class="mb-4 rounded-xl border px-4 py-2 text-sm"
          [ngClass]="actionFeedbackTone === 'success'
            ? 'border-success-200 bg-success-50 text-success-700 dark:border-success-500/40 dark:bg-success-500/10 dark:text-success-300'
            : 'border-error-200 bg-error-50 text-error-700 dark:border-error-500/40 dark:bg-error-500/10 dark:text-error-300'"
        >
          {{ actionFeedback }}
        </div>

        <div class="space-y-3">
          <div *ngIf="isLoadingInvitations" class="rounded-xl border border-gray-200 bg-gray-50 px-4 py-10 text-center text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
            Chargement des invitations...
          </div>

          <div *ngIf="!isLoadingInvitations && filteredInvitations.length === 0" class="rounded-xl border border-dashed border-gray-300 px-4 py-10 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
            Aucune invitation {{ getActiveTabEmptyLabel() }} avec les filtres actuels.
            <button
              *ngIf="searchTerm || directionFilter !== 'ALL'"
              type="button"
              (click)="resetSearch()"
              class="ml-2 font-semibold text-brand-600 hover:text-brand-700"
            >
              Réinitialiser les filtres
            </button>
          </div>

          <article
            *ngFor="let invitation of filteredInvitations"
            class="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900"
          >
            <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div class="min-w-0 flex-1">
                <h3 class="truncate text-base font-semibold text-gray-900 dark:text-white/90">{{ invitation.eventTitle }}</h3>
                <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">Organisateur: {{ invitation.senderName }}</p>
                <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">Destinataire: {{ invitation.recipientName }} - {{ invitation.recipientEmail }}</p>

                <div class="mt-3 grid grid-cols-1 gap-2 text-sm text-gray-600 sm:grid-cols-2 dark:text-gray-300">
                  <p><span class="font-semibold">Date/heure:</span> {{ invitation.eventDate | date:'short' }}</p>
                  <p><span class="font-semibold">Mode:</span> {{ getEventModeLabel(invitation) }}</p>
                  <p>
                    <span class="font-semibold">{{ isOnlineInvitation(invitation) ? 'Lien' : 'Salle' }}:</span>
                    {{ (isOnlineInvitation(invitation) ? (invitation.onlineMeetingLink || invitation.eventLocation) : invitation.eventLocation) || 'Non précisé' }}
                  </p>
                  <p *ngIf="isExpiredInvitation(invitation)">
                    <span class="font-semibold">Date limite:</span>
                    {{ invitation.eventDate | date:'shortDate' }}
                  </p>
                </div>

                <p *ngIf="invitation.message" class="mt-2 text-sm italic text-gray-500 dark:text-gray-400">
                  "{{ invitation.message }}"
                </p>

                <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Envoyée le {{ invitation.sentAt | date:'short' }}
                  <span *ngIf="invitation.respondedAt">- Réponse le {{ invitation.respondedAt | date:'short' }}</span>
                </p>
              </div>

              <div class="flex min-w-[180px] flex-col gap-2">
                <span class="rounded-full px-3 py-1 text-center text-xs font-semibold" [ngClass]="getInvitationStatusBadgeClass(invitation.status, invitation)">
                  {{ getInvitationStatusLabel(invitation) }}
                </span>

                <div *ngIf="canRespondToInvitation(invitation)" class="grid grid-cols-1 gap-2">
                  <button
                    (click)="acceptInvitation(invitation.id)"
                    class="rounded-lg bg-success-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-success-600"
                  >
                    Accepter
                  </button>
                  <button
                    (click)="openDeclineModal(invitation)"
                    class="rounded-lg bg-error-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-error-600"
                  >
                    Refuser
                  </button>
                </div>
                <p *ngIf="!canRespondToInvitation(invitation)" class="text-[11px] text-gray-500 dark:text-gray-400">
                  {{ getResponseUnavailableReason(invitation) }}
                </p>

                <button
                  type="button"
                  (click)="openInvitationDetails(invitation)"
                  class="rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
                >
                  Détails
                </button>
                <button
                  type="button"
                  (click)="openEvent(invitation.eventId)"
                  [disabled]="!invitation.eventId"
                  class="rounded-lg border border-brand-300 px-3 py-2 text-xs font-semibold text-brand-700 transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-brand-500/50 dark:text-brand-300 dark:hover:bg-brand-500/10"
                >
                  Voir evenement
                </button>
                <button
                  *ngIf="canCancelInvitation(invitation)"
                  type="button"
                  (click)="cancelInvitation(invitation.id)"
                  class="rounded-lg border border-error-300 px-3 py-2 text-xs font-semibold text-error-700 transition hover:bg-error-50 dark:border-error-500/50 dark:text-error-300 dark:hover:bg-error-500/10"
                >
                  Annuler invitation
                </button>
              </div>
            </div>
          </article>
        </div>
      </section>
    </div>

    <div *ngIf="selectedInvitation" class="fixed inset-0 z-[130000] flex items-center justify-center bg-gray-950/60 p-4 backdrop-blur-sm">
      <div class="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
        <div class="mb-4 flex items-start justify-between gap-4">
          <div>
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white/90">{{ selectedInvitation.eventTitle }}</h3>
            <p class="text-sm text-gray-500 dark:text-gray-400">Détails de l'invitation</p>
          </div>
          <button
            type="button"
            (click)="closeInvitationDetails()"
            class="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
          >
            Fermer
          </button>
        </div>

        <div class="grid grid-cols-1 gap-3 text-sm text-gray-700 dark:text-gray-300 sm:grid-cols-2">
          <p><span class="font-semibold">Organisateur:</span> {{ selectedInvitation.senderName }}</p>
          <p><span class="font-semibold">Destinataire:</span> {{ selectedInvitation.recipientName }}</p>
          <p><span class="font-semibold">Date/heure:</span> {{ selectedInvitation.eventDate | date:'full' }}</p>
          <p><span class="font-semibold">Mode:</span> {{ getEventModeLabel(selectedInvitation) }}</p>
          <p class="sm:col-span-2"><span class="font-semibold">{{ isOnlineInvitation(selectedInvitation) ? 'Lien' : 'Salle' }}:</span> {{ (isOnlineInvitation(selectedInvitation) ? (selectedInvitation.onlineMeetingLink || selectedInvitation.eventLocation) : selectedInvitation.eventLocation) || 'Non précisé' }}</p>
          <p class="sm:col-span-2"><span class="font-semibold">Statut:</span> {{ getInvitationStatusLabel(selectedInvitation) }}</p>
          <p *ngIf="selectedInvitation.responseReason" class="sm:col-span-2">
            <span class="font-semibold">Motif:</span> {{ selectedInvitation.responseReason }}
          </p>
          <p *ngIf="selectedInvitation.message" class="sm:col-span-2">
            <span class="font-semibold">Message:</span> {{ selectedInvitation.message }}
          </p>
        </div>
      </div>
    </div>

    <div *ngIf="declineModalInvitation" class="fixed inset-0 z-[135000] flex items-center justify-center bg-gray-950/60 p-4 backdrop-blur-sm">
      <div class="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white/90">Refuser l invitation</h3>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {{ declineModalInvitation.eventTitle }}
        </p>

        <label class="mt-4 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Motif (optionnel)
        </label>
        <textarea
          [(ngModel)]="declineReason"
          rows="3"
          placeholder="Indiquez un motif de refus..."
          class="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
        ></textarea>

        <div class="mt-5 flex justify-end gap-2">
          <button
            type="button"
            (click)="closeDeclineModal()"
            class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
          >
            Annuler
          </button>
          <button
            type="button"
            (click)="confirmDeclineInvitation()"
            class="rounded-lg bg-error-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-error-600"
          >
            Confirmer le refus
          </button>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class InvitationsComponent implements OnInit {
  invitations: Invitation[] = [];
  activeTab: InvitationTab = 'PENDING';
  selectedInvitation: Invitation | null = null;

  currentRole: AppRole = 'EMPLOYEE';
  currentUserId = '';
  currentUsername = '';
  currentEmail = '';
  routeInvitationId = '';

  searchTerm = '';
  directionFilter: InvitationDirectionFilter = 'ALL';
  actionFeedback = '';
  actionFeedbackTone: 'success' | 'error' = 'success';
  isLoadingInvitations = false;

  declineModalInvitation: Invitation | null = null;
  declineReason = '';

  readonly roleLabels: Record<AppRole, string> = {
    ADMIN: 'Administrateur',
    EMPLOYEE: 'Employé',
    MANAGER: 'Chef hiérarchique',
    ROOM_MANAGER: 'Responsable salle',
    IT_MANAGER: 'Responsable IT',
    SECURITY_MANAGER: 'Responsable sécurité',
    DSN_DIRECTOR: 'Directeur DSN',
    QUALITY_MANAGER: 'Responsable qualité'
  };

  constructor(
    private invitationService: InvitationService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const routeTab = this.toInvitationTab(params.get('tab'));
      if (routeTab) {
        this.activeTab = routeTab;
      }
      this.routeInvitationId = params.get('invitationId')?.trim() || '';
      this.tryOpenInvitationFromRoute();
    });

    this.authService.currentUser$.subscribe(user => {
      if (!user) {
        return;
      }

      this.currentRole = user.role;
      this.currentUserId = user.id;
      this.currentUsername = (user.username || '').trim();
      this.currentEmail = (user.email || '').trim().toLowerCase();
      this.loadInvitations();
    });
  }

  get visibleTabs(): Array<{ label: string; value: InvitationTab }> {
    return [
      { label: 'En attente', value: 'PENDING' },
      { label: 'Acceptées', value: 'ACCEPTED' },
      { label: 'Refusées', value: 'DECLINED' },
      { label: 'Expirées', value: 'EXPIRED' },
    ];
  }

  get filteredInvitations(): Invitation[] {
    return this.getFilteredInvitationsForTab(this.activeTab)
      .sort((left, right) => right.sentAt.getTime() - left.sentAt.getTime());
  }

  loadInvitations(): void {
    this.isLoadingInvitations = true;
    this.invitationService.getInvitations(this.currentRole === 'ADMIN').subscribe({
      next: (invitations) => {
        this.invitations = invitations;
        this.isLoadingInvitations = false;
        this.tryOpenInvitationFromRoute();
      },
      error: () => {
        this.invitations = [];
        this.isLoadingInvitations = false;
        this.actionFeedbackTone = 'error';
        this.actionFeedback = 'Impossible de charger les invitations pour le moment.';
      }
    });
  }

  acceptInvitation(id: string): void {
    this.invitationService.acceptInvitation(id).subscribe({
      next: (updated) => {
        if (!updated) {
          this.actionFeedbackTone = 'error';
          this.actionFeedback = 'Réponse impossible (invitation non autorisée ou expirée).';
          return;
        }
        this.setActiveTab('ACCEPTED');
        this.actionFeedbackTone = 'success';
        this.actionFeedback = 'Invitation acceptée.';
        this.loadInvitations();
      },
      error: () => {
        this.actionFeedbackTone = 'error';
        this.actionFeedback = 'Réponse refusée par le serveur (403 ou état invalide).';
      },
    });
  }

  declineInvitation(id: string, reason?: string): void {
    this.invitationService.declineInvitation(id, reason || undefined).subscribe({
      next: (updated) => {
        if (!updated) {
          this.actionFeedbackTone = 'error';
          this.actionFeedback = 'Réponse impossible (invitation non autorisée ou expirée).';
          return;
        }
        this.closeDeclineModal();
        this.setActiveTab('DECLINED');
        this.actionFeedbackTone = 'success';
        this.actionFeedback = 'Invitation refusée.';
        this.loadInvitations();
      },
      error: () => {
        this.actionFeedbackTone = 'error';
        this.actionFeedback = 'Réponse refusée par le serveur (403 ou état invalide).';
      },
    });
  }

  openDeclineModal(invitation: Invitation): void {
    this.declineModalInvitation = invitation;
    this.declineReason = '';
  }

  closeDeclineModal(): void {
    this.declineModalInvitation = null;
    this.declineReason = '';
  }

  confirmDeclineInvitation(): void {
    if (!this.declineModalInvitation) {
      return;
    }
    this.declineInvitation(this.declineModalInvitation.id, this.declineReason.trim() || undefined);
  }

  getTabCount(tab: InvitationTab): number {
    return this.invitations.filter(invitation => this.getInvitationBucket(invitation) === tab).length;
  }

  cancelInvitation(id: string): void {
    this.invitationService.cancelInvitation(id).subscribe({
      next: () => {
        this.setActiveTab('DECLINED');
        this.actionFeedbackTone = 'success';
        this.actionFeedback = 'Invitation annulée.';
        this.loadInvitations();
      },
      error: () => {
        this.actionFeedbackTone = 'error';
        this.actionFeedback = 'Annulation impossible (droits insuffisants ou invitation déjà traitée).';
      },
    });
  }

  getFilteredTabCount(tab: InvitationTab): number {
    return this.getFilteredInvitationsForTab(tab).length;
  }

  selectTab(tab: InvitationTab, event?: Event): void {
    event?.preventDefault();
    this.setActiveTab(tab);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  private setActiveTab(tab: InvitationTab): void {
    this.activeTab = tab;
    this.actionFeedback = '';
    this.selectedInvitation = null;
    this.closeDeclineModal();
  }

  getActiveTabEmptyLabel(): string {
    const labels: Record<InvitationTab, string> = {
      PENDING: 'en attente',
      ACCEPTED: 'acceptée',
      DECLINED: 'refusée',
      EXPIRED: 'expirée',
    };
    return labels[this.activeTab];
  }

  getInvitationStatusLabel(invitation: Invitation): string {
    if (this.isExpiredInvitation(invitation)) {
      return 'EXPIRÉE';
    }

    const labelMap: Record<InvitationStatus, string> = {
      PENDING: 'EN ATTENTE',
      ACCEPTED: 'ACCEPTÉE',
      DECLINED: 'REFUSÉE',
      EXPIRED: 'EXPIRÉE',
      CANCELLED: 'ANNULÉE'
    };
    return labelMap[invitation.status];
  }

  getInvitationStatusBadgeClass(status: InvitationStatus, invitation: Invitation): string {
    if (this.isExpiredInvitation(invitation)) {
      return 'bg-slate-500/10 text-slate-700 dark:text-slate-300';
    }

    const classMap: Record<InvitationStatus, string> = {
      PENDING: 'bg-warning-500/10 text-warning-700 dark:text-warning-300',
      ACCEPTED: 'bg-success-500/10 text-success-700 dark:text-success-300',
      DECLINED: 'bg-error-500/10 text-error-700 dark:text-error-300',
      EXPIRED: 'bg-slate-500/10 text-slate-700 dark:text-slate-300',
      CANCELLED: 'bg-slate-500/10 text-slate-700 dark:text-slate-300'
    };
    return classMap[status];
  }

  resetSearch(): void {
    this.searchTerm = '';
    this.directionFilter = 'ALL';
    this.actionFeedback = '';
  }

  applyFilters(): void {
    // UI intentionnellement simple: les filtres sont appliqués en temps réel via les getters.
    this.actionFeedback = '';
  }

  isExpiredInvitation(invitation: Invitation): boolean {
    if (invitation.status === InvitationStatus.EXPIRED) {
      return true;
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      return false;
    }

    const expirationDate = invitation.expiresAt || invitation.eventDate;
    const eventDate = expirationDate instanceof Date ? expirationDate : new Date(expirationDate);
    return eventDate.getTime() < Date.now();
  }

  getEventModeLabel(invitation: Invitation): string {
    if (invitation.eventMode === 'EN_LIGNE') {
      return 'En ligne';
    }
    if (invitation.eventMode === 'HYBRIDE') {
      return 'Hybride';
    }

    if (this.isOnlineInvitation(invitation)) {
      return 'En ligne';
    }

    return 'Présentiel';
  }

  isOnlineInvitation(invitation: Invitation): boolean {
    if (invitation.eventMode === 'EN_LIGNE' || invitation.eventMode === 'HYBRIDE') {
      return true;
    }
    const link = (invitation.onlineMeetingLink || '').toLowerCase();
    const location = (invitation.eventLocation || '').toLowerCase();
    return link.startsWith('https://') || location.includes('http') || location.includes('teams') || location.includes('meet');
  }

  openInvitationDetails(invitation: Invitation): void {
    this.selectedInvitation = invitation;
  }

  closeInvitationDetails(): void {
    this.selectedInvitation = null;
  }

  openEvent(eventId: string): void {
    if (!eventId) {
      this.actionFeedbackTone = 'error';
      this.actionFeedback = 'Impossible d ouvrir l evenement: identifiant manquant.';
      return;
    }
    void this.router.navigate(['/events'], { queryParams: { eventId } });
  }

  private getInvitationBucket(invitation: Invitation): InvitationTab {
    if (invitation.status === InvitationStatus.EXPIRED || this.isExpiredInvitation(invitation)) {
      return 'EXPIRED';
    }

    if (invitation.status === InvitationStatus.ACCEPTED) {
      return 'ACCEPTED';
    }
    if (invitation.status === InvitationStatus.DECLINED || invitation.status === InvitationStatus.CANCELLED) {
      return 'DECLINED';
    }
    return 'PENDING';
  }

  private toInvitationTab(value: string | null): InvitationTab | null {
    const normalized = (value || '').trim().toUpperCase();
    if (normalized === 'PENDING' || normalized === 'ACCEPTED' || normalized === 'DECLINED' || normalized === 'EXPIRED') {
      return normalized;
    }
    return null;
  }

  private getFilteredInvitationsForTab(tab: InvitationTab): Invitation[] {
    return this.invitations
      .filter(invitation => this.getInvitationBucket(invitation) === tab)
      .filter(invitation => this.matchesDirectionFilter(invitation))
      .filter(invitation => this.matchesSearch(invitation));
  }

  private matchesDirectionFilter(invitation: Invitation): boolean {
    if (this.directionFilter === 'ALL') {
      return true;
    }

    const invitationRecipient = (invitation.recipientUsername || invitation.recipientId || '').trim().toLowerCase();
    const invitationRecipientEmail = (invitation.recipientEmail || '').trim().toLowerCase();
    const invitationSender = (invitation.senderUsername || invitation.senderId || '').trim().toLowerCase();

    const currentCandidates = [
      this.currentUserId,
      this.currentUsername,
      this.currentEmail,
    ]
      .map((value) => (value || '').trim().toLowerCase())
      .filter((value) => !!value);

    const isRecipient = currentCandidates.some((candidate) =>
      candidate === invitationRecipient || candidate === invitationRecipientEmail,
    );
    const isSender = currentCandidates.some((candidate) => candidate === invitationSender);

    if (this.directionFilter === 'RECEIVED') {
      return isRecipient;
    }

    return isSender;
  }

  canRespondToInvitation(invitation: Invitation): boolean {
    if (invitation.status !== InvitationStatus.PENDING || this.isExpiredInvitation(invitation)) {
      return false;
    }

    const invitationRecipient = (invitation.recipientUsername || invitation.recipientId || '').trim().toLowerCase();
    const invitationRecipientEmail = (invitation.recipientEmail || '').trim().toLowerCase();
    const currentCandidates = [
      this.currentUserId,
      this.currentUsername,
      this.currentEmail,
    ]
      .map((value) => (value || '').trim().toLowerCase())
      .filter((value) => !!value);

    return currentCandidates.some((candidate) =>
      candidate === invitationRecipient || candidate === invitationRecipientEmail,
    );
  }

  canCancelInvitation(invitation: Invitation): boolean {
    if (invitation.status !== InvitationStatus.PENDING || this.isExpiredInvitation(invitation)) {
      return false;
    }

    if (this.currentRole === 'ADMIN') {
      return true;
    }

    const invitationSender = (invitation.senderUsername || invitation.senderId || '').trim().toLowerCase();
    return [this.currentUserId, this.currentUsername, this.currentEmail]
      .map((value) => (value || '').trim().toLowerCase())
      .filter((value) => !!value)
      .some((candidate) => candidate === invitationSender);
  }

  getResponseUnavailableReason(invitation: Invitation): string {
    if (invitation.status !== InvitationStatus.PENDING) {
      return 'Invitation deja traitee.';
    }

    if (this.isExpiredInvitation(invitation)) {
      return 'Invitation expiree.';
    }

    return 'Reponse reservee au destinataire.';
  }

  private tryOpenInvitationFromRoute(): void {
    if (!this.routeInvitationId || this.invitations.length === 0) {
      return;
    }

    const target = this.invitations.find((invitation) => invitation.id === this.routeInvitationId);
    if (!target) {
      this.actionFeedbackTone = 'error';
      this.actionFeedback = 'Invitation introuvable ou non autorisee pour ce compte.';
      return;
    }

    this.openInvitationDetails(target);
    this.routeInvitationId = '';
  }

  private matchesSearch(invitation: Invitation): boolean {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) {
      return true;
    }

    return [
      invitation.eventTitle,
      invitation.eventLocation,
      invitation.senderName,
      invitation.recipientName,
      invitation.recipientEmail,
      invitation.partnerOrganization || '',
      invitation.message || '',
      invitation.status
    ]
      .join(' ')
      .toLowerCase()
      .includes(term);
  }
}
