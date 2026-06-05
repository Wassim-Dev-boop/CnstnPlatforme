import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { ItEquipmentService } from '../../../core/services/it-equipment.service';
import {
  ItAssignableEmployee,
  ItEquipment,
  ItEquipmentAssignment,
  ItEquipmentCategory,
  ItEquipmentState,
} from '../../../core/models';

type FeedbackTone = 'success' | 'error';

@Component({
  selector: 'app-it-equipment',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="mx-auto max-w-7xl space-y-6 px-4 py-6">
      <section class="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white/90 lg:text-3xl">Parc équipements IT</h1>
            <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Gestion du parc informatique et des affectations employés.
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <button
              type="button"
              (click)="goToItInterventions()"
              class="inline-flex h-11 items-center justify-center rounded-xl border border-gray-300 px-4 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
            >
              Voir interventions IT
            </button>
            <button
              type="button"
              (click)="openCreateForm()"
              class="inline-flex h-11 items-center justify-center rounded-xl bg-brand-500 px-5 text-sm font-semibold text-white transition hover:bg-brand-600"
            >
              Nouvel équipement IT
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
            type="button"
            class="h-9 rounded-lg bg-white px-4 text-sm font-semibold text-brand-700 shadow-theme-xs dark:bg-white/[0.03] dark:text-brand-300"
          >
            Parc IT
          </button>
          <button
            type="button"
            (click)="goToItInterventions()"
            class="h-9 rounded-lg px-4 text-sm font-semibold text-gray-600 transition hover:bg-white hover:text-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.03] dark:hover:text-white/90"
          >
            Interventions IT
          </button>
        </div>
      </section>

      <section class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
        <article class="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
          <p class="text-3xl font-semibold text-gray-900 dark:text-white/90">{{ equipments.length }}</p>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Équipements visibles</p>
        </article>
        <article class="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
          <p class="text-3xl font-semibold text-gray-900 dark:text-white/90">{{ assignedCount }}</p>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Affectés</p>
        </article>
        <article class="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
          <p class="text-3xl font-semibold text-gray-900 dark:text-white/90">{{ unassignedCount }}</p>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Non affectés</p>
        </article>
        <article class="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
          <p class="text-3xl font-semibold text-gray-900 dark:text-white/90">{{ inRepairCount }}</p>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">En panne</p>
        </article>
        <article class="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
          <p class="text-3xl font-semibold text-gray-900 dark:text-white/90">{{ maintenanceCount }}</p>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">En maintenance</p>
        </article>
      </section>

      <section class="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
        <div class="mb-3 flex items-center justify-between">
          <h2 class="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Catégories IT</h2>
          <span class="text-xs text-gray-500 dark:text-gray-400">{{ categoryStats.length }} catégories</span>
        </div>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <article *ngFor="let stat of categoryStats" class="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900">
            <p class="text-base font-semibold text-gray-900 dark:text-white/90">{{ stat.label }}</p>
            <p class="mt-1 text-2xl font-semibold text-gray-900 dark:text-white/90">{{ stat.total }}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">{{ stat.operational }} opérationnels</p>
          </article>
          <article *ngIf="categoryStats.length === 0" class="rounded-xl border border-dashed border-gray-300 bg-white p-3 text-sm text-gray-500 dark:border-gray-700 dark:bg-white/[0.03] dark:text-gray-400 sm:col-span-2 xl:col-span-4">
            Aucune catégorie disponible actuellement.
          </article>
        </div>
      </section>

      <section class="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
        <div class="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_220px_220px_220px_auto_auto]">
          <input
            type="text"
            [(ngModel)]="filters.search"
            placeholder="Recherche nom ou numéro de série"
            class="h-11 rounded-xl border border-gray-300 bg-transparent px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
          />
          <select
            [(ngModel)]="filters.categoryId"
            class="h-11 rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-700 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
          >
            <option value="">Toutes catégories</option>
            <option *ngFor="let category of categories" [value]="category.id">{{ category.name }}</option>
          </select>
          <select
            [(ngModel)]="filters.assignmentStatus"
            class="h-11 rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-700 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
          >
            <option value="">Tous statuts d'affectation</option>
            <option value="NOT_ASSIGNED">Non affecté</option>
            <option value="ASSIGNED">Affecté</option>
          </select>
          <select
            [(ngModel)]="filters.state"
            class="h-11 rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-700 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
          >
            <option value="">Tous états</option>
            <option *ngFor="let state of equipmentStates" [value]="state">{{ stateLabels[state] }}</option>
          </select>
          <button
            type="button"
            (click)="applyFilters()"
            class="h-11 rounded-xl border border-brand-300 px-4 text-sm font-semibold text-brand-700 transition hover:bg-brand-50 dark:border-brand-500/40 dark:text-brand-300 dark:hover:bg-brand-500/10"
          >
            Filtrer
          </button>
          <button
            type="button"
            (click)="resetFilters()"
            class="h-11 rounded-xl border border-gray-300 px-4 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
          >
            Réinitialiser
          </button>
        </div>
      </section>

      <section class="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div class="overflow-x-auto">
          <table class="min-w-full">
            <thead class="bg-gray-50 dark:bg-gray-900/60">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Équipement</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Catégorie</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">État</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Affectation</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Employé</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngIf="loading">
                <td colspan="6" class="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">Chargement du parc IT...</td>
              </tr>
              <tr *ngFor="let equipment of equipments" class="border-t border-gray-200 dark:border-gray-800">
                <td class="px-4 py-3 text-sm text-gray-800 dark:text-gray-200">
                  <p class="font-semibold">{{ equipment.name }}</p>
                  <p class="text-xs text-gray-500 dark:text-gray-400">{{ equipment.serialNumber }}</p>
                </td>
                <td class="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{{ equipment.categoryName }}</td>
                <td class="px-4 py-3 text-sm">
                  <span class="inline-flex rounded-full px-3 py-1 text-xs font-semibold" [ngClass]="stateBadgeClass(equipment.state)">
                    {{ stateLabels[equipment.state] }}
                  </span>
                </td>
                <td class="px-4 py-3 text-sm">
                  <span class="inline-flex rounded-full px-3 py-1 text-xs font-semibold" [ngClass]="equipment.assignmentStatus === 'ASSIGNED'
                    ? 'bg-success-500/10 text-success-700 dark:text-success-300'
                    : 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300'">
                    {{ equipment.assignmentStatus === 'ASSIGNED' ? 'Affecté' : 'Non affecté' }}
                  </span>
                </td>
                <td class="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                  <p>{{ equipment.currentEmployeeName || '-' }}</p>
                  <p *ngIf="equipment.assignedAt" class="text-xs text-gray-500 dark:text-gray-400">
                    Depuis {{ equipment.assignedAt | date:'shortDate' }}
                  </p>
                </td>
                <td class="px-4 py-3 text-sm">
                  <div class="flex flex-wrap gap-2">
                    <button type="button" (click)="openEditForm(equipment)" class="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]">Modifier</button>
                    <button type="button" (click)="openAssignModal(equipment)" class="rounded-lg border border-brand-300 px-3 py-1.5 text-xs font-semibold text-brand-700 transition hover:bg-brand-50 dark:border-brand-500/40 dark:text-brand-300 dark:hover:bg-brand-500/10">Affecter</button>
                    <button type="button" (click)="openDetails(equipment)" class="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]">Détails</button>
                    <button type="button" (click)="archive(equipment)" class="rounded-lg border border-error-300 px-3 py-1.5 text-xs font-semibold text-error-700 transition hover:bg-error-50 dark:border-error-500/40 dark:text-error-300 dark:hover:bg-error-500/10">Archiver</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div *ngIf="!loading && equipments.length === 0" class="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
          Aucun équipement IT trouvé pour ce filtre.
        </div>

        <div class="flex items-center justify-between border-t border-gray-200 px-4 py-3 text-sm dark:border-gray-800">
          <p class="text-gray-500 dark:text-gray-400">
            Page {{ page + 1 }} / {{ totalPages || 1 }} ({{ totalElements }} éléments)
          </p>
          <div class="flex gap-2">
            <button type="button" (click)="previousPage()" [disabled]="page === 0" class="rounded-lg border border-gray-300 px-3 py-1.5 font-semibold text-gray-700 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300">Précédent</button>
            <button type="button" (click)="nextPage()" [disabled]="page + 1 >= totalPages" class="rounded-lg border border-gray-300 px-3 py-1.5 font-semibold text-gray-700 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300">Suivant</button>
          </div>
        </div>
      </section>

      <section class="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
        <div class="mb-3 flex items-center justify-between">
          <h2 class="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Employés affectés</h2>
          <span class="text-xs text-gray-500 dark:text-gray-400">{{ activeAssignments.length }} affectations actives</span>
        </div>
        <div *ngIf="employeeAssignmentSummary.length === 0" class="rounded-xl border border-dashed border-gray-300 px-4 py-6 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
          Aucun équipement IT n'est actuellement affecté.
        </div>
        <div *ngIf="employeeAssignmentSummary.length > 0" class="space-y-2">
          <article *ngFor="let row of employeeAssignmentSummary" class="rounded-xl border border-gray-200 px-4 py-3 dark:border-gray-700">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <p class="text-sm font-semibold text-gray-900 dark:text-white/90">{{ row.employeeName }}</p>
              <span class="inline-flex rounded-full bg-brand-500/10 px-3 py-1 text-xs font-semibold text-brand-700 dark:text-brand-300">
                {{ row.count }} équipement(s)
              </span>
            </div>
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">{{ row.equipmentNames }}</p>
          </article>
        </div>
      </section>
    </div>

    <div *ngIf="showForm" class="fixed inset-0 z-[130000] flex items-center justify-center bg-gray-950/60 p-4 backdrop-blur-sm">
      <div class="w-full max-w-3xl rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
        <div class="mb-4 flex items-center justify-between">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white/90">{{ editingEquipmentId ? 'Modifier équipement IT' : 'Nouvel équipement IT' }}</h2>
          <button type="button" (click)="closeForm()" class="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700 dark:border-gray-700 dark:text-gray-300">Fermer</button>
        </div>

        <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
          <input [(ngModel)]="equipmentForm.name" placeholder="Nom équipement" class="h-11 rounded-xl border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200" />
          <input [(ngModel)]="equipmentForm.serialNumber" placeholder="Numéro de série" class="h-11 rounded-xl border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200" />
          <select [(ngModel)]="equipmentForm.categoryId" class="h-11 rounded-xl border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
            <option value="">Sélectionner catégorie</option>
            <option *ngFor="let category of categories" [value]="category.id">{{ category.name }}</option>
          </select>
          <select [(ngModel)]="equipmentForm.state" class="h-11 rounded-xl border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
            <option *ngFor="let state of equipmentStates" [value]="state">{{ stateLabels[state] }}</option>
          </select>
          <input [(ngModel)]="equipmentForm.brand" placeholder="Marque" class="h-11 rounded-xl border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200" />
          <input [(ngModel)]="equipmentForm.model" placeholder="Modèle" class="h-11 rounded-xl border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200" />
          <textarea [(ngModel)]="equipmentForm.description" placeholder="Description / remarques" rows="3" class="rounded-xl border border-gray-300 px-3 py-2 text-sm md:col-span-2 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"></textarea>
        </div>

        <div class="mt-4 flex justify-end gap-2">
          <button type="button" (click)="closeForm()" class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 dark:border-gray-700 dark:text-gray-300">Annuler</button>
          <button type="button" (click)="saveEquipment()" class="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600">Enregistrer</button>
        </div>
      </div>
    </div>

    <div *ngIf="showAssignForm && selectedEquipmentForAssignment" class="fixed inset-0 z-[130000] flex items-center justify-center bg-gray-950/60 p-4 backdrop-blur-sm">
      <div class="w-full max-w-xl rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
        <div class="mb-4 flex items-center justify-between">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white/90">Affecter équipement IT</h2>
          <button type="button" (click)="closeAssignForm()" class="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700 dark:border-gray-700 dark:text-gray-300">Fermer</button>
        </div>
        <p class="mb-3 text-sm text-gray-600 dark:text-gray-400">
          {{ selectedEquipmentForAssignment.name }} ({{ selectedEquipmentForAssignment.serialNumber }})
        </p>
        <select [(ngModel)]="selectedEmployeeId" class="h-11 w-full rounded-xl border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
          <option value="">Sélectionner un employé</option>
          <option *ngFor="let employee of assignableEmployees" [value]="employee.username">
            {{ employee.fullName }} - {{ employee.username }}
          </option>
        </select>

        <div *ngIf="selectedEquipmentForAssignment.assignmentStatus === 'ASSIGNED' && selectedEquipmentAssignment" class="mt-3 rounded-xl border border-warning-200 bg-warning-50 px-3 py-2 text-sm text-warning-700 dark:border-warning-500/40 dark:bg-warning-500/10 dark:text-warning-300">
          Équipement déjà affecté à {{ selectedEquipmentForAssignment.currentEmployeeName || selectedEquipmentForAssignment.currentEmployeeId }}.
          <button type="button" (click)="returnEquipment(selectedEquipmentAssignment)" class="ml-2 underline">Désaffecter d'abord</button>
        </div>

        <div class="mt-4 flex justify-end gap-2">
          <button type="button" (click)="closeAssignForm()" class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 dark:border-gray-700 dark:text-gray-300">Annuler</button>
          <button type="button" (click)="assignToEmployee()" class="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600">Affecter</button>
        </div>
      </div>
    </div>

    <div *ngIf="showDetails && selectedEquipmentDetails" class="fixed inset-0 z-[130000] flex items-center justify-center bg-gray-950/60 p-4 backdrop-blur-sm">
      <div class="w-full max-w-3xl rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
        <div class="mb-4 flex items-center justify-between">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white/90">Détails équipement IT</h2>
          <button type="button" (click)="closeDetails()" class="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700 dark:border-gray-700 dark:text-gray-300">Fermer</button>
        </div>
        <div class="grid grid-cols-1 gap-2 text-sm text-gray-700 md:grid-cols-2 dark:text-gray-300">
          <p><span class="font-semibold">Nom:</span> {{ selectedEquipmentDetails.name }}</p>
          <p><span class="font-semibold">Série:</span> {{ selectedEquipmentDetails.serialNumber }}</p>
          <p><span class="font-semibold">Catégorie:</span> {{ selectedEquipmentDetails.categoryName }}</p>
          <p><span class="font-semibold">État:</span> {{ stateLabels[selectedEquipmentDetails.state] }}</p>
          <p><span class="font-semibold">Marque:</span> {{ selectedEquipmentDetails.brand || '-' }}</p>
          <p><span class="font-semibold">Modèle:</span> {{ selectedEquipmentDetails.model || '-' }}</p>
          <p class="md:col-span-2"><span class="font-semibold">Description:</span> {{ selectedEquipmentDetails.description || '-' }}</p>
        </div>
        <div class="mt-4">
          <h3 class="mb-2 text-sm font-semibold text-gray-800 dark:text-gray-200">Historique d’affectation</h3>
          <div *ngIf="assignmentHistory.length === 0" class="rounded-xl border border-dashed border-gray-300 px-3 py-4 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
            Aucun historique disponible.
          </div>
          <ul *ngIf="assignmentHistory.length > 0" class="space-y-2">
            <li *ngFor="let assignment of assignmentHistory" class="rounded-xl border border-gray-200 px-3 py-2 text-sm dark:border-gray-700">
              <p class="font-semibold text-gray-800 dark:text-gray-200">{{ assignment.employeeName }} ({{ assignment.employeeId }})</p>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                {{ assignment.assignedAt | date:'short' }} - {{ assignment.returnedAt ? (assignment.returnedAt | date:'short') : 'Affectation active' }}
              </p>
            </li>
          </ul>
        </div>
      </div>
    </div>
  `,
})
export class ItEquipmentComponent implements OnInit {
  equipments: ItEquipment[] = [];
  categories: ItEquipmentCategory[] = [];
  activeAssignments: ItEquipmentAssignment[] = [];
  assignableEmployees: ItAssignableEmployee[] = [];

  loading = false;
  page = 0;
  size = 10;
  totalElements = 0;
  totalPages = 0;

  feedbackMessage = '';
  feedbackTone: FeedbackTone = 'success';

  showForm = false;
  editingEquipmentId = '';
  showAssignForm = false;
  selectedEquipmentForAssignment: ItEquipment | null = null;
  selectedEmployeeId = '';
  selectedEquipmentAssignment: ItEquipmentAssignment | null = null;
  showDetails = false;
  selectedEquipmentDetails: ItEquipment | null = null;
  assignmentHistory: ItEquipmentAssignment[] = [];

  filters: {
    search: string;
    categoryId: string;
    state: '' | ItEquipmentState;
    assignmentStatus: '' | 'NOT_ASSIGNED' | 'ASSIGNED';
  } = {
    search: '',
    categoryId: '',
    state: '',
    assignmentStatus: '',
  };

  equipmentForm: {
    name: string;
    serialNumber: string;
    categoryId: string;
    brand: string;
    model: string;
    state: ItEquipmentState;
    description: string;
  } = {
    name: '',
    serialNumber: '',
    categoryId: '',
    brand: '',
    model: '',
    state: 'OPERATIONAL',
    description: '',
  };

  readonly equipmentStates: ItEquipmentState[] = [
    'OPERATIONAL',
    'IN_REPAIR',
    'IN_MAINTENANCE',
    'OUT_OF_SERVICE',
    'ARCHIVED',
  ];

  readonly stateLabels: Record<ItEquipmentState, string> = {
    OPERATIONAL: 'Opérationnel',
    IN_REPAIR: 'En panne',
    IN_MAINTENANCE: 'En maintenance',
    OUT_OF_SERVICE: 'Hors service',
    ARCHIVED: 'Archivé',
  };

  constructor(
    private itEquipmentService: ItEquipmentService,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.filters.search = this.readRouteSearch();
    this.loadCategories();
    this.loadEmployees();
    this.loadEquipments();
    this.loadAssignments();
  }

  get assignedCount(): number {
    return this.equipments.filter((item) => item.assignmentStatus === 'ASSIGNED').length;
  }

  get unassignedCount(): number {
    return this.equipments.filter((item) => item.assignmentStatus !== 'ASSIGNED').length;
  }

  get maintenanceCount(): number {
    return this.equipments.filter((item) => item.state === 'IN_MAINTENANCE').length;
  }

  get inRepairCount(): number {
    return this.equipments.filter((item) => item.state === 'IN_REPAIR').length;
  }

  get categoryStats(): Array<{ label: string; total: number; operational: number }> {
    const statsMap = new Map<string, { label: string; total: number; operational: number }>();
    for (const equipment of this.equipments) {
      const label = (equipment.categoryName || 'Autre').trim() || 'Autre';
      const existing = statsMap.get(label) || { label, total: 0, operational: 0 };
      existing.total += 1;
      if (equipment.state === 'OPERATIONAL') {
        existing.operational += 1;
      }
      statsMap.set(label, existing);
    }

    return Array.from(statsMap.values())
      .sort((left, right) => right.total - left.total)
      .slice(0, 4);
  }

  get employeeAssignmentSummary(): Array<{ employeeName: string; count: number; equipmentNames: string }> {
    const grouped = new Map<string, { employeeName: string; count: number; equipmentNames: string[] }>();

    for (const assignment of this.activeAssignments) {
      const key = assignment.employeeId;
      const existing = grouped.get(key) || {
        employeeName: assignment.employeeName || assignment.employeeId,
        count: 0,
        equipmentNames: [],
      };
      existing.count += 1;
      existing.equipmentNames.push(assignment.equipmentName);
      grouped.set(key, existing);
    }

    return Array.from(grouped.values())
      .map((row) => ({
        employeeName: row.employeeName,
        count: row.count,
        equipmentNames: row.equipmentNames.join(', '),
      }))
      .sort((left, right) => right.count - left.count);
  }

  applyFilters(): void {
    this.page = 0;
    this.loadEquipments();
  }

  resetFilters(): void {
    this.filters = {
      search: '',
      categoryId: '',
      state: '',
      assignmentStatus: '',
    };
    this.page = 0;
    this.loadEquipments();
  }

  goToItInterventions(): void {
    this.router.navigateByUrl('/it/interventions');
  }

  previousPage(): void {
    if (this.page <= 0) {
      return;
    }
    this.page -= 1;
    this.loadEquipments();
  }

  nextPage(): void {
    if (this.page + 1 >= this.totalPages) {
      return;
    }
    this.page += 1;
    this.loadEquipments();
  }

  openCreateForm(): void {
    this.editingEquipmentId = '';
    this.equipmentForm = {
      name: '',
      serialNumber: '',
      categoryId: '',
      brand: '',
      model: '',
      state: 'OPERATIONAL',
      description: '',
    };
    this.showForm = true;
  }

  openEditForm(equipment: ItEquipment): void {
    this.editingEquipmentId = equipment.id;
    this.equipmentForm = {
      name: equipment.name,
      serialNumber: equipment.serialNumber,
      categoryId: equipment.categoryId,
      brand: equipment.brand || '',
      model: equipment.model || '',
      state: equipment.state,
      description: equipment.description || '',
    };
    this.showForm = true;
  }

  closeForm(): void {
    this.showForm = false;
  }

  saveEquipment(): void {
    if (!this.equipmentForm.name.trim() || !this.equipmentForm.serialNumber.trim() || !this.equipmentForm.categoryId) {
      this.setFeedback('Nom, série et catégorie sont obligatoires.', 'error');
      return;
    }

    const payload = {
      name: this.equipmentForm.name.trim(),
      serialNumber: this.equipmentForm.serialNumber.trim(),
      categoryId: this.equipmentForm.categoryId,
      brand: this.equipmentForm.brand.trim() || undefined,
      model: this.equipmentForm.model.trim() || undefined,
      state: this.equipmentForm.state,
      description: this.equipmentForm.description.trim() || undefined,
    };

    const request$ = this.editingEquipmentId
      ? this.itEquipmentService.updateEquipment(this.editingEquipmentId, payload)
      : this.itEquipmentService.createEquipment(payload);

    request$.subscribe({
      next: () => {
        this.setFeedback(this.editingEquipmentId ? 'Équipement IT modifié avec succès.' : 'Équipement IT créé avec succès.', 'success');
        this.showForm = false;
        this.loadEquipments();
      },
      error: (error) => this.setFeedback(this.toErrorMessage(error, 'Opération impossible sur l’équipement IT.'), 'error'),
    });
  }

  archive(equipment: ItEquipment): void {
    if (!confirm(`Archiver l'équipement "${equipment.name}" ?`)) {
      return;
    }
    this.itEquipmentService.archiveEquipment(equipment.id).subscribe({
      next: () => {
        this.setFeedback('Équipement IT archivé.', 'success');
        this.loadEquipments();
      },
      error: (error) => this.setFeedback(this.toErrorMessage(error, 'Archivage impossible.'), 'error'),
    });
  }

  openAssignModal(equipment: ItEquipment): void {
    this.selectedEquipmentForAssignment = equipment;
    this.selectedEmployeeId = '';
    this.selectedEquipmentAssignment = this.activeAssignments.find((item) => item.equipmentId === equipment.id) || null;
    this.showAssignForm = true;
  }

  closeAssignForm(): void {
    this.showAssignForm = false;
    this.selectedEquipmentForAssignment = null;
    this.selectedEmployeeId = '';
    this.selectedEquipmentAssignment = null;
  }

  assignToEmployee(): void {
    if (!this.selectedEquipmentForAssignment) {
      return;
    }
    if (!this.selectedEmployeeId) {
      this.setFeedback('Sélectionnez un employé pour affecter l’équipement.', 'error');
      return;
    }

    this.itEquipmentService.assignEquipment(this.selectedEquipmentForAssignment.id, this.selectedEmployeeId).subscribe({
      next: () => {
        this.setFeedback('Équipement IT affecté avec succès.', 'success');
        this.closeAssignForm();
        this.loadEquipments();
        this.loadAssignments();
      },
      error: (error) => this.setFeedback(this.toErrorMessage(error, 'Affectation impossible.'), 'error'),
    });
  }

  returnEquipment(assignment: ItEquipmentAssignment): void {
    this.itEquipmentService.returnEquipment(assignment.id).subscribe({
      next: () => {
        this.setFeedback('Désaffectation réalisée.', 'success');
        this.closeAssignForm();
        this.loadAssignments();
        this.loadEquipments();
      },
      error: (error) => this.setFeedback(this.toErrorMessage(error, 'Désaffectation impossible.'), 'error'),
    });
  }

  openDetails(equipment: ItEquipment): void {
    this.selectedEquipmentDetails = equipment;
    this.assignmentHistory = [];
    this.showDetails = true;
    this.itEquipmentService.getEquipmentAssignmentHistory(equipment.id).subscribe({
      next: (history) => {
        this.assignmentHistory = history;
      },
      error: () => {
        this.assignmentHistory = [];
      },
    });
  }

  closeDetails(): void {
    this.showDetails = false;
    this.selectedEquipmentDetails = null;
    this.assignmentHistory = [];
  }

  stateBadgeClass(state: ItEquipmentState): string {
    if (state === 'OPERATIONAL') {
      return 'bg-success-500/10 text-success-700 dark:text-success-300';
    }
    if (state === 'IN_REPAIR') {
      return 'bg-error-500/10 text-error-700 dark:text-error-300';
    }
    if (state === 'IN_MAINTENANCE') {
      return 'bg-warning-500/10 text-warning-700 dark:text-warning-300';
    }
    if (state === 'OUT_OF_SERVICE') {
      return 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300';
    }
    return 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300';
  }

  private loadEquipments(): void {
    this.loading = true;
    this.itEquipmentService.listEquipments({
      page: this.page,
      size: this.size,
      search: this.filters.search,
      categoryId: this.filters.categoryId || undefined,
      state: this.filters.state || undefined,
      assignmentStatus: this.filters.assignmentStatus || undefined,
    }).subscribe({
      next: (response) => {
        this.equipments = response.content || [];
        this.page = response.page || 0;
        this.size = response.size || this.size;
        this.totalElements = response.totalElements || 0;
        this.totalPages = response.totalPages || 0;
        this.loading = false;
      },
      error: (error) => {
        this.equipments = [];
        this.loading = false;
        this.setFeedback(this.toErrorMessage(error, 'Chargement du parc IT impossible.'), 'error');
      },
    });
  }

  private loadCategories(): void {
    this.itEquipmentService.getCategories().subscribe({
      next: (categories) => {
        this.categories = categories;
      },
      error: () => {
        this.categories = [];
      },
    });
  }

  private loadAssignments(): void {
    this.itEquipmentService.listAssignments(0, 200).subscribe({
      next: (response) => {
        this.activeAssignments = response.content || [];
      },
      error: () => {
        this.activeAssignments = [];
      },
    });
  }

  private loadEmployees(): void {
    this.itEquipmentService.getAssignableEmployees().subscribe({
      next: (employees) => {
        this.assignableEmployees = employees;
      },
      error: () => {
        this.assignableEmployees = [];
      },
    });
  }

  private setFeedback(message: string, tone: FeedbackTone): void {
    this.feedbackMessage = message;
    this.feedbackTone = tone;
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
        return 'Accès refusé à ce module IT.';
      }
      if (error.status === 409) {
        return 'Conflit de données: vérifiez l’état et l’affectation.';
      }
    }
    return fallback;
  }
}
