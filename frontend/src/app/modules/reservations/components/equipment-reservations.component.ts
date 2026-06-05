import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AppRole, Equipment, EquipmentReservation, Event } from '../../../core/models';
import { AuthService } from '../../../core/services/auth.service';
import { EventService } from '../../../core/services/event.service';
import { ReservationService } from '../../../core/services/reservation.service';
import { Option, SelectComponent } from '../../../shared/components/form/select/select.component';

type EquipmentVisualStatus = 'DISPONIBLE' | 'EN_COURS' | 'INDISPONIBLE';
type EquipmentStatusFilter = 'all' | 'available' | 'in-use' | 'unavailable';
type EquipmentBusinessStatus = 'DISPONIBLE' | 'OCCUPE' | 'MAINTENANCE' | 'INACTIVE';

interface EquipmentRowView {
  item: Equipment;
  availableQty: number;
  totalQty: number;
  status: EquipmentVisualStatus;
  reservedBy: string;
  expectedReturn: string;
}

type ReserveActionState = 'ready' | 'no-permission' | 'no-stock';

@Component({
  selector: 'app-equipment-reservations',
  standalone: true,
  imports: [CommonModule, FormsModule, SelectComponent],
  template: `
    <div class="space-y-6">
      <div class="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 class="mb-1 text-2xl font-bold text-gray-900 dark:text-white/90 lg:text-3xl">Reservations equipements</h1>
            <p class="max-w-2xl text-sm text-gray-600 dark:text-gray-400">
              Supervision des stocks, prets en cours et disponibilites des equipements partages.
            </p>
            <div class="mt-3 flex flex-wrap items-center gap-2">
              <span class="inline-flex rounded-full bg-brand-500/10 px-3 py-1 text-xs font-semibold text-brand-700 dark:text-brand-300">
                {{ roleLabels[currentRole] }}
              </span>
              <span class="inline-flex rounded-full bg-success-500/10 px-3 py-1 text-xs font-semibold text-success-700 dark:text-success-300">
                Gestion equipements active
              </span>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <button
              *ngIf="canManageInventory()"
              type="button"
              (click)="openCreateEquipmentModal()"
              class="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-brand-300 px-4 text-sm font-semibold text-brand-700 transition hover:bg-brand-50 dark:border-brand-500/50 dark:text-brand-300 dark:hover:bg-brand-500/10"
            >
              <span class="text-lg leading-none">+</span>
              Nouvel equipement
            </button>
            <button
              type="button"
              (click)="openNewReservationModal()"
              [disabled]="!canCreateReservations()"
              class="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-success-500 px-4 text-sm font-semibold text-white transition hover:bg-success-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span class="text-lg leading-none">+</span>
              Nouvelle reservation
            </button>
          </div>
        </div>

        <div class="mt-5 inline-flex rounded-xl border border-gray-200 bg-gray-50 p-1 dark:border-gray-700 dark:bg-gray-900">
          <button
            type="button"
            (click)="goToRoomReservations()"
            class="h-9 rounded-lg px-4 text-sm font-semibold text-gray-600 transition hover:bg-white hover:text-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.03] dark:hover:text-white/90"
          >
            Salles
          </button>
          <button
            type="button"
            class="h-9 rounded-lg bg-white px-4 text-sm font-semibold text-brand-700 shadow-theme-xs dark:bg-white/[0.03] dark:text-brand-300"
          >
            Equipements logistiques
          </button>
        </div>

        <div class="mt-5 grid grid-cols-1 gap-3 md:grid-cols-4">
          <article class="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
            <p class="text-3xl font-semibold text-gray-900 dark:text-white/90">{{ totalEquipments }}</p>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Stock total</p>
          </article>

          <article class="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
            <p class="text-3xl font-semibold text-warning-600 dark:text-warning-300">{{ activeLoans }}</p>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Prets en cours</p>
          </article>

          <article class="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
            <p class="text-3xl font-semibold text-success-600 dark:text-success-300">{{ usageRate }}%</p>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Taux utilisation</p>
          </article>

          <article class="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
            <p class="text-3xl font-semibold text-brand-600 dark:text-brand-300">{{ returnsTonight }}</p>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Retours imminents</p>
          </article>
        </div>

        <div class="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_220px_220px_auto_auto] lg:items-center">
          <input
            type="text"
            [(ngModel)]="searchTerm"
            placeholder="Rechercher un equipement..."
            class="h-11 w-full rounded-xl border border-gray-300 bg-transparent px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
          />

          <app-select
            [(ngModel)]="categoryFilter"
            [options]="categoryFilterOptions"
            placeholder="Toutes categories"
          ></app-select>

          <app-select
            [(ngModel)]="statusFilter"
            [options]="statusFilterOptions"
            placeholder="Tous statuts"
          ></app-select>

          <button
            type="button"
            (click)="applyFilters()"
            class="h-11 rounded-xl bg-brand-500 px-4 text-sm font-semibold text-white transition hover:bg-brand-600"
          >
            Appliquer
          </button>

          <button
            type="button"
            (click)="resetFilters()"
            class="h-11 rounded-xl border border-gray-300 px-4 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
          >
            Reinitialiser
          </button>
        </div>
      </div>

      <div
        *ngIf="canValidateReservations()"
        class="mt-5 rounded-2xl border border-brand-200 bg-brand-50/70 p-4 dark:border-brand-500/30 dark:bg-brand-500/10"
      >
        <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 class="text-base font-semibold text-gray-900 dark:text-white/90">Reservations a valider</h2>
            <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Validez ou refusez les demandes d equipements en attente.
            </p>
          </div>
          <span class="inline-flex rounded-full bg-white px-3 py-1 text-xs font-semibold text-brand-700 shadow-sm dark:bg-white/[0.08] dark:text-brand-300">
            {{ pendingEquipmentReservations.length }} en attente
          </span>
        </div>

        <div class="mt-4">
          <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Motif de refus
          </label>
          <textarea
            rows="3"
            [(ngModel)]="validationComment"
            placeholder="Renseignez un motif avant de refuser une reservation..."
            class="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
          ></textarea>
          <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Le commentaire est obligatoire uniquement si vous refusez une reservation.
          </p>
        </div>

        <div
          *ngIf="pendingEquipmentReservations.length === 0"
          class="mt-4 rounded-xl border border-dashed border-brand-200 bg-white px-4 py-6 text-center text-sm text-gray-600 dark:border-brand-500/30 dark:bg-white/[0.03] dark:text-gray-300"
        >
          Aucune reservation en attente de validation.
        </div>

        <div *ngIf="pendingEquipmentReservations.length > 0" class="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-2">
          <article
            *ngFor="let reservation of pendingEquipmentReservations"
            class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]"
          >
            <div class="flex items-start justify-between gap-3">
              <div>
                <h3 class="text-base font-semibold text-gray-900 dark:text-white/90">{{ reservation.equipmentName }}</h3>
                <p class="text-sm text-gray-600 dark:text-gray-400">{{ reservation.userName }}</p>
              </div>
              <span class="inline-flex rounded-full bg-warning-50 px-3 py-1 text-xs font-semibold text-warning-700 dark:bg-warning-500/20 dark:text-warning-300">
                En attente
              </span>
            </div>

            <div class="mt-3 space-y-1 text-sm text-gray-600 dark:text-gray-300">
              <p><span class="font-medium text-gray-900 dark:text-white/90">Reference :</span> {{ reservation.referenceCode || reservation.id }}</p>
              <p><span class="font-medium text-gray-900 dark:text-white/90">Quantite :</span> {{ reservation.quantityRequested || 1 }}</p>
              <p><span class="font-medium text-gray-900 dark:text-white/90">Creneau :</span> {{ reservation.startDate | date:'dd/MM/yyyy HH:mm' }} → {{ reservation.endDate | date:'dd/MM/yyyy HH:mm' }}</p>
              <p><span class="font-medium text-gray-900 dark:text-white/90">Motif :</span> {{ reservation.purpose || 'Reservation equipement' }}</p>
              <p *ngIf="reservation.eventId"><span class="font-medium text-gray-900 dark:text-white/90">Evenement :</span> {{ reservation.eventId }}</p>
            </div>

            <div class="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                (click)="validateEquipmentReservation(reservation, true)"
                [disabled]="!!validationInProgressId"
                class="h-10 rounded-lg bg-success-500 px-4 text-xs font-semibold text-white transition hover:bg-success-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Valider
              </button>
              <button
                type="button"
                (click)="validateEquipmentReservation(reservation, false)"
                [disabled]="!!validationInProgressId || validationComment.trim().length === 0"
                class="h-10 rounded-lg border border-error-300 px-4 text-xs font-semibold text-error-700 transition hover:bg-error-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-error-500/50 dark:text-error-300 dark:hover:bg-error-500/10"
              >
                Refuser
              </button>
            </div>
          </article>
        </div>
      </div>

      <div
        *ngIf="equipmentLoading"
        class="rounded-2xl border border-gray-200 bg-white px-6 py-8 text-center text-sm text-gray-500 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-300"
      >
        Chargement des equipements...
      </div>

      <div
        *ngIf="!equipmentLoading && equipmentLoadError"
        class="rounded-2xl border border-error-200 bg-error-50 px-6 py-4 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-300"
      >
        {{ equipmentLoadError }}
      </div>

      <div class="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div class="max-h-[68vh] overflow-auto">
          <table class="min-w-full">
            <thead>
              <tr class="border-b border-gray-200 dark:border-gray-800">
                <th class="px-6 py-4 text-left text-sm font-semibold text-gray-500 dark:text-gray-400">Equipement</th>
                <th class="px-4 py-4 text-left text-sm font-semibold text-gray-500 dark:text-gray-400">Categorie</th>
                <th class="px-4 py-4 text-left text-sm font-semibold text-gray-500 dark:text-gray-400">Qte dispo</th>
                <th class="px-4 py-4 text-left text-sm font-semibold text-gray-500 dark:text-gray-400">Statut</th>
                <th class="px-4 py-4 text-left text-sm font-semibold text-gray-500 dark:text-gray-400">Reserve par</th>
                <th class="px-4 py-4 text-left text-sm font-semibold text-gray-500 dark:text-gray-400">Retour prevu</th>
                <th class="px-4 py-4 text-right text-sm font-semibold text-gray-500 dark:text-gray-400">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let row of filteredRows" class="border-b border-gray-200 dark:border-gray-800">
                <td class="px-6 py-4 align-top">
                  <div class="text-base font-semibold text-gray-900 dark:text-white/90">{{ row.item.name }}</div>
                  <div class="text-sm text-gray-500 dark:text-gray-400">{{ row.item.description }}</div>
                </td>
                <td class="px-4 py-4 align-top">
                  <span class="inline-flex rounded-full px-3 py-1 text-xs font-semibold" [ngClass]="getCategoryBadgeClass(row.item.category)">
                    {{ getCategoryLabel(row.item.category) }}
                  </span>
                </td>
                <td class="px-4 py-4 align-top text-2sm font-semibold text-gray-800 dark:text-gray-100">{{ row.availableQty }} / {{ row.totalQty }}</td>
                <td class="px-4 py-4 align-top">
                  <span class="inline-flex rounded-full px-3 py-1 text-xs font-semibold" [ngClass]="getStatusBadgeClass(row.status)">
                    {{ getStatusLabel(row.status) }}
                  </span>
                </td>
                <td class="px-4 py-4 align-top text-2sm text-gray-800 dark:text-gray-200">{{ row.reservedBy }}</td>
                <td class="px-4 py-4 align-top text-2sm text-gray-800 dark:text-gray-200">{{ row.expectedReturn }}</td>
                <td class="px-4 py-4 align-top text-right">
                  <div class="flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      (click)="onReserveClick(row)"
                      class="h-10 rounded-lg border border-gray-300 px-3 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-55 dark:border-gray-700"
                      [ngClass]="getReserveActionState(row) === 'ready'
                        ? 'text-gray-800 hover:bg-gray-100 dark:text-white/90 dark:hover:bg-white/[0.03]'
                        : 'text-gray-500 dark:text-gray-400'"
                    >
                      {{ getReserveActionLabel(row) }}
                    </button>
                    <button
                      type="button"
                      (click)="openEquipmentDetails(row.item)"
                      class="h-10 rounded-lg border border-gray-300 px-3 text-xs font-semibold text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
                    >
                      Voir planning
                    </button>
                    <button
                      *ngIf="canManageInventory()"
                      type="button"
                      (click)="openEditEquipmentModal(row.item)"
                      class="h-10 rounded-lg border border-gray-300 px-3 text-xs font-semibold text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
                    >
                      Modifier
                    </button>
                    <button
                      *ngIf="canManageInventory()"
                      type="button"
                      (click)="setEquipmentBusinessStatus(row.item, 'MAINTENANCE')"
                      [disabled]="row.item.status === 'MAINTENANCE'"
                      class="h-10 rounded-lg border border-warning-300 px-3 text-xs font-semibold text-warning-700 hover:bg-warning-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-warning-500/50 dark:text-warning-300 dark:hover:bg-warning-500/10"
                    >
                      Maintenance
                    </button>
                    <button
                      *ngIf="canManageInventory()"
                      type="button"
                      (click)="toggleEquipmentActive(row.item)"
                      class="h-10 rounded-lg border border-brand-300 px-3 text-xs font-semibold text-brand-700 hover:bg-brand-50 dark:border-brand-500/50 dark:text-brand-300 dark:hover:bg-brand-500/10"
                    >
                      {{ row.item.status === 'RETIRED' ? 'Reactiver' : 'Desactiver' }}
                    </button>
                  </div>
                </td>
              </tr>

              <tr *ngIf="filteredRows.length === 0">
                <td colspan="7" class="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                  Aucun equipement ne correspond aux filtres.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div
        *ngIf="!equipmentLoading && equipmentTotalElements > 0"
        class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-white/[0.03]"
      >
        <p class="text-sm text-gray-600 dark:text-gray-300">
          Affichage {{ getPaginationStart(equipmentPage, equipmentPageSize, equipmentTotalElements) }}-{{ getPaginationEnd(equipmentPage, equipmentPageSize, equipmentTotalElements) }} sur {{ equipmentTotalElements }} éléments
        </p>
        <div class="flex items-center gap-2">
          <button
            type="button"
            (click)="previousEquipmentPage()"
            [disabled]="equipmentPage === 0"
            class="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300"
          >
            Precedent
          </button>
          <button
            *ngFor="let page of getVisiblePages(equipmentPage, equipmentTotalPages)"
            type="button"
            (click)="goToEquipmentPage(page)"
            class="rounded-lg border px-3 py-2 text-sm font-semibold transition dark:border-gray-700"
            [ngClass]="page === equipmentPage
              ? 'border-brand-500 bg-brand-500 text-white'
              : 'border-gray-300 text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/[0.03]'"
          >
            {{ page + 1 }}
          </button>
          <button
            type="button"
            (click)="nextEquipmentPage()"
            [disabled]="equipmentPage + 1 >= equipmentTotalPages"
            class="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300"
          >
            Suivant
          </button>
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

      <div *ngIf="lastCreatedReservationId" class="flex justify-end">
        <button
          type="button"
          (click)="downloadLatestReservationPdf()"
          class="h-10 rounded-lg border border-brand-300 px-4 text-sm font-semibold text-brand-700 transition hover:bg-brand-50 dark:border-brand-500/50 dark:text-brand-300 dark:hover:bg-brand-500/10"
        >
          Telecharger PDF reservation
        </button>
      </div>

      <div
        *ngIf="isModalOpen"
        class="fixed inset-0 z-[110000] flex items-center justify-center bg-gray-950/60 p-4"
      >
        <div class="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900 sm:p-6">
          <div class="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 class="text-xl font-semibold text-gray-900 dark:text-white/90">Reservation equipement</h2>
              <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">Definissez la plage de pret.</p>
            </div>
            <button
              type="button"
              (click)="closeModal()"
              class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
            >
              x
            </button>
          </div>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div class="sm:col-span-2">
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Evenement lie (optionnel)</label>
              <app-select
                [(ngModel)]="selectedEventId"
                [options]="eventSelectOptions"
                placeholder="Aucun evenement lie"
              ></app-select>
            </div>

            <div class="sm:col-span-2">
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Equipement</label>
              <app-select
                [(ngModel)]="selectedEquipmentId"
                [options]="reservableEquipmentOptions"
                placeholder="Choisir un equipement"
              ></app-select>
            </div>

            <div class="sm:col-span-2">
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Motif</label>
              <textarea
                rows="3"
                [(ngModel)]="bookingForm.purpose"
                class="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              ></textarea>
            </div>

            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Debut</label>
              <input
                type="datetime-local"
                [(ngModel)]="bookingForm.startDate"
                class="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              />
            </div>

            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Fin</label>
              <input
                type="datetime-local"
                [(ngModel)]="bookingForm.endDate"
                class="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              />
            </div>

            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Quantite demandee</label>
              <input
                type="number"
                min="1"
                [(ngModel)]="bookingForm.quantityRequested"
                class="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              />
            </div>

            <div class="sm:col-span-2 flex justify-end gap-2 pt-2">
              <button
                type="button"
                (click)="closeModal()"
                class="h-11 rounded-lg border border-gray-300 px-4 text-sm font-semibold text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
              >
                Annuler
              </button>
              <button
                type="button"
                (click)="reserveEquipment()"
                [disabled]="!canSubmitEquipmentBooking"
                class="h-11 rounded-lg bg-brand-500 px-4 text-sm font-semibold text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      </div>

      <div
        *ngIf="isEquipmentFormModalOpen"
        class="fixed inset-0 z-[110100] flex items-center justify-center bg-gray-950/60 p-4"
      >
        <div class="w-full max-w-3xl rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900 sm:p-6">
          <div class="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 class="text-xl font-semibold text-gray-900 dark:text-white/90">
                {{ equipmentFormMode === 'create' ? 'Nouvel equipement' : 'Modifier equipement' }}
              </h2>
              <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">Gestion metier responsable salle</p>
            </div>
            <button
              type="button"
              (click)="closeEquipmentFormModal()"
              class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
            >
              x
            </button>
          </div>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Nom</label>
              <input
                type="text"
                [(ngModel)]="equipmentForm.name"
                class="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              />
            </div>
            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Type</label>
              <input
                type="text"
                [(ngModel)]="equipmentForm.type"
                class="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              />
            </div>
            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Numero serie</label>
              <input
                type="text"
                [(ngModel)]="equipmentForm.serialNumber"
                class="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              />
            </div>
            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Localisation</label>
              <input
                type="text"
                [(ngModel)]="equipmentForm.location"
                class="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              />
            </div>
            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Quantite totale</label>
              <input
                type="number"
                min="1"
                [(ngModel)]="equipmentForm.totalQuantity"
                class="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              />
            </div>
            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Quantite disponible</label>
              <input
                type="number"
                min="0"
                [(ngModel)]="equipmentForm.availableQuantity"
                class="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              />
            </div>
            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Statut</label>
              <app-select
                [(ngModel)]="equipmentForm.status"
                [options]="equipmentStatusOptions"
                placeholder="Choisir un statut"
              ></app-select>
            </div>
            <div class="sm:col-span-2">
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Description</label>
              <textarea
                rows="3"
                [(ngModel)]="equipmentForm.description"
                class="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              ></textarea>
            </div>
          </div>

          <p *ngIf="equipmentFormError" class="mt-4 text-sm text-error-600 dark:text-error-300">{{ equipmentFormError }}</p>

          <div class="mt-5 flex justify-end gap-2">
            <button
              type="button"
              (click)="closeEquipmentFormModal()"
              class="h-11 rounded-lg border border-gray-300 px-4 text-sm font-semibold text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
            >
              Annuler
            </button>
            <button
              type="button"
              (click)="saveEquipment()"
              [disabled]="equipmentFormSaving"
              class="h-11 rounded-lg bg-brand-500 px-4 text-sm font-semibold text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {{ equipmentFormSaving ? 'Enregistrement...' : 'Enregistrer' }}
            </button>
          </div>
        </div>
      </div>

      <div
        *ngIf="isEquipmentDetailsModalOpen && selectedEquipmentDetails"
        class="fixed inset-0 z-[110050] flex items-center justify-center bg-gray-950/60 p-4"
      >
        <div class="w-full max-w-3xl rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900 sm:p-6">
          <div class="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 class="text-xl font-semibold text-gray-900 dark:text-white/90">{{ selectedEquipmentDetails.name }}</h2>
              <p class="text-sm text-gray-600 dark:text-gray-400">
                {{ selectedEquipmentDetails.type || getCategoryLabel(selectedEquipmentDetails.category) }} - {{ selectedEquipmentDetails.location }}
              </p>
            </div>
            <button
              type="button"
              (click)="closeEquipmentDetailsModal()"
              class="h-10 rounded-lg border border-gray-300 px-4 text-sm font-semibold text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
            >
              Fermer
            </button>
          </div>

          <div class="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm dark:border-gray-700 dark:bg-gray-900">
            <p class="text-gray-700 dark:text-gray-300">{{ selectedEquipmentDetails.description || 'Aucune description' }}</p>
            <p class="mt-2 text-gray-600 dark:text-gray-300">
              Quantite: {{ selectedEquipmentDetails.availableQuantity ?? 0 }} / {{ selectedEquipmentDetails.totalQuantity ?? 0 }}
            </p>
          </div>

          <div class="mt-4">
            <h3 class="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Reservations liees
            </h3>
            <div class="max-h-60 overflow-auto rounded-lg border border-gray-200 dark:border-gray-700">
              <table class="min-w-full">
                <thead>
                  <tr class="border-b border-gray-200 dark:border-gray-700">
                    <th class="px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">Demandeur</th>
                    <th class="px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">Quantite</th>
                    <th class="px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">Debut</th>
                    <th class="px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">Fin</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let reservation of getEquipmentReservationsForDetails(selectedEquipmentDetails.id)" class="border-b border-gray-200 dark:border-gray-700">
                    <td class="px-3 py-2 text-xs text-gray-700 dark:text-gray-200">{{ reservation.userName }}</td>
                    <td class="px-3 py-2 text-xs text-gray-700 dark:text-gray-200">{{ reservation.quantityRequested || 1 }}</td>
                    <td class="px-3 py-2 text-xs text-gray-700 dark:text-gray-200">{{ reservation.startDate | date:'dd/MM/yyyy HH:mm' }}</td>
                    <td class="px-3 py-2 text-xs text-gray-700 dark:text-gray-200">{{ reservation.endDate | date:'dd/MM/yyyy HH:mm' }}</td>
                  </tr>
                  <tr *ngIf="getEquipmentReservationsForDetails(selectedEquipmentDetails.id).length === 0">
                    <td colspan="4" class="px-3 py-3 text-center text-xs text-gray-500 dark:text-gray-400">
                      Aucune reservation liee pour cet equipement.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class EquipmentReservationsComponent implements OnInit, OnDestroy {
  currentRole: AppRole = 'EMPLOYEE';
  currentUserId = '';
  currentUserName = '';
  private readonly bookingLeadTimeMinutes = 15;
  private readonly bookingStepMinutes = 5;

  readonly roleLabels: Record<AppRole, string> = {
    ADMIN: 'Administrateur',
    EMPLOYEE: 'Employe',
    MANAGER: 'Chef hierarchique',
    ROOM_MANAGER: 'Responsable salle',
    IT_MANAGER: 'Responsable IT',
    SECURITY_MANAGER: 'Responsable securite',
    DSN_DIRECTOR: 'Directeur DSN',
    QUALITY_MANAGER: 'Responsable qualite',
  };

  equipment: Equipment[] = [];
  equipmentReservations: EquipmentReservation[] = [];
  events: Event[] = [];

  searchTerm = '';
  categoryFilter: 'all' | Equipment['category'] = 'all';
  statusFilter: EquipmentStatusFilter = 'all';
  equipmentPage = 0;
  equipmentPageSize = 10;
  equipmentTotalElements = 0;
  equipmentTotalPages = 0;
  equipmentLoading = false;
  equipmentLoadError = '';
  private equipmentPageSubscription?: Subscription;

  isModalOpen = false;
  selectedEquipmentId = '';
  selectedEventId = '';
  isEquipmentFormModalOpen = false;
  equipmentFormMode: 'create' | 'edit' = 'create';
  editingEquipmentId: string | null = null;
  equipmentFormSaving = false;
  equipmentFormError = '';
  isEquipmentDetailsModalOpen = false;
  selectedEquipmentDetails: Equipment | null = null;

  equipmentForm = {
    name: '',
    type: '',
    serialNumber: '',
    location: '',
    description: '',
    totalQuantity: 1,
    availableQuantity: 1,
    status: 'DISPONIBLE' as EquipmentBusinessStatus,
    active: true,
  };

  readonly categoryFilterOptions: Option[] = [
    { value: 'all', label: 'Toutes categories' },
    { value: 'PROJECTOR', label: 'Projecteurs' },
    { value: 'LAPTOP', label: 'Ordinateurs' },
    { value: 'CAMERA', label: 'Cameras' },
    { value: 'MICROPHONE', label: 'Microphones' },
    { value: 'SCREEN', label: 'Ecrans' },
    { value: 'OTHER', label: 'Autre' },
  ];

  readonly statusFilterOptions: Option[] = [
    { value: 'all', label: 'Tous statuts' },
    { value: 'available', label: 'Disponible' },
    { value: 'in-use', label: 'En cours' },
    { value: 'unavailable', label: 'Indisponible' },
  ];

  readonly equipmentStatusOptions: Option[] = [
    { value: 'DISPONIBLE', label: 'Disponible' },
    { value: 'OCCUPE', label: 'Occupe' },
    { value: 'MAINTENANCE', label: 'Maintenance' },
    { value: 'INACTIVE', label: 'Inactif' },
  ];

  get reservableEquipmentOptions(): Option[] {
    return this.reservableRows.map((row) => ({
      value: row.item.id,
      label: `${row.item.name} (${row.availableQty} / ${row.totalQty} dispo)`,
    }));
  }

  get eventSelectOptions(): Option[] {
    const reservationWithoutEventOption: Option = {
      value: '',
      label: 'Aucun evenement lie (reservation independante)',
    };

    const eventOptions = this.events
      .filter((event) => (event.eventMode ?? (event.onlineEvent ? 'EN_LIGNE' : 'PRESENTIEL')) !== 'EN_LIGNE')
      .map((event) => ({
        value: event.id,
        label: `${event.title} [${event.eventMode ?? (event.onlineEvent ? 'EN_LIGNE' : 'PRESENTIEL')}] (${event.startDate.toLocaleDateString('fr-FR')})`,
      }));

    return [reservationWithoutEventOption, ...eventOptions];
  }

  feedbackMessage = '';
  feedbackTone: 'success' | 'error' = 'success';
  lastCreatedReservationId = '';
  validationComment = '';
  validationInProgressId = '';
  private routeQuerySubscription?: Subscription;

  bookingForm = {
    purpose: '',
    startDate: '',
    endDate: '',
    quantityRequested: 1,
  };

  constructor(
    private reservationService: ReservationService,
    private authService: AuthService,
    private eventService: EventService,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.searchTerm = this.readRouteSearch();

    this.equipmentPageSubscription = this.reservationService.equipmentPageState$.subscribe((pageState) => {
      this.equipmentPage = pageState.page;
      this.equipmentPageSize = pageState.size;
      this.equipmentTotalElements = pageState.totalElements;
      const safeSize = pageState.size > 0 ? pageState.size : this.equipmentPageSize || 1;
      const computedPages = pageState.totalElements > 0 ? Math.ceil(pageState.totalElements / safeSize) : 0;
      this.equipmentTotalPages = Math.max(pageState.totalPages, computedPages);
    });

    this.authService.currentUser$.subscribe((user) => {
      if (!user) {
        return;
      }

      this.currentRole = user.role;
      this.currentUserId = user.id;
      this.currentUserName = `${user.firstName} ${user.lastName}`.trim();
    });

    this.routeQuerySubscription = this.route.queryParamMap.subscribe((params) => {
      const routeSearch = (params.get('search') || params.get('q') || '').trim();
      if (routeSearch === this.searchTerm) {
        return;
      }
      this.searchTerm = routeSearch;
      this.equipmentPage = 0;
      this.loadEquipment();
    });

    this.loadData();
  }

  ngOnDestroy(): void {
    this.equipmentPageSubscription?.unsubscribe();
    this.routeQuerySubscription?.unsubscribe();
  }

  loadData(): void {
    this.loadEquipment();

    this.reservationService.getEquipmentReservations({ page: 0, size: 500, sort: 'startAt,desc' }).subscribe((reservations) => {
      this.equipmentReservations = reservations;
    });

    this.eventService.getEvents().subscribe((events) => {
      this.events = events;
    });
  }

  get allRows(): EquipmentRowView[] {
    return this.equipment.map((item) => this.toRow(item));
  }

  get filteredRows(): EquipmentRowView[] {
    return this.allRows.filter((row) => {
      if (this.categoryFilter !== 'all' && row.item.category !== this.categoryFilter) {
        return false;
      }

      if (this.statusFilter === 'available' && row.status !== 'DISPONIBLE') {
        return false;
      }
      if (this.statusFilter === 'in-use' && row.status !== 'EN_COURS') {
        return false;
      }
      if (this.statusFilter === 'unavailable' && row.status !== 'INDISPONIBLE') {
        return false;
      }

      return true;
    });
  }

  get reservableRows(): EquipmentRowView[] {
    return this.allRows.filter((row) => row.status === 'DISPONIBLE' && row.availableQty > 0);
  }

  get canSubmitEquipmentBooking(): boolean {
    const hasRequiredFields = (
      this.selectedEquipmentId.length > 0 &&
      this.bookingForm.purpose.trim().length > 0 &&
      this.bookingForm.startDate.length > 0 &&
      this.bookingForm.endDate.length > 0 &&
      this.bookingForm.quantityRequested > 0
    );

    if (!hasRequiredFields) {
      return false;
    }

    const startDate = new Date(this.bookingForm.startDate);
    const endDate = new Date(this.bookingForm.endDate);
    return this.isValidBookingWindow(startDate, endDate);
  }

  get totalEquipments(): number {
    return this.allRows.reduce((accumulator, row) => accumulator + row.totalQty, 0);
  }

  get activeLoans(): number {
    return this.allRows.reduce(
      (accumulator, row) => accumulator + Math.max(row.totalQty - row.availableQty, 0),
      0,
    );
  }

  get usageRate(): number {
    if (this.totalEquipments === 0) {
      return 0;
    }

    return Math.round((this.activeLoans / this.totalEquipments) * 100);
  }

  get returnsTonight(): number {
    const today = this.formatDateShort(new Date());
    return this.allRows.filter((row) => row.expectedReturn === today).length;
  }

  get pendingEquipmentReservations(): EquipmentReservation[] {
    return this.equipmentReservations
      .filter((reservation) => reservation.status === 'PENDING')
      .sort((left, right) => left.startDate.getTime() - right.startDate.getTime());
  }

  canCreateReservations(): boolean {
    return [
      'ADMIN',
      'EMPLOYEE',
      'MANAGER',
      'ROOM_MANAGER',
      'SECURITY_MANAGER',
      'DSN_DIRECTOR',
      'QUALITY_MANAGER',
    ].includes(this.currentRole);
  }

  canManageInventory(): boolean {
    return this.currentRole === 'ADMIN' || this.currentRole === 'ROOM_MANAGER';
  }

  canValidateReservations(): boolean {
    return ['ADMIN', 'ROOM_MANAGER', 'SECURITY_MANAGER'].includes(this.currentRole);
  }

  goToRoomReservations(): void {
    this.router.navigateByUrl('/reservations/salles');
  }

  getReserveActionLabel(row: EquipmentRowView): string {
    const actionState = this.getReserveActionState(row);
    if (actionState === 'no-permission') {
      return 'Reservation indisponible (role)';
    }
    if (actionState === 'no-stock') {
      return 'Complet';
    }
    return 'Reserver';
  }

  openReservationModal(item: Equipment): void {
    const row = this.allRows.find((candidate) => candidate.item.id === item.id);
    if (!row || row.status !== 'DISPONIBLE' || row.availableQty <= 0 || !this.canCreateReservations()) {
      return;
    }

    this.selectedEquipmentId = item.id;
    this.selectedEventId = '';
    this.initializeBookingWindow();
    this.isModalOpen = true;
  }

  onReserveClick(row: EquipmentRowView): void {
    const actionState = this.getReserveActionState(row);
    if (actionState === 'no-permission') {
      this.showFeedback('Votre role ne permet pas de reserver des equipements.', 'error');
      return;
    }

    if (actionState === 'no-stock') {
      this.showFeedback('Cet equipement est actuellement indisponible.', 'error');
      return;
    }

    this.openReservationModal(row.item);
  }

  openNewReservationModal(): void {
    if (!this.canCreateReservations()) {
      return;
    }

    const firstRow = this.reservableRows[0];
    this.selectedEquipmentId = firstRow ? firstRow.item.id : '';
    this.selectedEventId = '';
    this.initializeBookingWindow();
    this.isModalOpen = true;
  }

  openCreateEquipmentModal(): void {
    if (!this.canManageInventory()) {
      return;
    }

    this.equipmentFormMode = 'create';
    this.editingEquipmentId = null;
    this.equipmentFormError = '';
    this.equipmentForm = {
      name: '',
      type: '',
      serialNumber: '',
      location: '',
      description: '',
      totalQuantity: 1,
      availableQuantity: 1,
      status: 'DISPONIBLE',
      active: true,
    };
    this.isEquipmentFormModalOpen = true;
  }

  openEditEquipmentModal(equipment: Equipment): void {
    if (!this.canManageInventory()) {
      return;
    }

    this.equipmentFormMode = 'edit';
    this.editingEquipmentId = equipment.id;
    this.equipmentFormError = '';
    this.equipmentForm = {
      name: equipment.name,
      type: equipment.type || this.getCategoryLabel(equipment.category),
      serialNumber: equipment.serialNumber,
      location: equipment.location,
      description: equipment.description || '',
      totalQuantity: equipment.totalQuantity ?? 1,
      availableQuantity: equipment.availableQuantity ?? (equipment.totalQuantity ?? 1),
      status: this.toBusinessEquipmentStatus(equipment.status),
      active: equipment.isActive ?? equipment.status !== 'RETIRED',
    };
    this.isEquipmentFormModalOpen = true;
  }

  closeEquipmentFormModal(): void {
    this.isEquipmentFormModalOpen = false;
    this.equipmentFormSaving = false;
  }

  saveEquipment(): void {
    if (!this.canManageInventory()) {
      return;
    }

    const name = this.equipmentForm.name.trim();
    const type = this.equipmentForm.type.trim();
    const serialNumber = this.equipmentForm.serialNumber.trim();
    const location = this.equipmentForm.location.trim();
    const description = this.equipmentForm.description.trim();
    const totalQuantity = Number(this.equipmentForm.totalQuantity);
    const availableQuantity = Number(this.equipmentForm.availableQuantity);

    if (!name || !type || !serialNumber || !Number.isFinite(totalQuantity) || totalQuantity < 1) {
      this.equipmentFormError = 'Nom, type, numero de serie et quantite totale valide sont obligatoires.';
      return;
    }
    if (!Number.isFinite(availableQuantity) || availableQuantity < 0 || availableQuantity > totalQuantity) {
      this.equipmentFormError = 'La quantite disponible doit etre comprise entre 0 et la quantite totale.';
      return;
    }

    this.equipmentFormSaving = true;
    this.equipmentFormError = '';

    const payload: Omit<Equipment, 'id' | 'createdAt'> = {
      name,
      description,
      category: this.inferCategoryFromType(type),
      type,
      serialNumber,
      status: this.toFrontendEquipmentStatus(this.equipmentForm.status),
      totalQuantity,
      availableQuantity,
      isActive: this.equipmentForm.status !== 'INACTIVE' && this.equipmentForm.active,
      location,
    };

    const request$ = this.equipmentFormMode === 'create'
      ? this.reservationService.addEquipment(payload)
      : this.reservationService.updateEquipment(this.editingEquipmentId!, payload);

    request$.subscribe({
      next: () => {
        this.showFeedback(
          this.equipmentFormMode === 'create' ? 'Equipement cree avec succes.' : 'Equipement mis a jour avec succes.',
          'success',
        );
        this.closeEquipmentFormModal();
        this.loadData();
      },
      error: (error) => {
        this.equipmentFormSaving = false;
        this.equipmentFormError = this.readBackendError(error, 'Impossible d enregistrer l equipement.');
      },
    });
  }

  openEquipmentDetails(equipment: Equipment): void {
    this.selectedEquipmentDetails = equipment;
    this.isEquipmentDetailsModalOpen = true;
  }

  closeEquipmentDetailsModal(): void {
    this.isEquipmentDetailsModalOpen = false;
    this.selectedEquipmentDetails = null;
  }

  getEquipmentReservationsForDetails(equipmentId: string): EquipmentReservation[] {
    return this.equipmentReservations
      .filter((reservation) => reservation.equipmentId === equipmentId)
      .sort((left, right) => right.startDate.getTime() - left.startDate.getTime());
  }

  setEquipmentBusinessStatus(equipment: Equipment, status: EquipmentBusinessStatus): void {
    if (!this.canManageInventory()) {
      return;
    }

    const payload: Partial<Equipment> = {
      status: this.toFrontendEquipmentStatus(status),
      isActive: status !== 'INACTIVE',
    };

    this.reservationService.updateEquipment(equipment.id, payload).subscribe({
      next: () => {
        this.showFeedback('Statut equipement mis a jour.', 'success');
        this.loadData();
      },
      error: (error) => {
        this.showFeedback(this.readBackendError(error, 'Mise a jour du statut equipement impossible.'), 'error');
      },
    });
  }

  toggleEquipmentActive(equipment: Equipment): void {
    const status: EquipmentBusinessStatus = equipment.status === 'RETIRED' ? 'DISPONIBLE' : 'INACTIVE';
    this.setEquipmentBusinessStatus(equipment, status);
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.categoryFilter = 'all';
    this.statusFilter = 'all';
    this.equipmentPage = 0;
    this.loadEquipment();
  }

  closeModal(): void {
    this.isModalOpen = false;
  }

  reserveEquipment(): void {
    if (!this.canSubmitEquipmentBooking) {
      return;
    }

    const selectedItem = this.equipment.find((item) => item.id === this.selectedEquipmentId);
    if (!selectedItem) {
      this.showFeedback('Veuillez selectionner un equipement valide.', 'error');
      return;
    }

    const startDate = new Date(this.bookingForm.startDate);
    const endDate = new Date(this.bookingForm.endDate);

    const bookingWindowError = this.getBookingWindowValidationError(startDate, endDate);
    if (bookingWindowError) {
      this.showFeedback(bookingWindowError, 'error');
      return;
    }

    this.reservationService
      .reserveEquipment({
        eventId: this.selectedEventId || undefined,
        equipmentId: selectedItem.id,
        equipmentName: selectedItem.name,
        userId: this.currentUserId,
        userName: this.currentUserName,
        purpose: this.bookingForm.purpose.trim(),
        startDate,
        endDate,
        quantityRequested: this.bookingForm.quantityRequested,
      })
      .subscribe({
        next: (result) => {
        if (!result) {
          this.lastCreatedReservationId = '';
          this.showFeedback('Quantite insuffisante pour cet equipement sur ce creneau.', 'error');
          return;
        }

        this.lastCreatedReservationId = result.id;
        this.showFeedback('Reservation equipement enregistree.', 'success');
        this.loadData();
        this.closeModal();
      },
        error: (error) => {
          this.showFeedback(this.readBackendError(error, 'Erreur serveur lors de la reservation. Reessayez.'), 'error');
      },
    });
  }

  downloadLatestReservationPdf(): void {
    if (!this.lastCreatedReservationId) {
      return;
    }

    this.reservationService.downloadLatestOfficialDocument(this.lastCreatedReservationId).subscribe({
      next: () => {
        this.showFeedback('PDF officiel de reservation telecharge.', 'success');
      },
      error: () => {
        this.showFeedback('Aucun PDF officiel disponible pour cette reservation.', 'error');
      },
    });
  }

  validateEquipmentReservation(reservation: EquipmentReservation, approved: boolean): void {
    if (!this.canValidateReservations()) {
      this.showFeedback('Votre role ne permet pas de valider ces reservations.', 'error');
      return;
    }

    if (!approved && this.validationComment.trim().length === 0) {
      this.showFeedback('Le motif de refus est obligatoire.', 'error');
      return;
    }

    this.validationInProgressId = reservation.id;

    const request$ = approved
      ? this.reservationService.approveEquipmentReservation(reservation.id, this.currentUserName)
      : this.reservationService.rejectEquipmentReservation(reservation.id, this.currentUserName, this.validationComment.trim());

    request$.subscribe({
      next: (updated) => {
        this.validationInProgressId = '';
        if (!updated) {
          this.showFeedback('La reservation n a pas pu etre mise a jour.', 'error');
          return;
        }

        this.showFeedback(
          approved ? 'Reservation equipement validee.' : 'Reservation equipement refusee.',
          'success',
        );
        this.loadData();
      },
      error: (error) => {
        this.validationInProgressId = '';
        this.showFeedback(this.readBackendError(error, 'Validation de la reservation impossible.'), 'error');
      },
    });
  }

  getReserveActionState(row: EquipmentRowView): ReserveActionState {
    if (!this.canCreateReservations()) {
      return 'no-permission';
    }

    if (row.status !== 'DISPONIBLE' || row.availableQty <= 0) {
      return 'no-stock';
    }

    return 'ready';
  }

  getCategoryLabel(category: Equipment['category']): string {
    if (category === 'LAPTOP' || category === 'SCREEN') {
      return 'Informatique';
    }
    if (category === 'OTHER') {
      return 'Autre';
    }

    return 'Audiovisuel';
  }

  getCategoryBadgeClass(category: Equipment['category']): string {
    if (category === 'LAPTOP' || category === 'SCREEN') {
      return 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300';
    }
    if (category === 'OTHER') {
      return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
    }

    return 'bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300';
  }

  getStatusLabel(status: EquipmentVisualStatus): string {
    if (status === 'DISPONIBLE') {
      return 'Disponible';
    }
    if (status === 'EN_COURS') {
      return 'En cours';
    }

    return 'Indisponible';
  }

  getStatusBadgeClass(status: EquipmentVisualStatus): string {
    if (status === 'DISPONIBLE') {
      return 'bg-success-50 text-success-700 dark:bg-success-500/20 dark:text-success-300';
    }
    if (status === 'EN_COURS') {
      return 'bg-warning-50 text-warning-700 dark:bg-warning-500/20 dark:text-warning-300';
    }

    return 'bg-error-50 text-error-700 dark:bg-error-500/20 dark:text-error-300';
  }

  private toBusinessEquipmentStatus(status: Equipment['status']): EquipmentBusinessStatus {
    if (status === 'MAINTENANCE') {
      return 'MAINTENANCE';
    }
    if (status === 'RETIRED') {
      return 'INACTIVE';
    }
    if (status === 'IN_USE') {
      return 'OCCUPE';
    }
    return 'DISPONIBLE';
  }

  private toFrontendEquipmentStatus(status: EquipmentBusinessStatus): Equipment['status'] {
    if (status === 'MAINTENANCE') {
      return 'MAINTENANCE';
    }
    if (status === 'INACTIVE') {
      return 'RETIRED';
    }
    if (status === 'OCCUPE') {
      return 'IN_USE';
    }
    return 'AVAILABLE';
  }

  private inferCategoryFromType(type: string): Equipment['category'] {
    const normalized = type.toLowerCase();
    if (normalized.includes('project')) {
      return 'PROJECTOR';
    }
    if (normalized.includes('laptop') || normalized.includes('ordi')) {
      return 'LAPTOP';
    }
    if (normalized.includes('camera') || normalized.includes('cam')) {
      return 'CAMERA';
    }
    if (normalized.includes('micro')) {
      return 'MICROPHONE';
    }
    if (normalized.includes('ecran') || normalized.includes('screen')) {
      return 'SCREEN';
    }
    return 'OTHER';
  }

  private toRow(item: Equipment): EquipmentRowView {
    const totalQty = Math.max(1, item.totalQuantity ?? 1);
    const activeReservations = this.getActiveReservations(item.id);
    const reservedQty = activeReservations.reduce((accumulator, reservation) => (
      accumulator + Math.max(reservation.quantityRequested || 1, 1)
    ), 0);
    const declaredAvailable = item.availableQuantity != null
      ? Math.max(0, Math.min(item.availableQuantity, totalQty))
      : totalQty;

    const blockedByStatus = item.status === 'MAINTENANCE' || item.status === 'RETIRED';
    const availableQty = blockedByStatus ? 0 : Math.max(0, declaredAvailable - reservedQty);

    const status = this.resolveStatus(item, availableQty, totalQty);

    const reservedBy = activeReservations.length > 0
      ? this.unique(activeReservations.map((reservation) => reservation.userName)).join(', ')
      : '--';

    const expectedReturn = this.getExpectedReturn(activeReservations);

    return {
      item,
      availableQty,
      totalQty,
      status,
      reservedBy,
      expectedReturn,
    };
  }

  private resolveStatus(
    item: Equipment,
    availableQty: number,
    totalQty: number,
  ): EquipmentVisualStatus {
    if (item.status === 'MAINTENANCE' || item.status === 'RETIRED') {
      return 'INDISPONIBLE';
    }

    if (availableQty === totalQty) {
      return 'DISPONIBLE';
    }

    return 'EN_COURS';
  }

  private getActiveReservations(equipmentId: string): EquipmentReservation[] {
    return this.equipmentReservations.filter((reservation) => {
      if (reservation.equipmentId !== equipmentId) {
        return false;
      }

      return reservation.status === 'PENDING' || reservation.status === 'APPROVED' || reservation.status === 'IN_USE';
    });
  }

  private getExpectedReturn(activeReservations: EquipmentReservation[]): string {
    if (activeReservations.length === 0) {
      return '--';
    }

    const nearestReturn = activeReservations
      .map((reservation) => reservation.endDate instanceof Date ? reservation.endDate : new Date(reservation.endDate))
      .sort((left, right) => left.getTime() - right.getTime())[0];

    return this.formatDateShort(nearestReturn);
  }

  private initializeBookingWindow(): void {
    const defaultStart = this.buildDefaultStartDate();
    const tomorrow = new Date(defaultStart.getTime() + 24 * 60 * 60 * 1000);

      this.bookingForm = {
      purpose: '',
      startDate: this.toDateTimeLocal(defaultStart),
      endDate: this.toDateTimeLocal(tomorrow),
      quantityRequested: 1,
    };
  }

  private buildDefaultStartDate(): Date {
    const start = new Date(Date.now() + this.bookingLeadTimeMinutes * 60 * 1000);
    start.setSeconds(0, 0);

    const currentMinute = start.getMinutes();
    const roundedMinute = Math.ceil(currentMinute / this.bookingStepMinutes) * this.bookingStepMinutes;
    if (roundedMinute >= 60) {
      start.setHours(start.getHours() + 1, 0, 0, 0);
      return start;
    }

    start.setMinutes(roundedMinute, 0, 0);
    return start;
  }

  private isValidBookingWindow(startDate: Date, endDate: Date): boolean {
    return this.getBookingWindowValidationError(startDate, endDate) === null;
  }

  private getBookingWindowValidationError(startDate: Date, endDate: Date): string | null {
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return 'La plage horaire est invalide.';
    }

    if (startDate <= new Date()) {
      return 'La date de debut doit etre dans le futur.';
    }

    if (startDate >= endDate) {
      return 'La date de fin doit etre apres la date de debut.';
    }

    return null;
  }

  private showFeedback(message: string, tone: 'success' | 'error'): void {
    this.feedbackMessage = tone === 'error' ? this.sanitizeFeedbackMessage(message) : message;
    this.feedbackTone = tone;
  }

  private formatDateShort(date: Date): string {
    const months = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aou', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${date.getDate()} ${months[date.getMonth()]}`;
  }

  private toDateTimeLocal(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  private unique(values: string[]): string[] {
    return Array.from(new Set(values.filter((value) => value.trim().length > 0)));
  }

  private readBackendError(error: unknown, fallback: string): string {
    const payload = (error as { error?: unknown })?.error;
    if (typeof payload === 'string' && payload.trim().length > 0) {
      return this.sanitizeFeedbackMessage(payload);
    }

    const detail = (payload as { detail?: unknown })?.detail;
    if (typeof detail === 'string' && detail.trim().length > 0) {
      return this.sanitizeFeedbackMessage(detail);
    }

    const message = (error as { message?: unknown })?.message;
    if (typeof message === 'string' && message.trim().length > 0) {
      return this.sanitizeFeedbackMessage(message);
    }

    return this.sanitizeFeedbackMessage(fallback);
  }

  private sanitizeFeedbackMessage(message: string): string {
    const trimmed = message.trim();
    if (!trimmed) {
      return '';
    }

    const normalized = trimmed.toLowerCase();
    if (
      normalized.includes('future.startat') ||
      normalized.includes('must be a future date') ||
      normalized.includes('field error in object') ||
      normalized.includes('validation failed for argument')
    ) {
      return 'La date de debut doit etre dans le futur.';
    }

    if (trimmed.length > 260) {
      return 'Erreur serveur lors de la reservation. Reessayez.';
    }

    return trimmed;
  }

  applyFilters(): void {
    this.equipmentPage = 0;
    this.loadEquipment();
  }

  nextEquipmentPage(): void {
    if (this.equipmentPage + 1 >= this.equipmentTotalPages) {
      return;
    }
    this.equipmentPage += 1;
    this.loadEquipment();
  }

  previousEquipmentPage(): void {
    if (this.equipmentPage <= 0) {
      return;
    }
    this.equipmentPage -= 1;
    this.loadEquipment();
  }

  goToEquipmentPage(page: number): void {
    if (page < 0 || page >= this.equipmentTotalPages || page === this.equipmentPage) {
      return;
    }
    this.equipmentPage = page;
    this.loadEquipment();
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

  private loadEquipment(): void {
    this.equipmentLoading = true;
    this.reservationService.getEquipment({
      page: this.equipmentPage,
      size: this.equipmentPageSize,
      sort: 'name,asc',
      search: this.searchTerm.trim() || undefined,
      active: undefined,
    }).subscribe({
      next: (equipment) => {
        this.equipment = equipment;
        this.equipmentLoadError = '';
        this.equipmentLoading = false;
      },
      error: (error) => {
        this.equipment = [];
        this.equipmentLoading = false;
        this.equipmentLoadError = this.readBackendError(error, 'Chargement des equipements impossible. Verifiez vos droits puis reessayez.');
      }
    });
  }

  private readRouteSearch(): string {
    return (this.route.snapshot.queryParamMap.get('search') || this.route.snapshot.queryParamMap.get('q') || '').trim();
  }
}
