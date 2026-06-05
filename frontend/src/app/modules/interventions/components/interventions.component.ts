import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InterventionService } from '../../../core/services/intervention.service';
import { AuthService } from '../../../core/services/auth.service';
import { AppRole, Intervention, InterventionStatus, InterventionPriority } from '../../../core/models';
import { Option, SelectComponent } from '../../../shared/components/form/select/select.component';
import { HttpErrorResponse } from '@angular/common/http';
import { hasBackendToken } from '../../../core/config/backend-api.config';
import { Subscription } from 'rxjs';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-interventions',
  standalone: true,
  imports: [CommonModule, FormsModule, SelectComponent],
  template: `
    <div class="container mx-auto px-4 py-6">
      <div class="mb-6">
        <h1 class="text-3xl font-bold text-gray-800 mb-2">Interventions techniques</h1>
        <p class="text-gray-600">Suivi des demandes et pilotage du cycle d intervention par role</p>
        <div class="mt-2 inline-flex rounded-full bg-brand-500/10 px-3 py-1 text-xs font-semibold text-brand-700">
          Role: {{ roleLabels[currentRole] }}
        </div>
        <div
          *ngIf="submissionMessage"
          class="mt-3 rounded-lg px-4 py-2 text-sm font-medium"
          [ngClass]="submissionMessageType === 'success'
            ? 'bg-green-100 text-green-800 border border-green-200'
            : 'bg-red-100 text-red-800 border border-red-200'"
        >
          {{ submissionMessage }}
        </div>
      </div>

      <button
        *ngIf="canCreateIntervention()"
        (click)="showCreateForm = !showCreateForm"
        class="mb-6 px-6 py-3 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition font-semibold"
      >
        + Nouvelle demande
      </button>

      <div *ngIf="showCreateForm" class="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 class="text-xl font-bold mb-4">Soumettre une demande technique</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input type="text" [(ngModel)]="newIntervention.title" placeholder="Titre du probleme" class="px-4 py-2 border border-gray-300 rounded-lg" />
          <app-select
            [(ngModel)]="newIntervention.priority"
            [options]="createPriorityOptions"
            placeholder="Priorite"
          ></app-select>
          <app-select
            [(ngModel)]="newIntervention.type"
            [options]="createTypeOptions"
            placeholder="Type"
          ></app-select>
          <textarea [(ngModel)]="newIntervention.description" placeholder="Description detaillee" rows="4" class="px-4 py-2 border border-gray-300 rounded-lg md:col-span-2"></textarea>
        </div>
        <div class="mt-4 flex gap-2">
          <button (click)="createIntervention()" class="px-6 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition">Soumettre</button>
          <button (click)="showCreateForm = false" class="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition">Annuler</button>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow-md p-4 mb-6">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <app-select
            [(ngModel)]="filterStatus"
            (ngModelChange)="applyFilters()"
            [options]="statusFilterOptions"
            placeholder="Tous les statuts"
          ></app-select>
          <app-select
            [(ngModel)]="filterPriority"
            (ngModelChange)="applyFilters()"
            [options]="priorityFilterOptions"
            placeholder="Toutes les priorites"
          ></app-select>
          <input type="text" [(ngModel)]="searchTerm" (input)="applyFilters()" placeholder="Rechercher..." class="px-4 py-2 border border-gray-300 rounded-lg" />
        </div>
      </div>

      <div class="bg-white rounded-lg shadow-md max-h-[68vh] overflow-auto">
        <table class="w-full">
          <thead class="bg-gray-100 border-b">
            <tr>
              <th class="px-6 py-3 text-left text-sm font-semibold text-gray-700">Titre</th>
              <th class="px-6 py-3 text-left text-sm font-semibold text-gray-700">Priorite</th>
              <th class="px-6 py-3 text-left text-sm font-semibold text-gray-700">Statut</th>
              <th class="px-6 py-3 text-left text-sm font-semibold text-gray-700">Assigne a</th>
              <th class="px-6 py-3 text-left text-sm font-semibold text-gray-700">Creation</th>
              <th class="px-6 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngIf="isLoading">
              <td colspan="6" class="px-6 py-8 text-center text-gray-500">Chargement des interventions...</td>
            </tr>
            <tr *ngFor="let intervention of filteredInterventions" class="border-b hover:bg-gray-50">
              <td class="px-6 py-4">
                <div class="font-medium text-gray-900">{{ intervention.title }}</div>
                <div class="text-sm text-gray-500">Type: {{ getInterventionTypeLabel(intervention.type) }}</div>
              </td>
              <td class="px-6 py-4">
                <span
                  [ngClass]="{
                    'bg-green-100 text-green-800': intervention.priority === 'LOW',
                    'bg-yellow-100 text-yellow-800': intervention.priority === 'MEDIUM',
                    'bg-orange-100 text-orange-800': intervention.priority === 'HIGH',
                    'bg-red-100 text-red-800': intervention.priority === 'CRITICAL'
                  }"
                  class="px-3 py-1 rounded-full text-xs font-semibold"
                >
                  {{ intervention.priority }}
                </span>
              </td>
              <td class="px-6 py-4">
                <span
                  [ngClass]="{
                    'bg-blue-100 text-blue-800': intervention.status === 'OPEN',
                    'bg-purple-100 text-purple-800': intervention.status === 'ASSIGNED',
                    'bg-indigo-100 text-indigo-800': intervention.status === 'IN_PROGRESS',
                    'bg-green-100 text-green-800': intervention.status === 'RESOLVED',
                    'bg-gray-100 text-gray-800': intervention.status === 'CLOSED'
                  }"
                  class="px-3 py-1 rounded-full text-xs font-semibold"
                >
                  {{ intervention.status }}
                </span>
              </td>
              <td class="px-6 py-4 text-sm text-gray-600">{{ intervention.assignment?.technicianName || '-' }}</td>
              <td class="px-6 py-4 text-sm text-gray-600">{{ intervention.createdAt | date:'short' }}</td>
              <td class="px-6 py-4 text-sm">
                <button (click)="viewIntervention(intervention)" class="text-brand-500 hover:text-brand-700 mr-3">Voir</button>
                <button *ngIf="canManageInterventions() && intervention.status === 'OPEN'" (click)="assignIntervention(intervention)" class="text-indigo-500 hover:text-indigo-700 mr-3">Affecter</button>
                <button *ngIf="canManageInterventions() && intervention.status === 'ASSIGNED'" (click)="startIntervention(intervention)" class="text-purple-500 hover:text-purple-700 mr-3">Demarrer</button>
                <button *ngIf="canManageInterventions() && intervention.status === 'IN_PROGRESS'" (click)="resolveIntervention(intervention)" class="text-success-600 hover:text-success-700 mr-3">Resoudre</button>
                <button *ngIf="canManageInterventions() && intervention.status === 'RESOLVED'" (click)="closeIntervention(intervention)" class="text-gray-600 hover:text-gray-700">Clore</button>
              </td>
            </tr>
          </tbody>
        </table>
        <div *ngIf="!isLoading && filteredInterventions.length === 0" class="text-center py-12 text-gray-500">Aucune intervention trouvee</div>
      </div>

      <div
        *ngIf="!isLoading && totalElements > 0"
        class="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3"
      >
        <p class="text-sm text-gray-600">
          Affichage {{ getPaginationStart(currentPage, pageSize, totalElements) }}-{{ getPaginationEnd(currentPage, pageSize, totalElements) }} sur {{ totalElements }} éléments
        </p>
        <div class="flex items-center gap-2">
          <button
            type="button"
            (click)="previousPage()"
            [disabled]="currentPage === 0"
            class="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Precedent
          </button>
          <button
            *ngFor="let page of getVisiblePages(currentPage, totalPages)"
            type="button"
            (click)="goToPage(page)"
            class="rounded-lg border px-3 py-2 text-sm font-semibold transition"
            [ngClass]="page === currentPage
              ? 'border-brand-500 bg-brand-500 text-white'
              : 'border-gray-300 text-gray-700 hover:bg-gray-50'"
          >
            {{ page + 1 }}
          </button>
          <button
            type="button"
            (click)="nextPage()"
            [disabled]="currentPage + 1 >= totalPages"
            class="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Suivant
          </button>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class InterventionsComponent implements OnInit, OnDestroy {
  interventions: Intervention[] = [];
  filteredInterventions: Intervention[] = [];
  showCreateForm = false;
  isAuthenticated = false;

  filterStatus = '';
  filterPriority = '';
  searchTerm = '';

  currentRole: AppRole = 'EMPLOYEE';
  currentUserId = '';
  currentUserUsername = '';
  currentUserName = '';
  currentUserEmail = '';
  submissionMessage = '';
  submissionMessageType: 'success' | 'error' = 'success';
  currentPage = 0;
  pageSize = 10;
  totalElements = 0;
  totalPages = 0;
  isLoading = false;
  private pageStateSubscription?: Subscription;
  private routeQuerySubscription?: Subscription;

  readonly roleLabels: Record<AppRole, string> = {
    ADMIN: 'Administrateur',
    EMPLOYEE: 'Employe',
    MANAGER: 'Chef hierarchique',
    ROOM_MANAGER: 'Responsable salle',
    IT_MANAGER: 'Responsable IT',
    SECURITY_MANAGER: 'Responsable securite',
    DSN_DIRECTOR: 'Directeur DSN',
    QUALITY_MANAGER: 'Responsable qualite'
  };

  readonly createPriorityOptions: Option[] = [
    { value: 'LOW', label: 'Priorite basse' },
    { value: 'MEDIUM', label: 'Priorite moyenne' },
    { value: 'HIGH', label: 'Priorite haute' },
    { value: 'CRITICAL', label: 'Critique' },
  ];

  readonly createTypeOptions: Option[] = [
    { value: 'MAINTENANCE', label: 'Maintenance' },
    { value: 'REPAIR', label: 'Reparation' },
    { value: 'SUPPORT', label: 'Support' },
    { value: 'INSTALLATION', label: 'Installation' },
  ];

  readonly statusFilterOptions: Option[] = [
    { value: '', label: 'Tous les statuts' },
    { value: 'OPEN', label: 'Nouveau' },
    { value: 'ASSIGNED', label: 'Affectee' },
    { value: 'IN_PROGRESS', label: 'En cours' },
    { value: 'RESOLVED', label: 'Resolue' },
    { value: 'CLOSED', label: 'Fermee' },
  ];

  readonly priorityFilterOptions: Option[] = [
    { value: '', label: 'Toutes les priorites' },
    { value: 'LOW', label: 'Basse' },
    { value: 'MEDIUM', label: 'Moyenne' },
    { value: 'HIGH', label: 'Haute' },
    { value: 'CRITICAL', label: 'Critique' },
  ];

  newIntervention: {
    title: string;
    description: string;
    type: Intervention['type'];
    priority: InterventionPriority;
  } = {
    title: '',
    description: '',
    type: 'SUPPORT',
    priority: InterventionPriority.MEDIUM,
  };

  constructor(
    private interventionService: InterventionService,
    private authService: AuthService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.searchTerm = this.readRouteSearch();

    this.pageStateSubscription = this.interventionService.interventionPageState$.subscribe((pageState) => {
      this.currentPage = pageState.page;
      this.pageSize = pageState.size;
      this.totalElements = pageState.totalElements;
      const safeSize = pageState.size > 0 ? pageState.size : this.pageSize || 1;
      const computedPages = pageState.totalElements > 0 ? Math.ceil(pageState.totalElements / safeSize) : 0;
      this.totalPages = Math.max(pageState.totalPages, computedPages);
    });

    this.authService.currentUser$.subscribe(user => {
      if (!user) {
        this.isAuthenticated = false;
        this.interventions = [];
        this.filteredInterventions = [];
        this.setSubmissionError('Session expiree. Reconnectez-vous puis reessayez.');
        return;
      }

      this.isAuthenticated = true;
      this.currentRole = user.role;
      this.currentUserId = user.id;
      this.currentUserUsername = (user.username || '').trim();
      this.currentUserName = `${user.firstName} ${user.lastName}`.trim();
      this.currentUserEmail = user.email;
      this.clearSubmissionMessage();
      this.currentPage = 0;
      this.loadInterventions();
    });

    this.routeQuerySubscription = this.route.queryParamMap.subscribe((params) => {
      const routeSearch = (params.get('search') || params.get('q') || '').trim();
      if (routeSearch === this.searchTerm) {
        return;
      }
      this.searchTerm = routeSearch;
      this.currentPage = 0;
      if (this.isAuthenticated) {
        this.loadInterventions();
      }
    });
  }

  ngOnDestroy(): void {
    this.pageStateSubscription?.unsubscribe();
    this.routeQuerySubscription?.unsubscribe();
  }

  canCreateIntervention(): boolean {
    return this.isAuthenticated && (this.currentRole === 'EMPLOYEE' || this.currentRole === 'MANAGER');
  }

  canManageInterventions(): boolean {
    return this.isAuthenticated
      && (this.currentRole === 'ROOM_MANAGER' || this.currentRole === 'ADMIN')
      && this.authService.hasPermission('CHANGE_INTERVENTION_STATUS');
  }

  loadInterventions(): void {
    this.reloadCurrentPage();
  }

  createIntervention(): void {
    this.clearSubmissionMessage();

    if (!this.canCreateIntervention()) {
      this.setSubmissionError('Demande refusee: ce role ne peut pas creer d intervention.');
      return;
    }

    if (!hasBackendToken()) {
      this.setSubmissionError('Session expiree. Reconnectez-vous puis reessayez.');
      return;
    }

    if (!this.newIntervention.title.trim() || !this.newIntervention.description.trim()) {
      this.setSubmissionError('Titre et description sont obligatoires.');
      return;
    }

    this.interventionService.createIntervention({
      ...this.newIntervention,
      location: '',
      requesterId: this.currentUserId,
      requesterName: this.currentUserName,
      requesterEmail: this.currentUserEmail
    }).subscribe({
      next: () => {
        this.loadInterventions();
        this.showCreateForm = false;
        const successMessage = 'Demande validee: ticket enregistre et soumis au responsable.';
        this.setSubmissionSuccess(successMessage);
        alert(successMessage);
        this.newIntervention = {
          title: '',
          description: '',
          type: 'SUPPORT',
          priority: InterventionPriority.MEDIUM,
        };
      },
      error: (error) => {
        console.error('Intervention creation failed', error);
        const errorMessage = this.toCreateErrorMessage(error);
        this.setSubmissionError(errorMessage);
        alert(errorMessage);
      }
    });
  }

  private getRoleScopedInterventions(): Intervention[] {
    // The backend already applies role scoping (mine=true for non-managers).
    // Avoid client-side identity filtering to prevent hiding valid rows.
    return [...this.interventions];
  }

  private setSubmissionSuccess(message: string): void {
    this.submissionMessageType = 'success';
    this.submissionMessage = message;
  }

  private setSubmissionError(message: string): void {
    this.submissionMessageType = 'error';
    this.submissionMessage = message;
  }

  private clearSubmissionMessage(): void {
    this.submissionMessage = '';
  }

  private toCreateErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 401) {
        return 'Demande non validee: session expiree (401). Reconnectez-vous.';
      }
      if (error.status === 403) {
        return 'Demande non validee: droits insuffisants (403).';
      }
      if (error.status === 400) {
        return 'Demande non validee: donnees invalides (400).';
      }
      if (error.status === 0) {
        return 'Demande non validee: backend inaccessible.';
      }
    }

    return 'Demande non validee: echec de soumission du ticket.';
  }

  private toLoadErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 401) {
        return 'Chargement non valide: session expiree (401). Reconnectez-vous.';
      }
      if (error.status === 403) {
        return 'Chargement non valide: acces refuse (403).';
      }
      if (error.status === 0) {
        return 'Chargement non valide: backend inaccessible.';
      }
    }

    return 'Chargement non valide: impossible de recuperer les interventions.';
  }

  applyFilters(): void {
    this.currentPage = 0;
    this.reloadCurrentPage();
  }

  nextPage(): void {
    if (this.currentPage + 1 >= this.totalPages) {
      return;
    }
    this.currentPage += 1;
    this.reloadCurrentPage();
  }

  goToPage(page: number): void {
    if (page < 0 || page >= this.totalPages || page === this.currentPage) {
      return;
    }
    this.currentPage = page;
    this.reloadCurrentPage();
  }

  getVisiblePages(currentPage: number, totalPages: number): number[] {
    if (totalPages <= 0) {
      return [];
    }

    const maxButtons = 5;
    const half = Math.floor(maxButtons / 2);
    let start = Math.max(0, currentPage - half);
    let end = Math.min(totalPages - 1, start + maxButtons - 1);

    if ((end - start + 1) < maxButtons) {
      start = Math.max(0, end - maxButtons + 1);
    }

    const pages: number[] = [];
    for (let page = start; page <= end; page += 1) {
      pages.push(page);
    }
    return pages;
  }

  getPaginationStart(page: number, size: number, total: number): number {
    if (total <= 0) {
      return 0;
    }
    return page * size + 1;
  }

  getPaginationEnd(page: number, size: number, total: number): number {
    if (total <= 0) {
      return 0;
    }
    return Math.min((page + 1) * size, total);
  }

  getInterventionTypeLabel(type: Intervention['type']): string {
    if (type === 'MAINTENANCE') {
      return 'Maintenance';
    }
    if (type === 'REPAIR') {
      return 'Réparation';
    }
    if (type === 'INSTALLATION') {
      return 'Installation';
    }
    if (type === 'SUPPORT') {
      return 'Support';
    }
    return 'Autre';
  }

  previousPage(): void {
    if (this.currentPage <= 0) {
      return;
    }
    this.currentPage -= 1;
    this.reloadCurrentPage();
  }

  private reloadCurrentPage(): void {
    const mineOnly = !this.canManageInterventions();
    this.isLoading = true;
    this.interventionService.getInterventions({
      mine: mineOnly,
      page: this.currentPage,
      size: this.pageSize,
      sort: 'createdAt,desc',
      search: this.searchTerm || undefined,
      status: this.filterStatus ? (this.filterStatus as InterventionStatus) : undefined,
    }).subscribe({
      next: (interventions) => {
        this.interventions = Array.isArray(interventions) ? interventions : [];
        let filtered = this.getRoleScopedInterventions();
        if (this.filterPriority) {
          filtered = filtered.filter(item => item.priority === this.filterPriority);
        }
        this.filteredInterventions = filtered;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Interventions loading failed', error);
        this.setSubmissionError(this.toLoadErrorMessage(error));
        this.isLoading = false;
      }
    });
  }

  viewIntervention(intervention: Intervention): void {
    alert(`${intervention.title}\n\n${intervention.description}`);
  }

  assignIntervention(intervention: Intervention): void {
    if (!this.canManageInterventions()) {
      return;
    }

    const technicianName = prompt('Nom du technicien', intervention.assignment?.technicianName || 'Equipe technique');
    if (!technicianName || !technicianName.trim()) {
      return;
    }

    const technicianId = technicianName.toLowerCase().replace(/\s+/g, '-');
    this.interventionService.assignIntervention(intervention.id, technicianId, technicianName.trim()).subscribe({
      next: () => {
        this.setSubmissionSuccess('Intervention affectee et enregistree.');
        this.loadInterventions();
      },
      error: (error) => this.setSubmissionError(this.toActionErrorMessage(error, 'Affectation impossible.')),
    });
  }

  startIntervention(intervention: Intervention): void {
    if (!intervention.assignment || !this.canManageInterventions()) {
      return;
    }

    this.interventionService.updateAssignment(intervention.id, {
      startedAt: new Date()
    }).subscribe({
      next: () => {
        this.setSubmissionSuccess('Intervention demarree et enregistree.');
        this.loadInterventions();
      },
      error: (error) => this.setSubmissionError(this.toActionErrorMessage(error, 'Demarrage impossible.')),
    });
  }

  resolveIntervention(intervention: Intervention): void {
    if (!this.canManageInterventions()) {
      return;
    }

    const resolution = prompt('Details de resolution', 'Incident corrige et valide.');
    if (!resolution || !resolution.trim()) {
      return;
    }

    this.interventionService.completeIntervention(intervention.id, resolution.trim()).subscribe({
      next: () => {
        this.setSubmissionSuccess('Resolution enregistree.');
        this.loadInterventions();
      },
      error: (error) => this.setSubmissionError(this.toActionErrorMessage(error, 'Resolution impossible.')),
    });
  }

  closeIntervention(intervention: Intervention): void {
    if (!this.canManageInterventions()) {
      return;
    }

    this.interventionService.closeIntervention(intervention.id).subscribe({
      next: () => {
        this.setSubmissionSuccess('Intervention close et validee.');
        this.loadInterventions();
      },
      error: (error) => this.setSubmissionError(this.toActionErrorMessage(error, 'Cloture impossible.')),
    });
  }

  private toActionErrorMessage(error: unknown, fallbackMessage: string): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 401) {
        return `${fallbackMessage} Session expiree (401).`;
      }
      if (error.status === 403) {
        return `${fallbackMessage} Droits insuffisants (403).`;
      }
      if (error.status === 409) {
        return `${fallbackMessage} Transition non autorisee (409).`;
      }
      if (error.status === 0) {
        return `${fallbackMessage} Backend inaccessible.`;
      }
    }

    return fallbackMessage;
  }

  private readRouteSearch(): string {
    return (this.route.snapshot.queryParamMap.get('search') || this.route.snapshot.queryParamMap.get('q') || '').trim();
  }
}
