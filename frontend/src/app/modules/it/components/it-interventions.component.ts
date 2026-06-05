import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { ItEquipmentService } from '../../../core/services/it-equipment.service';
import { ItInterventionService } from '../../../core/services/it-intervention.service';
import {
  AppRole,
  ItEquipment,
  ItEquipmentState,
  ItIntervention,
  ItInterventionPriority,
  ItInterventionTransition,
  ItWorkflowStatus,
} from '../../../core/models';

type FeedbackTone = 'success' | 'error';
type WorkflowActionType = 'manager' | 'dsn' | 'take' | 'start' | 'resolve' | 'close';

interface PendingWorkflowAction {
  type: WorkflowActionType;
  item: ItIntervention;
  approved?: boolean;
}

@Component({
  selector: 'app-it-interventions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="mx-auto max-w-7xl space-y-6 px-4 py-6">
      <section class="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white/90 lg:text-3xl">Interventions IT</h1>
            <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Workflow: Employé → Chef hiérarchique → Directeur DSN → Responsable IT.
            </p>
            <span class="mt-3 inline-flex rounded-full bg-brand-500/10 px-3 py-1 text-xs font-semibold text-brand-700 dark:text-brand-300">
              {{ roleLabels[currentRole] }}
            </span>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <button
              *ngIf="canAccessItEquipment()"
              type="button"
              (click)="goToItEquipment()"
              class="inline-flex h-11 items-center justify-center rounded-xl border border-gray-300 px-4 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
            >
              Voir parc IT
            </button>
            <button
              *ngIf="canSubmitIntervention()"
              type="button"
              (click)="showCreateForm = !showCreateForm"
              class="inline-flex h-11 items-center justify-center rounded-xl bg-brand-500 px-5 text-sm font-semibold text-white transition hover:bg-brand-600"
            >
              Nouvelle demande IT
            </button>
          </div>
        </div>

        <div *ngIf="feedbackMessage" class="mt-4 rounded-xl border px-4 py-2 text-sm" [ngClass]="feedbackTone === 'success'
          ? 'border-success-200 bg-success-50 text-success-700 dark:border-success-500/40 dark:bg-success-500/10 dark:text-success-300'
          : 'border-error-200 bg-error-50 text-error-700 dark:border-error-500/40 dark:bg-error-500/10 dark:text-error-300'">
          {{ feedbackMessage }}
        </div>

        <div class="mt-4 inline-flex rounded-xl border border-gray-200 bg-gray-50 p-1 dark:border-gray-700 dark:bg-gray-900">
          <button
            *ngIf="canAccessItEquipment()"
            type="button"
            (click)="goToItEquipment()"
            class="h-9 rounded-lg px-4 text-sm font-semibold text-gray-600 transition hover:bg-white hover:text-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.03] dark:hover:text-white/90"
          >
            Parc IT
          </button>
          <button
            type="button"
            class="h-9 rounded-lg bg-white px-4 text-sm font-semibold text-brand-700 shadow-theme-xs dark:bg-white/[0.03] dark:text-brand-300"
          >
            Interventions IT
          </button>
        </div>
      </section>

      <section *ngIf="currentRole === 'IT_MANAGER'" class="grid grid-cols-1 gap-3 md:grid-cols-3">
        <article class="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
          <p class="text-3xl font-semibold text-gray-900 dark:text-white/90">{{ itPendingCount }}</p>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Interventions IT en attente</p>
        </article>
        <article class="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
          <p class="text-3xl font-semibold text-gray-900 dark:text-white/90">{{ itInProgressCount }}</p>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Interventions IT en cours</p>
        </article>
        <article class="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
          <p class="text-3xl font-semibold text-gray-900 dark:text-white/90">{{ itResolvedCount }}</p>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Interventions IT résolues</p>
        </article>
      </section>

      <section *ngIf="currentRole === 'EMPLOYEE'" class="grid grid-cols-1 gap-3 md:grid-cols-2">
        <article class="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
          <p class="text-3xl font-semibold text-gray-900 dark:text-white/90">{{ myEquipments.length }}</p>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Mes équipements IT affectés</p>
        </article>
        <article class="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
          <p class="text-3xl font-semibold text-gray-900 dark:text-white/90">{{ myOpenInterventionsCount }}</p>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Mes interventions IT ouvertes</p>
        </article>
      </section>

      <section *ngIf="showCreateForm" class="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <h2 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white/90">Soumettre une intervention IT</h2>

        <div *ngIf="myEquipments.length === 0" class="mb-4 rounded-xl border border-warning-200 bg-warning-50 px-4 py-3 text-sm text-warning-700 dark:border-warning-500/40 dark:bg-warning-500/10 dark:text-warning-300">
          Aucun équipement IT ne vous est actuellement affecté.
        </div>

        <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
          <input [(ngModel)]="createForm.title" placeholder="Titre" class="h-11 rounded-xl border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200" />
          <select [(ngModel)]="createForm.priority" class="h-11 rounded-xl border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
            <option *ngFor="let priority of priorities" [value]="priority">{{ priorityLabels[priority] }}</option>
          </select>
          <select [(ngModel)]="createForm.equipmentId" class="h-11 rounded-xl border border-gray-300 px-3 text-sm md:col-span-2 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
            <option value="">Équipement concerné</option>
            <option *ngFor="let equipment of myEquipments" [value]="equipment.id">
              {{ equipment.name }} - {{ equipment.categoryName }} - {{ equipment.serialNumber }}
            </option>
          </select>
          <textarea [(ngModel)]="createForm.description" placeholder="Description du problème" rows="4" class="rounded-xl border border-gray-300 px-3 py-2 text-sm md:col-span-2 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"></textarea>
        </div>

        <div class="mt-4 flex justify-end gap-2">
          <button type="button" (click)="showCreateForm = false" class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 dark:border-gray-700 dark:text-gray-300">Annuler</button>
          <button type="button" (click)="submitIntervention()" [disabled]="myEquipments.length === 0" class="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50">Soumettre</button>
        </div>
      </section>

      <section class="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
        <div class="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_220px_220px_220px_auto_auto]">
          <input
            type="text"
            [(ngModel)]="searchTerm"
            placeholder="Rechercher titre, équipement, demandeur..."
            class="h-11 rounded-xl border border-gray-300 bg-transparent px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
          />
          <select
            [(ngModel)]="priorityFilter"
            class="h-11 rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-700 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
          >
            <option value="">Toutes priorités</option>
            <option *ngFor="let priority of priorities" [value]="priority">{{ priorityLabels[priority] }}</option>
          </select>
          <select
            [(ngModel)]="categoryFilter"
            class="h-11 rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-700 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
          >
            <option value="">Toutes catégories</option>
            <option *ngFor="let category of availableCategories" [value]="category">{{ category }}</option>
          </select>
          <select
            [(ngModel)]="statusFilter"
            class="h-11 rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-700 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
          >
            <option value="">Tous statuts</option>
            <option *ngFor="let status of workflowStatuses" [value]="status">{{ statusLabels[status] }}</option>
          </select>
          <button type="button" (click)="applyFilters()" class="h-11 rounded-xl border border-brand-300 px-4 text-sm font-semibold text-brand-700 transition hover:bg-brand-50 dark:border-brand-500/40 dark:text-brand-300 dark:hover:bg-brand-500/10">
            Filtrer
          </button>
          <button type="button" (click)="resetFilters()" class="h-11 rounded-xl border border-gray-300 px-4 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]">
            Réinitialiser
          </button>
        </div>
      </section>

      <section class="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div class="overflow-x-auto">
          <table class="min-w-full">
            <thead class="bg-gray-50 dark:bg-gray-900/60">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Demande</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Équipement</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Priorité</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Statut</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Date</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngIf="loading">
                <td colspan="6" class="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">Chargement des interventions IT...</td>
              </tr>
              <tr *ngFor="let item of pagedInterventions" class="border-t border-gray-200 dark:border-gray-800">
                <td class="px-4 py-3 text-sm text-gray-800 dark:text-gray-200">
                  <p class="font-semibold">{{ item.title }}</p>
                  <p class="text-xs text-gray-500 dark:text-gray-400">Demandeur: {{ item.requestedBy }}</p>
                </td>
                <td class="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                  <p>{{ item.equipmentName || 'Équipement IT' }}</p>
                  <p class="text-xs text-gray-500 dark:text-gray-400">{{ item.equipmentCategory || '-' }}</p>
                  <p class="text-xs text-gray-500 dark:text-gray-400">{{ item.equipmentSerialNumber || '-' }}</p>
                </td>
                <td class="px-4 py-3 text-sm">
                  <span class="inline-flex rounded-full px-3 py-1 text-xs font-semibold" [ngClass]="priorityBadgeClass(item.priority)">
                    {{ priorityLabels[item.priority] }}
                  </span>
                </td>
                <td class="px-4 py-3 text-sm">
                  <span class="inline-flex rounded-full px-3 py-1 text-xs font-semibold" [ngClass]="statusBadgeClass(item.itWorkflowStatus)">
                    {{ statusLabels[item.itWorkflowStatus] }}
                  </span>
                </td>
                <td class="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{{ item.createdAt | date:'short' }}</td>
                <td class="px-4 py-3 text-sm">
                  <div class="flex flex-wrap gap-2">
                    <button type="button" (click)="openHistory(item)" class="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]">Historique</button>
                    <button *ngIf="canManagerApprove(item)" type="button" (click)="managerApprove(item, true)" class="rounded-lg border border-success-300 px-3 py-1.5 text-xs font-semibold text-success-700 transition hover:bg-success-50 dark:border-success-500/40 dark:text-success-300 dark:hover:bg-success-500/10">Valider chef</button>
                    <button *ngIf="canManagerApprove(item)" type="button" (click)="managerApprove(item, false)" class="rounded-lg border border-error-300 px-3 py-1.5 text-xs font-semibold text-error-700 transition hover:bg-error-50 dark:border-error-500/40 dark:text-error-300 dark:hover:bg-error-500/10">Refuser chef</button>
                    <button *ngIf="canDsnApprove(item)" type="button" (click)="dsnApprove(item, true)" class="rounded-lg border border-success-300 px-3 py-1.5 text-xs font-semibold text-success-700 transition hover:bg-success-50 dark:border-success-500/40 dark:text-success-300 dark:hover:bg-success-500/10">Valider DSN</button>
                    <button *ngIf="canDsnApprove(item)" type="button" (click)="dsnApprove(item, false)" class="rounded-lg border border-error-300 px-3 py-1.5 text-xs font-semibold text-error-700 transition hover:bg-error-50 dark:border-error-500/40 dark:text-error-300 dark:hover:bg-error-500/10">Refuser DSN</button>
                    <button *ngIf="canTakeInCharge(item)" type="button" (click)="takeInCharge(item)" class="rounded-lg border border-brand-300 px-3 py-1.5 text-xs font-semibold text-brand-700 transition hover:bg-brand-50 dark:border-brand-500/40 dark:text-brand-300 dark:hover:bg-brand-500/10">Prendre en charge</button>
                    <button *ngIf="canStart(item)" type="button" (click)="startProcessing(item)" class="rounded-lg border border-brand-300 px-3 py-1.5 text-xs font-semibold text-brand-700 transition hover:bg-brand-50 dark:border-brand-500/40 dark:text-brand-300 dark:hover:bg-brand-500/10">Mettre en cours</button>
                    <button *ngIf="canResolve(item)" type="button" (click)="resolve(item)" class="rounded-lg border border-warning-300 px-3 py-1.5 text-xs font-semibold text-warning-700 transition hover:bg-warning-50 dark:border-warning-500/40 dark:text-warning-300 dark:hover:bg-warning-500/10">Résoudre</button>
                    <button *ngIf="canClose(item)" type="button" (click)="close(item)" class="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]">Fermer</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

      <div *ngIf="!loading && filteredInterventions.length === 0" class="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
          Aucune intervention IT trouvée.
        </div>

        <div class="flex items-center justify-between border-t border-gray-200 px-4 py-3 text-sm dark:border-gray-800">
          <p class="text-gray-500 dark:text-gray-400">
            Page {{ page + 1 }} / {{ totalPages || 1 }} ({{ filteredInterventions.length }} éléments)
          </p>
          <div class="flex gap-2">
            <button type="button" (click)="previousPage()" [disabled]="page === 0" class="rounded-lg border border-gray-300 px-3 py-1.5 font-semibold text-gray-700 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300">Précédent</button>
            <button type="button" (click)="nextPage()" [disabled]="page + 1 >= totalPages" class="rounded-lg border border-gray-300 px-3 py-1.5 font-semibold text-gray-700 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300">Suivant</button>
          </div>
        </div>
      </section>
    </div>

    <div *ngIf="actionModalOpen && pendingWorkflowAction" class="fixed inset-0 z-[130100] flex items-center justify-center bg-gray-950/60 p-4 backdrop-blur-sm">
      <div class="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
        <div class="mb-4 flex items-center justify-between">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white/90">{{ actionModalTitle }}</h2>
          <button type="button" (click)="closeActionModal()" [disabled]="actionModalBusy" class="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700 dark:border-gray-700 dark:text-gray-300">
            Fermer
          </button>
        </div>

        <p class="mb-3 text-sm text-gray-600 dark:text-gray-400">{{ actionModalDescription }}</p>
        <p class="mb-3 text-sm font-semibold text-gray-800 dark:text-gray-200">{{ pendingWorkflowAction.item.title }}</p>

        <div class="space-y-3">
          <div *ngIf="actionModalNeedsEquipmentState">
            <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">État final équipement</label>
            <select
              [(ngModel)]="actionModalEquipmentState"
              class="h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-700 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
            >
              <option *ngFor="let state of resolutionStates" [value]="state">{{ resolutionStateLabels[state] }}</option>
            </select>
          </div>

          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Commentaire {{ actionModalNoteRequired ? '(obligatoire)' : '(optionnel)' }}
            </label>
            <textarea
              [(ngModel)]="actionModalNote"
              [placeholder]="actionModalPlaceholder"
              rows="4"
              class="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
            ></textarea>
          </div>
        </div>

        <p *ngIf="actionModalError" class="mt-3 text-sm text-error-600 dark:text-error-300">{{ actionModalError }}</p>

        <div class="mt-5 flex justify-end gap-2">
          <button type="button" (click)="closeActionModal()" [disabled]="actionModalBusy" class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 dark:border-gray-700 dark:text-gray-300">
            Annuler
          </button>
          <button type="button" (click)="confirmActionModal()" [disabled]="actionModalBusy" class="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60">
            {{ actionModalBusy ? 'Traitement...' : actionModalSubmitLabel }}
          </button>
        </div>
      </div>
    </div>

    <div *ngIf="showHistory && selectedHistoryIntervention" class="fixed inset-0 z-[130000] flex items-center justify-center bg-gray-950/60 p-4 backdrop-blur-sm">
      <div class="w-full max-w-3xl rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
        <div class="mb-4 flex items-center justify-between">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white/90">Historique des transitions</h2>
          <button type="button" (click)="closeHistory()" class="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700 dark:border-gray-700 dark:text-gray-300">Fermer</button>
        </div>
        <p class="mb-3 text-sm text-gray-600 dark:text-gray-400">{{ selectedHistoryIntervention.title }}</p>
        <div *ngIf="history.length === 0" class="rounded-xl border border-dashed border-gray-300 px-4 py-6 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
          Aucun historique de transition.
        </div>
        <ul *ngIf="history.length > 0" class="space-y-2">
          <li *ngFor="let step of history" class="rounded-xl border border-gray-200 px-3 py-2 text-sm dark:border-gray-700">
            <p class="font-semibold text-gray-800 dark:text-gray-200">{{ statusLabel(step.toStatus) }}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">{{ step.createdAt | date:'short' }} - {{ step.actorId }} ({{ step.actorRole || 'N/A' }})</p>
            <p *ngIf="step.note" class="mt-1 text-xs text-gray-600 dark:text-gray-300">{{ step.note }}</p>
          </li>
        </ul>
      </div>
    </div>
  `,
})
export class ItInterventionsComponent implements OnInit {
  currentRole: AppRole = 'EMPLOYEE';
  loading = false;
  showCreateForm = false;
  showHistory = false;

  interventions: ItIntervention[] = [];
  filteredInterventions: ItIntervention[] = [];
  pagedInterventions: ItIntervention[] = [];
  history: ItInterventionTransition[] = [];
  selectedHistoryIntervention: ItIntervention | null = null;
  myEquipments: ItEquipment[] = [];

  searchTerm = '';
  statusFilter = '';
  priorityFilter = '';
  categoryFilter = '';
  page = 0;
  size = 10;
  totalPages = 0;

  feedbackMessage = '';
  feedbackTone: FeedbackTone = 'success';
  actionModalOpen = false;
  actionModalBusy = false;
  actionModalTitle = '';
  actionModalDescription = '';
  actionModalSubmitLabel = 'Confirmer';
  actionModalPlaceholder = '';
  actionModalNote = '';
  actionModalNoteRequired = false;
  actionModalNeedsEquipmentState = false;
  actionModalEquipmentState: ItEquipmentState = 'OPERATIONAL';
  actionModalError = '';
  pendingWorkflowAction: PendingWorkflowAction | null = null;

  createForm: {
    title: string;
    description: string;
    priority: ItInterventionPriority;
    equipmentId: string;
  } = {
    title: '',
    description: '',
    priority: 'MEDIUM',
    equipmentId: '',
  };

  readonly roleLabels: Record<AppRole, string> = {
    ADMIN: 'Administrateur',
    EMPLOYEE: 'Employé',
    MANAGER: 'Chef hiérarchique',
    ROOM_MANAGER: 'Responsable salle',
    IT_MANAGER: 'Responsable IT',
    SECURITY_MANAGER: 'Responsable sécurité',
    DSN_DIRECTOR: 'Directeur DSN',
    QUALITY_MANAGER: 'Responsable qualité',
  };

  readonly priorities: ItInterventionPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
  readonly priorityLabels: Record<ItInterventionPriority, string> = {
    LOW: 'Basse',
    MEDIUM: 'Moyenne',
    HIGH: 'Haute',
    CRITICAL: 'Critique',
  };

  readonly workflowStatuses: ItWorkflowStatus[] = [
    'MANAGER_APPROVAL_PENDING',
    'MANAGER_REJECTED',
    'DSN_APPROVAL_PENDING',
    'DSN_REJECTED',
    'IT_PROCESSING_PENDING',
    'IT_IN_CHARGE',
    'IT_IN_PROGRESS',
    'IT_RESOLVED',
    'IT_CLOSED',
  ];

  readonly statusLabels: Record<ItWorkflowStatus, string> = {
    SUBMITTED: 'Soumise',
    MANAGER_APPROVAL_PENDING: 'En attente validation chef',
    MANAGER_APPROVED: 'Validée chef',
    MANAGER_REJECTED: 'Refusée chef',
    DSN_APPROVAL_PENDING: 'En attente validation DSN',
    DSN_APPROVED: 'Validée DSN',
    DSN_REJECTED: 'Refusée DSN',
    IT_PROCESSING_PENDING: 'En attente traitement IT',
    IT_IN_CHARGE: 'Prise en charge IT',
    IT_IN_PROGRESS: 'En cours IT',
    IT_RESOLVED: 'Résolue',
    IT_CLOSED: 'Fermée',
  };

  readonly resolutionStates: ItEquipmentState[] = [
    'OPERATIONAL',
    'IN_REPAIR',
    'IN_MAINTENANCE',
    'OUT_OF_SERVICE',
  ];

  readonly resolutionStateLabels: Record<ItEquipmentState, string> = {
    OPERATIONAL: 'Opérationnel',
    IN_REPAIR: 'En panne',
    IN_MAINTENANCE: 'En maintenance',
    OUT_OF_SERVICE: 'Hors service',
    ARCHIVED: 'Archivé',
  };

  get availableCategories(): string[] {
    return Array.from(
      new Set(
        this.interventions
          .map((item) => (item.equipmentCategory || '').trim())
          .filter((value) => value.length > 0)
      )
    ).sort((left, right) => left.localeCompare(right, 'fr'));
  }

  get itPendingCount(): number {
    return this.interventions.filter((item) => item.itWorkflowStatus === 'IT_PROCESSING_PENDING').length;
  }

  get itInProgressCount(): number {
    return this.interventions.filter((item) =>
      item.itWorkflowStatus === 'IT_IN_CHARGE' || item.itWorkflowStatus === 'IT_IN_PROGRESS'
    ).length;
  }

  get itResolvedCount(): number {
    return this.interventions.filter((item) => item.itWorkflowStatus === 'IT_RESOLVED').length;
  }

  get myOpenInterventionsCount(): number {
    return this.interventions.filter((item) =>
      item.itWorkflowStatus !== 'MANAGER_REJECTED'
      && item.itWorkflowStatus !== 'DSN_REJECTED'
      && item.itWorkflowStatus !== 'IT_RESOLVED'
      && item.itWorkflowStatus !== 'IT_CLOSED'
    ).length;
  }

  constructor(
    private authService: AuthService,
    private equipmentService: ItEquipmentService,
    private interventionService: ItInterventionService,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.searchTerm = this.readRouteSearch();

    this.authService.currentUser$.subscribe((user) => {
      if (!user) {
        return;
      }
      this.currentRole = user.role;
      this.loadInterventionsByRole();
      if (this.canSubmitIntervention()) {
        this.loadMyEquipments();
      } else {
        this.myEquipments = [];
      }
    });
  }

  canSubmitIntervention(): boolean {
    return this.currentRole === 'EMPLOYEE';
  }

  canAccessItEquipment(): boolean {
    return this.currentRole === 'ADMIN' || this.currentRole === 'IT_MANAGER';
  }

  goToItEquipment(): void {
    this.router.navigateByUrl('/it/equipements');
  }

  applyFilters(): void {
    this.page = 0;
    this.applyFiltersAndPagination();
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.statusFilter = '';
    this.priorityFilter = '';
    this.categoryFilter = '';
    this.page = 0;
    this.applyFiltersAndPagination();
  }

  previousPage(): void {
    if (this.page <= 0) {
      return;
    }
    this.page -= 1;
    this.applyFiltersAndPagination();
  }

  nextPage(): void {
    if (this.page + 1 >= this.totalPages) {
      return;
    }
    this.page += 1;
    this.applyFiltersAndPagination();
  }

  submitIntervention(): void {
    if (!this.createForm.title.trim() || !this.createForm.description.trim() || !this.createForm.equipmentId) {
      this.setFeedback('Titre, description et équipement sont obligatoires.', 'error');
      return;
    }
    this.interventionService.create({
      title: this.createForm.title.trim(),
      description: this.createForm.description.trim(),
      equipmentId: this.createForm.equipmentId,
      priority: this.createForm.priority,
    }).subscribe({
      next: () => {
        this.setFeedback('Demande IT soumise avec succès.', 'success');
        this.showCreateForm = false;
        this.createForm = { title: '', description: '', priority: 'MEDIUM', equipmentId: '' };
        this.loadInterventionsByRole();
      },
      error: (error) => this.setFeedback(this.toErrorMessage(error, 'Soumission impossible.'), 'error'),
    });
  }

  canManagerApprove(item: ItIntervention): boolean {
    return this.currentRole === 'MANAGER' && item.itWorkflowStatus === 'MANAGER_APPROVAL_PENDING';
  }

  canDsnApprove(item: ItIntervention): boolean {
    return this.currentRole === 'DSN_DIRECTOR' && item.itWorkflowStatus === 'DSN_APPROVAL_PENDING';
  }

  canTakeInCharge(item: ItIntervention): boolean {
    return this.currentRole === 'IT_MANAGER' && item.itWorkflowStatus === 'IT_PROCESSING_PENDING';
  }

  canStart(item: ItIntervention): boolean {
    return this.currentRole === 'IT_MANAGER' && item.itWorkflowStatus === 'IT_IN_CHARGE';
  }

  canResolve(item: ItIntervention): boolean {
    return this.currentRole === 'IT_MANAGER' && item.itWorkflowStatus === 'IT_IN_PROGRESS';
  }

  canClose(item: ItIntervention): boolean {
    return this.currentRole === 'IT_MANAGER' && item.itWorkflowStatus === 'IT_RESOLVED';
  }

  managerApprove(item: ItIntervention, approved: boolean): void {
    this.openActionModal({
      type: 'manager',
      item,
      approved,
    });
  }

  dsnApprove(item: ItIntervention, approved: boolean): void {
    this.openActionModal({
      type: 'dsn',
      item,
      approved,
    });
  }

  takeInCharge(item: ItIntervention): void {
    this.openActionModal({
      type: 'take',
      item,
    });
  }

  startProcessing(item: ItIntervention): void {
    this.openActionModal({
      type: 'start',
      item,
    });
  }

  resolve(item: ItIntervention): void {
    this.openActionModal({
      type: 'resolve',
      item,
    });
  }

  close(item: ItIntervention): void {
    this.openActionModal({
      type: 'close',
      item,
    });
  }

  openActionModal(action: PendingWorkflowAction): void {
    this.pendingWorkflowAction = action;
    this.actionModalOpen = true;
    this.actionModalBusy = false;
    this.actionModalError = '';
    this.actionModalNeedsEquipmentState = action.type === 'resolve';
    this.actionModalEquipmentState = 'OPERATIONAL';
    this.actionModalNote = action.type === 'resolve' ? (action.item.itDiagnosticComment || '') : '';
    this.actionModalNoteRequired = false;
    this.actionModalSubmitLabel = 'Confirmer';
    this.actionModalPlaceholder = 'Ajoutez un commentaire si nécessaire.';

    if (action.type === 'manager') {
      const approved = !!action.approved;
      this.actionModalTitle = approved ? 'Valider la demande (chef hiérarchique)' : 'Refuser la demande (chef hiérarchique)';
      this.actionModalDescription = approved
        ? 'Vous allez valider la demande et l envoyer vers la prochaine étape.'
        : 'Un motif de refus est obligatoire pour notifier le demandeur.';
      this.actionModalNoteRequired = !approved;
      this.actionModalSubmitLabel = approved ? 'Valider chef' : 'Refuser chef';
      this.actionModalPlaceholder = approved ? 'Commentaire optionnel...' : 'Motif de refus obligatoire...';
      return;
    }

    if (action.type === 'dsn') {
      const approved = !!action.approved;
      this.actionModalTitle = approved ? 'Valider la demande (Directeur DSN)' : 'Refuser la demande (Directeur DSN)';
      this.actionModalDescription = approved
        ? 'Vous allez valider la demande et la transmettre au traitement IT.'
        : 'Un motif de refus est obligatoire pour notifier le demandeur.';
      this.actionModalNoteRequired = !approved;
      this.actionModalSubmitLabel = approved ? 'Valider DSN' : 'Refuser DSN';
      this.actionModalPlaceholder = approved ? 'Commentaire optionnel...' : 'Motif de refus obligatoire...';
      return;
    }

    if (action.type === 'take') {
      this.actionModalTitle = 'Prendre en charge l intervention';
      this.actionModalDescription = 'La demande passe en prise en charge IT.';
      this.actionModalSubmitLabel = 'Prendre en charge';
      this.actionModalPlaceholder = 'Commentaire optionnel de prise en charge...';
      return;
    }

    if (action.type === 'start') {
      this.actionModalTitle = 'Mettre l intervention en cours';
      this.actionModalDescription = 'La demande passe au statut En cours IT.';
      this.actionModalSubmitLabel = 'Mettre en cours';
      this.actionModalPlaceholder = 'Commentaire optionnel de démarrage...';
      return;
    }

    if (action.type === 'resolve') {
      this.actionModalTitle = 'Résoudre l intervention';
      this.actionModalDescription = 'Le diagnostic est obligatoire avant résolution.';
      this.actionModalNoteRequired = true;
      this.actionModalSubmitLabel = 'Résoudre';
      this.actionModalPlaceholder = 'Diagnostic et actions de résolution...';
      return;
    }

    this.actionModalTitle = 'Fermer l intervention';
    this.actionModalDescription = 'La demande sera clôturée.';
    this.actionModalSubmitLabel = 'Fermer';
    this.actionModalPlaceholder = 'Commentaire optionnel de fermeture...';
  }

  closeActionModal(): void {
    if (this.actionModalBusy) {
      return;
    }
    this.actionModalOpen = false;
    this.actionModalError = '';
    this.pendingWorkflowAction = null;
  }

  confirmActionModal(): void {
    if (!this.pendingWorkflowAction) {
      return;
    }

    const note = this.actionModalNote.trim();
    if (this.actionModalNoteRequired && !note) {
      this.actionModalError = 'Ce commentaire est obligatoire.';
      return;
    }

    const action = this.pendingWorkflowAction;
    let request$: Observable<unknown> | null = null;

    if (action.type === 'manager') {
      request$ = this.interventionService.managerDecision(action.item.id, !!action.approved, note || undefined);
    } else if (action.type === 'dsn') {
      request$ = this.interventionService.dsnDecision(action.item.id, !!action.approved, note || undefined);
    } else if (action.type === 'take') {
      request$ = this.interventionService.takeInCharge(action.item.id, note || undefined);
    } else if (action.type === 'start') {
      request$ = this.interventionService.markInProgress(action.item.id, note || undefined);
    } else if (action.type === 'resolve') {
      request$ = this.interventionService.resolve(action.item.id, note, this.actionModalEquipmentState);
    } else if (action.type === 'close') {
      request$ = this.interventionService.close(action.item.id, note || undefined);
    }

    if (!request$) {
      this.actionModalError = 'Action non reconnue.';
      return;
    }

    this.actionModalBusy = true;
    this.actionModalError = '';
    request$.subscribe({
      next: () => {
        this.actionModalBusy = false;
        this.actionModalOpen = false;
        this.pendingWorkflowAction = null;
        this.setFeedback(this.successMessageForAction(action), 'success');
        this.loadInterventionsByRole();
      },
      error: (error) => {
        this.actionModalBusy = false;
        this.actionModalError = this.toErrorMessage(error, 'Action impossible.');
      },
    });
  }

  openHistory(item: ItIntervention): void {
    this.selectedHistoryIntervention = item;
    this.showHistory = true;
    this.history = [];
    this.interventionService.getHistory(item.id).subscribe({
      next: (steps) => {
        this.history = steps;
      },
      error: () => {
        this.history = [];
      },
    });
  }

  closeHistory(): void {
    this.showHistory = false;
    this.selectedHistoryIntervention = null;
    this.history = [];
  }

  priorityBadgeClass(priority: ItInterventionPriority): string {
    if (priority === 'LOW') {
      return 'bg-success-500/10 text-success-700 dark:text-success-300';
    }
    if (priority === 'MEDIUM') {
      return 'bg-warning-500/10 text-warning-700 dark:text-warning-300';
    }
    if (priority === 'HIGH') {
      return 'bg-orange-500/10 text-orange-700 dark:text-orange-300';
    }
    return 'bg-error-500/10 text-error-700 dark:text-error-300';
  }

  statusBadgeClass(status: ItWorkflowStatus): string {
    if (status === 'MANAGER_APPROVAL_PENDING' || status === 'DSN_APPROVAL_PENDING' || status === 'IT_PROCESSING_PENDING') {
      return 'bg-warning-500/10 text-warning-700 dark:text-warning-300';
    }
    if (status === 'MANAGER_REJECTED' || status === 'DSN_REJECTED') {
      return 'bg-error-500/10 text-error-700 dark:text-error-300';
    }
    if (status === 'IT_IN_CHARGE' || status === 'IT_IN_PROGRESS') {
      return 'bg-brand-500/10 text-brand-700 dark:text-brand-300';
    }
    if (status === 'IT_RESOLVED') {
      return 'bg-success-500/10 text-success-700 dark:text-success-300';
    }
    if (status === 'IT_CLOSED') {
      return 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300';
    }
    return 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300';
  }

  statusLabel(status: string): string {
    if (Object.prototype.hasOwnProperty.call(this.statusLabels, status)) {
      return this.statusLabels[status as ItWorkflowStatus];
    }
    return status;
  }

  private successMessageForAction(action: PendingWorkflowAction): string {
    if (action.type === 'manager') {
      return action.approved ? 'Demande validée par le chef.' : 'Demande refusée par le chef.';
    }
    if (action.type === 'dsn') {
      return action.approved ? 'Demande validée par DSN.' : 'Demande refusée par DSN.';
    }
    if (action.type === 'take') {
      return 'Intervention prise en charge.';
    }
    if (action.type === 'start') {
      return 'Intervention passée en cours.';
    }
    if (action.type === 'resolve') {
      return 'Intervention résolue.';
    }
    return 'Intervention fermée.';
  }

  private loadInterventionsByRole(): void {
    this.loading = true;
    const request$ = this.currentRole === 'MANAGER'
      ? this.interventionService.listManager(0, 200)
      : this.currentRole === 'DSN_DIRECTOR'
        ? this.interventionService.listDsn(0, 200)
        : this.currentRole === 'IT_MANAGER'
          ? this.interventionService.listProcessing(0, 200)
          : this.currentRole === 'ADMIN'
            ? this.interventionService.listAll(0, 200)
            : this.interventionService.listMine(0, 200);

    request$.subscribe({
      next: (response) => {
        this.interventions = response.content || [];
        this.applyFiltersAndPagination();
        this.loading = false;
      },
      error: (error) => {
        this.interventions = [];
        this.filteredInterventions = [];
        this.pagedInterventions = [];
        this.totalPages = 0;
        this.loading = false;
        this.setFeedback(this.toErrorMessage(error, 'Chargement interventions IT impossible.'), 'error');
      },
    });
  }

  private loadMyEquipments(): void {
    this.equipmentService.getMyEquipments().subscribe({
      next: (items) => {
        this.myEquipments = items;
      },
      error: () => {
        this.myEquipments = [];
      },
    });
  }

  private setFeedback(message: string, tone: FeedbackTone): void {
    this.feedbackMessage = message;
    this.feedbackTone = tone;
  }

  private applyFiltersAndPagination(): void {
    const search = this.searchTerm.trim().toLowerCase();
    this.filteredInterventions = this.interventions.filter((item) => {
      const statusOk = !this.statusFilter || item.itWorkflowStatus === this.statusFilter;
      const priorityOk = !this.priorityFilter || item.priority === this.priorityFilter;
      const categoryOk = !this.categoryFilter || (item.equipmentCategory || '') === this.categoryFilter;
      if (!statusOk || !priorityOk || !categoryOk) {
        return false;
      }
      if (!search) {
        return true;
      }
      return (
        item.title.toLowerCase().includes(search)
        || item.description.toLowerCase().includes(search)
        || (item.equipmentName || '').toLowerCase().includes(search)
        || (item.equipmentSerialNumber || '').toLowerCase().includes(search)
        || (item.equipmentCategory || '').toLowerCase().includes(search)
        || item.requestedBy.toLowerCase().includes(search)
      );
    });

    this.totalPages = Math.max(Math.ceil(this.filteredInterventions.length / this.size), 1);
    if (this.page >= this.totalPages) {
      this.page = Math.max(this.totalPages - 1, 0);
    }

    const start = this.page * this.size;
    this.pagedInterventions = this.filteredInterventions.slice(start, start + this.size);
  }

  private readRouteSearch(): string {
    return (this.route.snapshot.queryParamMap.get('search') || this.route.snapshot.queryParamMap.get('q') || '').trim();
  }

  private toErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      const detail = typeof error.error === 'object' && typeof error.error?.detail === 'string'
        ? error.error.detail
        : '';
      if (detail) {
        return detail;
      }
      if (error.status === 403) {
        return 'Action refusée par la sécurité backend.';
      }
    }
    return fallback;
  }
}
