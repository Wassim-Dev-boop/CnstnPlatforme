import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AppRole, Event, Room, RoomReservation } from '../../../core/models';
import { AuthService } from '../../../core/services/auth.service';
import { EventService } from '../../../core/services/event.service';
import { ReservationService } from '../../../core/services/reservation.service';
import { Option, SelectComponent } from '../../../shared/components/form/select/select.component';

type RoomVisualStatus = 'LIBRE' | 'OCCUPEE' | 'MAINTENANCE';
type RoomStatusFilter = 'all' | 'available' | 'occupied' | 'maintenance';
type CapacityFilter = 'all' | 'small' | 'medium' | 'large';
type RoomBusinessStatus = 'DISPONIBLE' | 'OCCUPEE' | 'MAINTENANCE' | 'INACTIVE';

@Component({
  selector: 'app-room-reservations',
  standalone: true,
  imports: [CommonModule, FormsModule, SelectComponent],
  template: `
    <div class="space-y-6">
      <div class="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 class="mb-1 text-2xl font-bold text-gray-900 dark:text-white/90 lg:text-3xl">Reservations des salles</h1>
            <p class="max-w-2xl text-sm text-gray-600 dark:text-gray-400">
              Pilotage des disponibilites, suivi d occupation et gestion rapide des demandes de reservation.
            </p>
            <div class="mt-3 flex flex-wrap items-center gap-2">
              <span class="inline-flex rounded-full bg-brand-500/10 px-3 py-1 text-xs font-semibold text-brand-700 dark:text-brand-300">
                {{ roleLabels[currentRole] }}
              </span>
              <span class="inline-flex rounded-full bg-success-500/10 px-3 py-1 text-xs font-semibold text-success-700 dark:text-success-300">
                Gestion salles active
              </span>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <button
              *ngIf="canManageInventory()"
              type="button"
              data-testid="rooms-create-button-header"
              (click)="openCreateRoomModal()"
              class="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-brand-300 px-4 text-sm font-semibold text-brand-700 transition hover:bg-brand-50 dark:border-brand-500/50 dark:text-brand-300 dark:hover:bg-brand-500/10"
            >
              <span class="text-lg leading-none">+</span>
              Nouvelle salle
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
            class="h-9 rounded-lg bg-white px-4 text-sm font-semibold text-brand-700 shadow-theme-xs dark:bg-white/[0.03] dark:text-brand-300"
          >
            Salles
          </button>
          <button
            type="button"
            (click)="goToEquipmentManagement()"
            class="h-9 rounded-lg px-4 text-sm font-semibold text-gray-600 transition hover:bg-white hover:text-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.03] dark:hover:text-white/90"
          >
            Equipements logistiques
          </button>
        </div>

        <div class="mt-5 grid grid-cols-1 gap-3 md:grid-cols-4">
          <article class="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
            <p class="text-3xl font-semibold text-gray-900 dark:text-white/90">{{ totalRooms }}</p>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Salles total</p>
          </article>

          <article class="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
            <p class="text-3xl font-semibold text-success-600 dark:text-success-300">{{ availableRoomsCount }}</p>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Disponibles</p>
          </article>

          <article class="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
            <p class="text-3xl font-semibold text-error-600 dark:text-error-300">{{ occupiedRoomsCount }}</p>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Occupees</p>
          </article>

          <article class="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
            <p class="text-3xl font-semibold text-warning-600 dark:text-warning-300">{{ maintenanceRoomsCount }}</p>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Maintenance</p>
          </article>
        </div>

        <div class="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_220px_220px_auto_auto] lg:items-center">
          <input
            type="text"
            [(ngModel)]="searchTerm"
            placeholder="Rechercher une salle..."
            class="h-11 w-full rounded-xl border border-gray-300 bg-transparent px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
          />

          <app-select
            [(ngModel)]="statusFilter"
            [options]="statusFilterOptions"
            placeholder="Toutes"
          ></app-select>

          <app-select
            [(ngModel)]="capacityFilter"
            [options]="capacityFilterOptions"
            placeholder="Capacite"
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

        <div
          *ngIf="canManageInventory()"
          class="mt-5 rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900"
        >
          <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 class="text-base font-semibold text-gray-900 dark:text-white/90">Espace Responsable salle</h2>
              <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Gestion metier complete: salles, disponibilites, equipements et verification de chevauchement.
              </p>
            </div>
            <button
              type="button"
              (click)="goToEquipmentManagement()"
              class="inline-flex h-10 items-center justify-center rounded-xl border border-brand-300 px-4 text-sm font-semibold text-brand-700 transition hover:bg-brand-50 dark:border-brand-500/50 dark:text-brand-300 dark:hover:bg-brand-500/10"
            >
              Gerer les equipements
            </button>
          </div>

          <div class="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-2">
            <article class="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-white/[0.03]">
              <h3 class="text-sm font-semibold text-gray-900 dark:text-white/90">CRUD salles</h3>
              <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Ajouter, modifier, desactiver ou archiver une salle avec historique preserve.
              </p>
              <div class="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  data-testid="rooms-create-button-crud-card"
                  (click)="openCreateRoomModal()"
                  class="h-10 rounded-lg border border-brand-300 px-3 text-xs font-semibold text-brand-700 hover:bg-brand-50 dark:border-brand-500/50 dark:text-brand-300 dark:hover:bg-brand-500/10"
                >
                  + Nouvelle salle
                </button>
                <button
                  type="button"
                  (click)="focusRoomInventory()"
                  class="h-10 rounded-lg border border-gray-300 px-3 text-xs font-semibold text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
                >
                  Voir disponibilite
                </button>
              </div>
            </article>

            <article class="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-white/[0.03]">
              <h3 class="text-sm font-semibold text-gray-900 dark:text-white/90">Verifier chevauchement</h3>
              <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Controle en temps reel des conflits de reservation avant enregistrement.
              </p>
              <div class="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                <app-select
                  [(ngModel)]="overlapCheck.roomId"
                  [options]="roomManagerRoomOptions"
                  placeholder="Salle"
                ></app-select>
                <input
                  type="datetime-local"
                  [(ngModel)]="overlapCheck.startDate"
                  class="h-10 rounded-lg border border-gray-300 bg-transparent px-3 text-xs text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                />
                <input
                  type="datetime-local"
                  [(ngModel)]="overlapCheck.endDate"
                  class="h-10 rounded-lg border border-gray-300 bg-transparent px-3 text-xs text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                />
              </div>
              <div class="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  (click)="runOverlapCheck()"
                  [disabled]="isCheckingOverlap"
                  class="h-10 rounded-lg bg-brand-500 px-4 text-xs font-semibold text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {{ isCheckingOverlap ? 'Verification...' : 'Verifier le creneau' }}
                </button>
                <p
                  *ngIf="overlapCheckMessage"
                  class="text-xs font-semibold"
                  [ngClass]="overlapCheckTone === 'success'
                    ? 'text-success-700 dark:text-success-300'
                    : overlapCheckTone === 'error'
                      ? 'text-error-700 dark:text-error-300'
                      : 'text-gray-600 dark:text-gray-300'"
                >
                  {{ overlapCheckMessage }}
                </p>
              </div>
            </article>
          </div>
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
              Validez ou refusez les demandes en attente depuis cet espace.
            </p>
          </div>
          <span class="inline-flex rounded-full bg-white px-3 py-1 text-xs font-semibold text-brand-700 shadow-sm dark:bg-white/[0.08] dark:text-brand-300">
            {{ pendingRoomReservations.length }} en attente
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
          *ngIf="pendingRoomReservations.length === 0"
          class="mt-4 rounded-xl border border-dashed border-brand-200 bg-white px-4 py-6 text-center text-sm text-gray-600 dark:border-brand-500/30 dark:bg-white/[0.03] dark:text-gray-300"
        >
          Aucune reservation en attente de validation.
        </div>

        <div *ngIf="pendingRoomReservations.length > 0" class="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-2">
          <article
            *ngFor="let reservation of pendingRoomReservations"
            class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]"
          >
            <div class="flex items-start justify-between gap-3">
              <div>
                <h3 class="text-base font-semibold text-gray-900 dark:text-white/90">{{ reservation.roomName }}</h3>
                <p class="text-sm text-gray-600 dark:text-gray-400">{{ reservation.userName }}</p>
              </div>
              <span class="inline-flex rounded-full bg-warning-50 px-3 py-1 text-xs font-semibold text-warning-700 dark:bg-warning-500/20 dark:text-warning-300">
                En attente
              </span>
            </div>

            <div class="mt-3 space-y-1 text-sm text-gray-600 dark:text-gray-300">
              <p><span class="font-medium text-gray-900 dark:text-white/90">Reference :</span> {{ reservation.referenceCode || reservation.id }}</p>
              <p><span class="font-medium text-gray-900 dark:text-white/90">Creneau :</span> {{ reservation.startDate | date:'dd/MM/yyyy HH:mm' }} → {{ reservation.endDate | date:'dd/MM/yyyy HH:mm' }}</p>
              <p><span class="font-medium text-gray-900 dark:text-white/90">Objet :</span> {{ reservation.title || reservation.purpose || 'Reservation salle' }}</p>
              <p *ngIf="reservation.eventId"><span class="font-medium text-gray-900 dark:text-white/90">Evenement :</span> {{ reservation.eventId }}</p>
            </div>

            <div class="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                (click)="validateRoomReservation(reservation, true)"
                [disabled]="!!validationInProgressId"
                class="h-10 rounded-lg bg-success-500 px-4 text-xs font-semibold text-white transition hover:bg-success-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Valider
              </button>
              <button
                type="button"
                (click)="validateRoomReservation(reservation, false)"
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
        *ngIf="roomsLoading"
        class="rounded-2xl border border-gray-200 bg-white px-6 py-8 text-center text-sm text-gray-500 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-300"
      >
        Chargement des salles...
      </div>

      <div
        *ngIf="!roomsLoading && roomsLoadError"
        class="rounded-2xl border border-error-200 bg-error-50 px-6 py-4 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-300"
      >
        {{ roomsLoadError }}
      </div>

      <div id="rooms-inventory-grid" class="grid max-h-[68vh] grid-cols-1 gap-4 overflow-y-auto pr-1 md:grid-cols-2 xl:grid-cols-3">
        <article
          *ngFor="let room of filteredRooms"
          class="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]"
        >
          <div class="mb-3 flex items-start justify-between gap-3">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white/90">{{ room.name }}</h3>
            <span
              class="inline-flex rounded-full px-3 py-1 text-xs font-semibold"
              [ngClass]="getStatusBadgeClass(getRoomStatus(room))"
            >
              {{ getStatusLabel(getRoomStatus(room)) }}
            </span>
          </div>

          <p class="mb-3 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="text-gray-400">
              <path d="M8 11C8 8.79086 9.79086 7 12 7C14.2091 7 16 8.79086 16 11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>
              <path d="M5 17C5 14.7909 6.79086 13 9 13H15C17.2091 13 19 14.7909 19 17" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>
            </svg>
            {{ room.capacity }} personnes
          </p>

          <div class="mb-4">
            <div class="mb-2 flex items-center justify-between text-sm">
              <span class="text-gray-600 dark:text-gray-300">Taux occupation : {{ getRoomOccupancy(room) }}%</span>
            </div>
            <div class="h-2.5 rounded-full bg-gray-200 dark:bg-gray-800">
              <div
                class="h-2.5 rounded-full"
                [ngClass]="getOccupancyBarClass(getRoomStatus(room))"
                [style.width.%]="getRoomOccupancy(room)"
              ></div>
            </div>
          </div>

          <div *ngIf="hasAmenities(room)" class="mb-4 flex flex-wrap gap-2">
            <span
              *ngFor="let amenity of room.amenities"
              class="inline-flex rounded-full border border-gray-200 bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
            >
              {{ amenity }}
            </span>
          </div>
          <p *ngIf="!hasAmenities(room)" class="mb-4 text-xs text-gray-500 dark:text-gray-400">
            Aucun equipement logistique renseigne.
          </p>

          <div class="mb-4 overflow-hidden rounded-lg border border-gray-200 bg-gray-50 text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
            <div *ngIf="room.imageUrl; else noRoomImage" class="relative h-32 bg-gray-950">
              <img
                [src]="room.imageUrl"
                [alt]="'Image 3D ' + room.name"
                class="h-full w-full object-cover"
              />
              <div class="absolute inset-x-0 bottom-0 bg-gray-950/70 px-3 py-2 text-white">
                <div class="flex items-center justify-between gap-2">
                  <span>Image 3D</span>
                  <span class="font-semibold">{{ getBusinessRoomStatusLabel(room) }}</span>
                </div>
                <div class="mt-1 truncate text-white/80">Prochaine reservation: {{ getNextRoomReservationLabel(room.id) }}</div>
              </div>
            </div>
            <ng-template #noRoomImage>
              <div class="px-3 py-2">
                <div class="flex items-center justify-between gap-2">
                  <span>Image 3D</span>
                  <span class="font-semibold">{{ getBusinessRoomStatusLabel(room) }}</span>
                </div>
                <div class="mt-1 text-gray-500 dark:text-gray-400">Aucune image 3D importee.</div>
                <div class="mt-1 text-gray-500 dark:text-gray-400">Prochaine reservation: {{ getNextRoomReservationLabel(room.id) }}</div>
              </div>
            </ng-template>
          </div>

          <div class="mb-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              (click)="openReservationModal(room)"
              [disabled]="isRoomReservationDisabled(room)"
              class="h-10 rounded-lg border border-gray-300 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700"
              [ngClass]="
                !isRoomReservationDisabled(room)
                  ? 'text-gray-800 hover:bg-gray-100 dark:text-white/90 dark:hover:bg-white/[0.03]'
                  : 'text-gray-500 dark:text-gray-400'
              "
            >
              {{ getRoomReservationActionLabel(room) }}
            </button>
            <button
              type="button"
              (click)="openRoomPlanning(room)"
              class="h-10 rounded-lg border border-gray-300 text-xs font-semibold text-gray-700 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
            >
              Voir planning
            </button>
          </div>

          <div *ngIf="canManageInventory()" class="mb-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              (click)="openRoomDetails(room)"
              class="h-10 rounded-lg border border-gray-300 text-xs font-semibold text-gray-700 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
            >
              Details
            </button>
            <button
              type="button"
              (click)="openEditRoomModal(room)"
              class="h-10 rounded-lg border border-gray-300 text-xs font-semibold text-gray-700 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
            >
              Modifier
            </button>
            <button
              type="button"
              (click)="setRoomBusinessStatus(room, 'MAINTENANCE')"
              [disabled]="room.status === 'MAINTENANCE'"
              class="h-10 rounded-lg border border-warning-300 text-xs font-semibold text-warning-700 transition hover:bg-warning-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-warning-500/50 dark:text-warning-300 dark:hover:bg-warning-500/10"
            >
              Maintenance
            </button>
            <button
              type="button"
              (click)="toggleRoomActive(room)"
              class="h-10 rounded-lg border border-brand-300 text-xs font-semibold text-brand-700 transition hover:bg-brand-50 dark:border-brand-500/50 dark:text-brand-300 dark:hover:bg-brand-500/10"
            >
              {{ room.isActive ? 'Desactiver' : 'Reactiver' }}
            </button>
            <button
              type="button"
              (click)="openArchiveRoomModal(room)"
              class="h-10 rounded-lg border border-error-300 text-xs font-semibold text-error-700 transition hover:bg-error-50 dark:border-error-500/50 dark:text-error-300 dark:hover:bg-error-500/10"
              >
                Supprimer (archiver)
              </button>
          </div>
        </article>
      </div>

      <div
        *ngIf="!roomsLoading && filteredRooms.length === 0 && !roomsLoadError"
        class="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-white/[0.03] dark:text-gray-400"
      >
        Aucune salle ne correspond aux filtres appliques.
      </div>

      <div
        *ngIf="!roomsLoading && roomsTotalElements > 0"
        class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-white/[0.03]"
      >
        <p class="text-sm text-gray-600 dark:text-gray-300">
          Affichage {{ getPaginationStart(roomsPage, roomsPageSize, roomsTotalElements) }}-{{ getPaginationEnd(roomsPage, roomsPageSize, roomsTotalElements) }} sur {{ roomsTotalElements }} éléments
        </p>
        <div class="flex items-center gap-2">
          <button
            type="button"
            (click)="previousRoomsPage()"
            [disabled]="roomsPage === 0"
            class="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300"
          >
            Precedent
          </button>
          <button
            *ngFor="let page of getVisiblePages(roomsPage, roomsTotalPages)"
            type="button"
            (click)="goToRoomsPage(page)"
            class="rounded-lg border px-3 py-2 text-sm font-semibold transition dark:border-gray-700"
            [ngClass]="page === roomsPage
              ? 'border-brand-500 bg-brand-500 text-white'
              : 'border-gray-300 text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/[0.03]'"
          >
            {{ page + 1 }}
          </button>
          <button
            type="button"
            (click)="nextRoomsPage()"
            [disabled]="roomsPage + 1 >= roomsTotalPages"
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
              <h2 class="text-xl font-semibold text-gray-900 dark:text-white/90">Nouvelle reservation de salle</h2>
              <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">Selectionnez une salle puis renseignez la demande.</p>
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
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Salle</label>
              <app-select
                [(ngModel)]="selectedRoomId"
                [options]="reservableRoomOptions"
                placeholder="Choisir une salle"
              ></app-select>
            </div>

            <div class="sm:col-span-2">
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Titre</label>
              <input
                type="text"
                [(ngModel)]="roomBooking.title"
                placeholder="Ex: Reunion hebdomadaire"
                class="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              />
            </div>

            <div class="sm:col-span-2">
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Motif</label>
              <textarea
                rows="3"
                [(ngModel)]="roomBooking.purpose"
                class="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              ></textarea>
            </div>

            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Debut</label>
              <input
                type="datetime-local"
                [(ngModel)]="roomBooking.startDate"
                class="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              />
            </div>

            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Fin</label>
              <input
                type="datetime-local"
                [(ngModel)]="roomBooking.endDate"
                class="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              />
            </div>

            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Participants</label>
              <input
                type="number"
                min="1"
                [(ngModel)]="roomBooking.attendeeCount"
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
                (click)="bookRoom()"
                [disabled]="!canSubmitRoomBooking"
                class="h-11 rounded-lg bg-brand-500 px-4 text-sm font-semibold text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Confirmer la reservation
              </button>
            </div>
          </div>
        </div>
      </div>

      <div
        *ngIf="isRoomFormModalOpen"
        class="fixed inset-0 z-[110100] flex items-center justify-center bg-gray-950/60 p-4"
      >
        <div class="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900 sm:p-6">
          <div class="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 class="text-xl font-semibold text-gray-900 dark:text-white/90">
                {{ roomFormMode === 'create' ? 'Nouvelle salle' : 'Modifier salle' }}
              </h2>
              <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">Gestion metier responsable salle</p>
            </div>
            <button
              type="button"
              (click)="closeRoomFormModal()"
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
                [(ngModel)]="roomForm.name"
                class="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              />
            </div>
            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Image 3D de la salle</label>
              <label class="flex h-11 cursor-pointer items-center justify-center rounded-lg border border-dashed border-brand-300 px-4 text-sm font-semibold text-brand-700 transition hover:bg-brand-50 dark:border-brand-500/50 dark:text-brand-300 dark:hover:bg-brand-500/10">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  class="hidden"
                  (change)="onRoomImageSelected($event)"
                />
                Choisir une image
              </label>
              <div *ngIf="roomForm.imageUrl" class="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-2 dark:border-gray-700 dark:bg-gray-900">
                <img [src]="roomForm.imageUrl" alt="Apercu image 3D salle" class="h-28 w-full rounded-md object-cover" />
                <button
                  type="button"
                  (click)="removeRoomImage()"
                  class="mt-2 text-xs font-semibold text-error-600 hover:text-error-700 dark:text-error-300"
                >
                  Supprimer l'image
                </button>
              </div>
            </div>
            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Capacite</label>
              <input
                type="number"
                min="1"
                [(ngModel)]="roomForm.capacity"
                class="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              />
            </div>
            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Statut</label>
              <app-select
                [(ngModel)]="roomForm.status"
                [options]="roomStatusOptions"
                placeholder="Choisir un statut"
              ></app-select>
            </div>
            <div class="sm:col-span-2">
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Description</label>
              <textarea
                rows="3"
                [(ngModel)]="roomForm.description"
                class="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              ></textarea>
            </div>
          </div>

          <p *ngIf="roomFormError" class="mt-4 text-sm text-error-600 dark:text-error-300">{{ roomFormError }}</p>

          <div class="mt-5 flex justify-end gap-2">
            <button
              type="button"
              (click)="closeRoomFormModal()"
              class="h-11 rounded-lg border border-gray-300 px-4 text-sm font-semibold text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
            >
              Annuler
            </button>
            <button
              type="button"
              (click)="saveRoom()"
              [disabled]="roomFormSaving"
              class="h-11 rounded-lg bg-brand-500 px-4 text-sm font-semibold text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {{ roomFormSaving ? 'Enregistrement...' : 'Enregistrer' }}
            </button>
          </div>
        </div>
      </div>

      <div
        *ngIf="isRoomDetailsModalOpen && selectedRoomDetails"
        class="fixed inset-0 z-[110050] flex items-center justify-center bg-gray-950/60 p-4"
      >
        <div class="w-full max-w-3xl rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900 sm:p-6">
          <div class="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 class="text-xl font-semibold text-gray-900 dark:text-white/90">{{ selectedRoomDetails.name }}</h2>
              <p class="text-sm text-gray-600 dark:text-gray-400">{{ selectedRoomDetails.location }} - {{ selectedRoomDetails.capacity }} places</p>
            </div>
            <button
              type="button"
              (click)="closeRoomDetailsModal()"
              class="h-10 rounded-lg border border-gray-300 px-4 text-sm font-semibold text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
            >
              Fermer
            </button>
          </div>

          <div class="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm dark:border-gray-700 dark:bg-gray-900">
            <p class="font-medium text-gray-800 dark:text-gray-100">Description</p>
            <p class="mt-1 text-gray-600 dark:text-gray-300">{{ selectedRoomDetails.description || 'Aucune description' }}</p>
            <p class="mt-3 text-gray-600 dark:text-gray-300">
              Statut actuel: <span class="font-semibold">{{ getBusinessRoomStatusLabel(selectedRoomDetails) }}</span>
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
                    <th class="px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">Debut</th>
                    <th class="px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">Fin</th>
                    <th class="px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let reservation of getRoomReservationsForDetails(selectedRoomDetails.id)" class="border-b border-gray-200 dark:border-gray-700">
                    <td class="px-3 py-2 text-xs text-gray-700 dark:text-gray-200">{{ reservation.userName }}</td>
                    <td class="px-3 py-2 text-xs text-gray-700 dark:text-gray-200">{{ reservation.startDate | date:'dd/MM/yyyy HH:mm' }}</td>
                    <td class="px-3 py-2 text-xs text-gray-700 dark:text-gray-200">{{ reservation.endDate | date:'dd/MM/yyyy HH:mm' }}</td>
                    <td class="px-3 py-2 text-xs text-gray-700 dark:text-gray-200">{{ reservation.status }}</td>
                  </tr>
                  <tr *ngIf="getRoomReservationsForDetails(selectedRoomDetails.id).length === 0">
                    <td colspan="4" class="px-3 py-3 text-center text-xs text-gray-500 dark:text-gray-400">
                      Aucune reservation liee pour cette salle.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div
        *ngIf="isArchiveRoomModalOpen && roomToArchive"
        class="fixed inset-0 z-[110120] flex items-center justify-center bg-gray-950/60 p-4"
      >
        <div class="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900 sm:p-6">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white/90">Archiver la salle</h2>
          <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
            La salle <span class="font-semibold">{{ roomToArchive.name }}</span> sera desactivee. Les nouvelles reservations seront bloquees, l'historique reste conserve.
          </p>

          <div class="mt-5 flex justify-end gap-2">
            <button
              type="button"
              (click)="closeArchiveRoomModal()"
              class="h-10 rounded-lg border border-gray-300 px-4 text-sm font-semibold text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
            >
              Annuler
            </button>
            <button
              type="button"
              (click)="archiveRoom()"
              [disabled]="isArchivingRoom"
              class="h-10 rounded-lg bg-error-500 px-4 text-sm font-semibold text-white hover:bg-error-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {{ isArchivingRoom ? 'Archivage...' : 'Confirmer archivage' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class RoomReservationsComponent implements OnInit, OnDestroy {
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

  rooms: Room[] = [];
  roomReservations: RoomReservation[] = [];
  events: Event[] = [];

  searchTerm = '';
  statusFilter: RoomStatusFilter = 'all';
  capacityFilter: CapacityFilter = 'all';
  roomsPage = 0;
  roomsPageSize = 10;
  roomsTotalElements = 0;
  roomsTotalPages = 0;
  roomsLoading = false;
  roomsLoadError = '';
  private roomsPageSubscription?: Subscription;

  isModalOpen = false;
  selectedRoomId = '';
  selectedEventId = '';
  isRoomFormModalOpen = false;
  roomFormMode: 'create' | 'edit' = 'create';
  editingRoomId: string | null = null;
  roomFormSaving = false;
  roomFormError = '';
  isRoomDetailsModalOpen = false;
  selectedRoomDetails: Room | null = null;
  isArchiveRoomModalOpen = false;
  roomToArchive: Room | null = null;
  isArchivingRoom = false;

  overlapCheck = {
    roomId: '',
    startDate: '',
    endDate: '',
  };
  isCheckingOverlap = false;
  overlapCheckMessage = '';
  overlapCheckTone: 'success' | 'error' | 'info' = 'info';

  roomForm = {
    name: '',
    location: '',
    description: '',
    imageUrl: '',
    capacity: 10,
    status: 'DISPONIBLE' as RoomBusinessStatus,
    active: true,
  };

  readonly statusFilterOptions: Option[] = [
    { value: 'all', label: 'Toutes' },
    { value: 'available', label: 'Libre' },
    { value: 'occupied', label: 'Occupee' },
    { value: 'maintenance', label: 'Maintenance' },
  ];

  readonly capacityFilterOptions: Option[] = [
    { value: 'all', label: 'Capacite' },
    { value: 'small', label: 'Petite (<= 10)' },
    { value: 'medium', label: 'Moyenne (11-30)' },
    { value: 'large', label: 'Grande (> 30)' },
  ];

  readonly roomStatusOptions: Option[] = [
    { value: 'DISPONIBLE', label: 'Disponible' },
    { value: 'OCCUPEE', label: 'Occupee' },
    { value: 'MAINTENANCE', label: 'Maintenance' },
    { value: 'INACTIVE', label: 'Inactive' },
  ];

  get roomManagerRoomOptions(): Option[] {
    return this.rooms.map((room) => ({
      value: room.id,
      label: `${room.name} (${this.getStatusLabel(this.getRoomStatus(room))})`,
    }));
  }

  get reservableRoomOptions(): Option[] {
    return this.reservableRooms.map((room) => ({
      value: room.id,
      label: `${room.name} (${room.capacity} places)`,
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

  roomBooking = {
    title: '',
    purpose: '',
    startDate: '',
    endDate: '',
    attendeeCount: 1,
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

    this.roomsPageSubscription = this.reservationService.roomsPageState$.subscribe((pageState) => {
      this.roomsPage = pageState.page;
      this.roomsPageSize = pageState.size;
      this.roomsTotalElements = pageState.totalElements;
      const safeSize = Math.max(pageState.size || this.roomsPageSize || 1, 1);
      const computedPages = pageState.totalElements > 0 ? Math.ceil(pageState.totalElements / safeSize) : 0;
      this.roomsTotalPages = Math.max(pageState.totalPages || 0, computedPages);
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
      this.roomsPage = 0;
      this.loadRooms();
    });

    this.initializeOverlapWindow();
    this.loadData();
  }

  ngOnDestroy(): void {
    this.roomsPageSubscription?.unsubscribe();
    this.routeQuerySubscription?.unsubscribe();
  }

  loadData(): void {
    this.loadRooms();

    this.reservationService.getRoomReservations({ page: 0, size: 500, sort: 'startAt,desc' }).subscribe((reservations) => {
      this.roomReservations = reservations;
    });

    this.eventService.getEvents().subscribe((events) => {
      this.events = events;
    });
  }

  get filteredRooms(): Room[] {
    return this.rooms.filter((room) => {
      const status = this.getRoomStatus(room);
      if (this.statusFilter === 'available' && status !== 'LIBRE') {
        return false;
      }
      if (this.statusFilter === 'occupied' && status !== 'OCCUPEE') {
        return false;
      }
      if (this.statusFilter === 'maintenance' && status !== 'MAINTENANCE') {
        return false;
      }

      return true;
    });
  }

  get reservableRooms(): Room[] {
    return this.rooms.filter((room) => this.getRoomStatus(room) === 'LIBRE');
  }

  get canSubmitRoomBooking(): boolean {
    const hasRequiredFields = (
      this.selectedRoomId.length > 0 &&
      this.roomBooking.title.trim().length > 0 &&
      this.roomBooking.startDate.length > 0 &&
      this.roomBooking.endDate.length > 0 &&
      this.roomBooking.attendeeCount > 0
    );

    if (!hasRequiredFields) {
      return false;
    }

    const startDate = new Date(this.roomBooking.startDate);
    const endDate = new Date(this.roomBooking.endDate);
    return this.isValidBookingWindow(startDate, endDate);
  }

  get totalRooms(): number {
    return this.rooms.length;
  }

  get availableRoomsCount(): number {
    return this.rooms.filter((room) => this.getRoomStatus(room) === 'LIBRE').length;
  }

  get occupiedRoomsCount(): number {
    return this.rooms.filter((room) => this.getRoomStatus(room) === 'OCCUPEE').length;
  }

  get maintenanceRoomsCount(): number {
    return this.rooms.filter((room) => this.getRoomStatus(room) === 'MAINTENANCE').length;
  }

  get pendingRoomReservations(): RoomReservation[] {
    return this.roomReservations
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

  isRoomReservationDisabled(room: Room): boolean {
    return this.getRoomStatus(room) !== 'LIBRE' || !this.canCreateReservations();
  }

  getRoomReservationActionLabel(room: Room): string {
    if (!this.canCreateReservations()) {
      return 'Reservation indisponible (role)';
    }
    if (this.getRoomStatus(room) !== 'LIBRE') {
      return 'Indisponible';
    }
    return 'Reserver';
  }

  hasAmenities(room: Room): boolean {
    return Array.isArray(room.amenities) && room.amenities.length > 0;
  }

  goToEquipmentManagement(): void {
    this.router.navigateByUrl('/reservations/equipements');
  }

  openRoomPlanning(room: Room): void {
    this.openRoomDetails(room);
  }

  focusRoomInventory(): void {
    const section = document.getElementById('rooms-inventory-grid');
    section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  getRoomStatus(room: Room): RoomVisualStatus {
    if (!room.isActive || room.status === 'INACTIVE' || room.status === 'MAINTENANCE') {
      return 'MAINTENANCE';
    }
    if (room.status === 'OCCUPEE') {
      return 'OCCUPEE';
    }

    if (this.hasCurrentReservation(room.id)) {
      return 'OCCUPEE';
    }

    return 'LIBRE';
  }

  getBusinessRoomStatusLabel(room: Room): string {
    const status = room.status ?? (room.isActive ? 'DISPONIBLE' : 'INACTIVE');
    if (status === 'DISPONIBLE') {
      return 'Disponible';
    }
    if (status === 'OCCUPEE') {
      return 'Occupee';
    }
    if (status === 'MAINTENANCE') {
      return 'Maintenance';
    }
    return 'Inactive';
  }

  getRoomOccupancy(room: Room): number {
    const activeReservations = this.roomReservations.filter(
      (reservation) =>
        reservation.roomId === room.id &&
        (reservation.status === 'APPROVED' || reservation.status === 'PENDING'),
    );
    const reservedSeats = activeReservations.reduce((total, reservation) => (
      total + Math.max(reservation.attendeeCount || 0, 0)
    ), 0);
    const capacity = Math.max(room.capacity, 1);
    const occupancy = Math.min(100, Math.round((reservedSeats / capacity) * 100));

    return room.isActive ? occupancy : 0;
  }

  getStatusLabel(status: RoomVisualStatus): string {
    if (status === 'LIBRE') {
      return 'Libre';
    }
    if (status === 'OCCUPEE') {
      return 'Occupee';
    }

    return 'Maintenance';
  }

  getStatusBadgeClass(status: RoomVisualStatus): string {
    if (status === 'LIBRE') {
      return 'bg-success-50 text-success-700 dark:bg-success-500/20 dark:text-success-300';
    }
    if (status === 'OCCUPEE') {
      return 'bg-error-50 text-error-700 dark:bg-error-500/20 dark:text-error-300';
    }

    return 'bg-warning-50 text-warning-700 dark:bg-warning-500/20 dark:text-warning-300';
  }

  getOccupancyBarClass(status: RoomVisualStatus): string {
    if (status === 'LIBRE') {
      return 'bg-success-500';
    }
    if (status === 'OCCUPEE') {
      return 'bg-error-500';
    }

    return 'bg-warning-500';
  }

  openReservationModal(room: Room): void {
    if (!this.canCreateReservations() || this.getRoomStatus(room) !== 'LIBRE') {
      return;
    }

    this.selectedRoomId = room.id;
    this.selectedEventId = '';
    this.initializeBookingWindow();
    this.isModalOpen = true;
  }

  openNewReservationModal(): void {
    if (!this.canCreateReservations()) {
      return;
    }

    const firstRoom = this.reservableRooms[0];
    this.selectedRoomId = firstRoom ? firstRoom.id : '';
    this.selectedEventId = '';
    this.initializeBookingWindow();
    this.isModalOpen = true;
  }

  openCreateRoomModal(): void {
    if (!this.canManageInventory()) {
      return;
    }

    this.roomFormMode = 'create';
    this.editingRoomId = null;
    this.roomFormError = '';
    this.roomForm = {
      name: '',
      location: '',
      description: '',
      imageUrl: '',
      capacity: 10,
      status: 'DISPONIBLE',
      active: true,
    };
    this.isRoomFormModalOpen = true;
  }

  openEditRoomModal(room: Room): void {
    if (!this.canManageInventory()) {
      return;
    }

    this.roomFormMode = 'edit';
    this.editingRoomId = room.id;
    this.roomFormError = '';
    this.roomForm = {
      name: room.name,
      location: room.location,
      description: room.description || '',
      imageUrl: room.imageUrl || '',
      capacity: room.capacity,
      status: room.status ?? (room.isActive ? 'DISPONIBLE' : 'INACTIVE'),
      active: room.isActive,
    };
    this.isRoomFormModalOpen = true;
  }

  closeRoomFormModal(): void {
    this.isRoomFormModalOpen = false;
    this.roomFormSaving = false;
  }

  onRoomImageSelected(event: globalThis.Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      this.roomFormError = 'Le fichier doit etre une image.';
      input.value = '';
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      this.roomFormError = 'Image trop volumineuse. Taille maximale: 2 Mo.';
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.roomForm.imageUrl = typeof reader.result === 'string' ? reader.result : '';
      this.roomFormError = '';
      input.value = '';
    };
    reader.onerror = () => {
      this.roomFormError = 'Impossible de lire l image selectionnee.';
      input.value = '';
    };
    reader.readAsDataURL(file);
  }

  removeRoomImage(): void {
    this.roomForm.imageUrl = '';
  }

  saveRoom(): void {
    if (!this.canManageInventory()) {
      return;
    }

    const name = this.roomForm.name.trim();
    const location = this.resolveRoomLocation(name);
    const description = this.roomForm.description.trim();
    const imageUrl = this.roomForm.imageUrl.trim();
    const capacity = Number(this.roomForm.capacity);

    if (!name || !Number.isFinite(capacity) || capacity < 1) {
      this.roomFormError = 'Nom et capacite valide sont obligatoires.';
      return;
    }

    if (!imageUrl) {
      this.roomFormError = 'Image 3D de la salle obligatoire.';
      return;
    }

    this.roomFormSaving = true;
    this.roomFormError = '';

    const payload: Omit<Room, 'id' | 'createdAt'> = {
      name,
      location,
      description,
      imageUrl,
      capacity,
      status: this.roomForm.status,
      amenities: [],
      isActive: this.roomForm.status !== 'INACTIVE' && this.roomForm.active,
    };

    const request$ = this.roomFormMode === 'create'
      ? this.reservationService.addRoom(payload)
      : this.reservationService.updateRoom(this.editingRoomId!, payload);

    request$.subscribe({
      next: () => {
        this.showFeedback(
          this.roomFormMode === 'create' ? 'Salle creee avec succes.' : 'Salle mise a jour avec succes.',
          'success',
        );
        this.closeRoomFormModal();
        this.loadData();
      },
      error: (error) => {
        this.roomFormSaving = false;
        this.roomFormError = this.readBackendError(error, 'Impossible d enregistrer la salle.');
      },
    });
  }

  private resolveRoomLocation(roomName: string): string {
    const currentLocation = this.roomForm.location.trim();
    if (currentLocation) {
      return currentLocation;
    }

    return roomName || 'Salle CNSTN';
  }

  openRoomDetails(room: Room): void {
    this.selectedRoomDetails = room;
    this.isRoomDetailsModalOpen = true;
  }

  closeRoomDetailsModal(): void {
    this.isRoomDetailsModalOpen = false;
    this.selectedRoomDetails = null;
  }

  getRoomReservationsForDetails(roomId: string): RoomReservation[] {
    return this.roomReservations
      .filter((reservation) => reservation.roomId === roomId)
      .sort((left, right) => right.startDate.getTime() - left.startDate.getTime());
  }

  getNextRoomReservationLabel(roomId: string): string {
    const now = Date.now();
    const nextReservation = this.roomReservations
      .filter((reservation) => reservation.roomId === roomId && reservation.endDate.getTime() >= now)
      .sort((left, right) => left.startDate.getTime() - right.startDate.getTime())[0];

    if (!nextReservation) {
      return 'Aucune';
    }

    return `${nextReservation.startDate.toLocaleString('fr-FR')}`;
  }

  setRoomBusinessStatus(room: Room, status: RoomBusinessStatus): void {
    if (!this.canManageInventory()) {
      return;
    }

    const payload: Partial<Room> = {
      status,
      isActive: status !== 'INACTIVE',
    };

    this.reservationService.updateRoom(room.id, payload).subscribe({
      next: () => {
        this.showFeedback(`Statut salle mis a jour: ${this.getBusinessRoomStatusLabel({ ...room, ...payload })}.`, 'success');
        this.loadData();
      },
      error: (error) => {
        this.showFeedback(this.readBackendError(error, 'Mise a jour du statut salle impossible.'), 'error');
      },
    });
  }

  toggleRoomActive(room: Room): void {
    const nextStatus: RoomBusinessStatus = room.isActive ? 'INACTIVE' : 'DISPONIBLE';
    this.setRoomBusinessStatus(room, nextStatus);
  }

  runOverlapCheck(): void {
    if (!this.overlapCheck.roomId || !this.overlapCheck.startDate || !this.overlapCheck.endDate) {
      this.overlapCheckTone = 'error';
      this.overlapCheckMessage = 'Selectionnez la salle, le debut et la fin du creneau.';
      return;
    }

    const startDate = new Date(this.overlapCheck.startDate);
    const endDate = new Date(this.overlapCheck.endDate);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || startDate >= endDate) {
      this.overlapCheckTone = 'error';
      this.overlapCheckMessage = 'Le creneau est invalide.';
      return;
    }

    this.isCheckingOverlap = true;
    this.overlapCheckMessage = '';

    this.reservationService.checkRoomConflict(this.overlapCheck.roomId, startDate, endDate).subscribe({
      next: (hasConflict) => {
        this.isCheckingOverlap = false;
        this.overlapCheckTone = hasConflict ? 'error' : 'success';
        this.overlapCheckMessage = hasConflict
          ? 'Conflit detecte: cette salle est deja reservee sur ce creneau.'
          : 'Aucun chevauchement detecte sur ce creneau.';
      },
      error: (error) => {
        this.isCheckingOverlap = false;
        this.overlapCheckTone = 'error';
        this.overlapCheckMessage = this.readBackendError(error, 'Impossible de verifier le chevauchement.');
      },
    });
  }

  openArchiveRoomModal(room: Room): void {
    if (!this.canManageInventory()) {
      return;
    }

    this.roomToArchive = room;
    this.isArchivingRoom = false;
    this.isArchiveRoomModalOpen = true;
  }

  closeArchiveRoomModal(): void {
    this.isArchiveRoomModalOpen = false;
    this.isArchivingRoom = false;
    this.roomToArchive = null;
  }

  archiveRoom(): void {
    if (!this.canManageInventory() || !this.roomToArchive) {
      return;
    }

    this.isArchivingRoom = true;
    this.reservationService.deleteRoom(this.roomToArchive.id).subscribe({
      next: () => {
        this.showFeedback('Salle archivee avec succes.', 'success');
        this.closeArchiveRoomModal();
        this.loadData();
      },
      error: (error) => {
        this.isArchivingRoom = false;
        this.showFeedback(this.readBackendError(error, 'Archivage de la salle impossible.'), 'error');
      },
    });
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.statusFilter = 'all';
    this.capacityFilter = 'all';
    this.roomsPage = 0;
    this.loadRooms();
  }

  closeModal(): void {
    this.isModalOpen = false;
  }

  bookRoom(): void {
    if (!this.canSubmitRoomBooking) {
      return;
    }

    const selectedRoom = this.rooms.find((room) => room.id === this.selectedRoomId);
    if (!selectedRoom) {
      this.showFeedback('Veuillez selectionner une salle valide.', 'error');
      return;
    }

    const startDate = new Date(this.roomBooking.startDate);
    const endDate = new Date(this.roomBooking.endDate);

    const bookingWindowError = this.getBookingWindowValidationError(startDate, endDate);
    if (bookingWindowError) {
      this.showFeedback(bookingWindowError, 'error');
      return;
    }

    this.reservationService
      .bookRoom({
        eventId: this.selectedEventId || undefined,
        roomId: selectedRoom.id,
        roomName: selectedRoom.name,
        userId: this.currentUserId,
        userName: this.currentUserName,
        title: this.roomBooking.title.trim(),
        purpose: this.roomBooking.purpose.trim(),
        startDate,
        endDate,
        attendeeCount: this.roomBooking.attendeeCount,
      })
      .subscribe((result) => {
        if (!result) {
          this.lastCreatedReservationId = '';
          this.showFeedback('Cette salle est deja reservee sur ce creneau.', 'error');
          return;
        }

        this.lastCreatedReservationId = result.id;
        this.showFeedback('Reservation de salle enregistree.', 'success');
        this.loadData();
        this.closeModal();
      }, (error) => {
        this.showFeedback(this.readBackendError(error, 'Erreur serveur lors de la reservation.'), 'error');
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

  validateRoomReservation(reservation: RoomReservation, approved: boolean): void {
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
      ? this.reservationService.approveRoomReservation(reservation.id, this.currentUserName)
      : this.reservationService.rejectRoomReservation(reservation.id, this.currentUserName, this.validationComment.trim());

    request$.subscribe({
      next: (updated) => {
        this.validationInProgressId = '';
        if (!updated) {
          this.showFeedback('La reservation n a pas pu etre mise a jour.', 'error');
          return;
        }

        this.showFeedback(
          approved ? 'Reservation de salle validee.' : 'Reservation de salle refusee.',
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

  private initializeOverlapWindow(): void {
    const now = new Date();
    const inOneHour = new Date(now.getTime() + 60 * 60 * 1000);
    this.overlapCheck = {
      roomId: this.rooms[0]?.id || '',
      startDate: this.toDateTimeLocal(now),
      endDate: this.toDateTimeLocal(inOneHour),
    };
    this.overlapCheckMessage = '';
    this.overlapCheckTone = 'info';
  }

  private initializeBookingWindow(): void {
    const defaultStart = this.buildDefaultStartDate();
    const inOneHour = new Date(defaultStart.getTime() + 60 * 60 * 1000);

    this.roomBooking = {
      title: '',
      purpose: '',
      startDate: this.toDateTimeLocal(defaultStart),
      endDate: this.toDateTimeLocal(inOneHour),
      attendeeCount: 1,
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

  private hasCurrentReservation(roomId: string): boolean {
    const now = Date.now();

    return this.roomReservations.some((reservation) => {
      if (reservation.roomId !== roomId) {
        return false;
      }

      if (reservation.status !== 'APPROVED' && reservation.status !== 'PENDING') {
        return false;
      }

      const start = reservation.startDate instanceof Date
        ? reservation.startDate.getTime()
        : new Date(reservation.startDate).getTime();
      const end = reservation.endDate instanceof Date
        ? reservation.endDate.getTime()
        : new Date(reservation.endDate).getTime();

      return start <= now && now <= end;
    });
  }

  private showFeedback(message: string, tone: 'success' | 'error'): void {
    this.feedbackMessage = tone === 'error' ? this.sanitizeFeedbackMessage(message) : message;
    this.feedbackTone = tone;
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
      return 'Erreur serveur lors de la reservation.';
    }

    return trimmed;
  }

  private toDateTimeLocal(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  applyFilters(): void {
    this.roomsPage = 0;
    this.loadRooms();
  }

  nextRoomsPage(): void {
    if (this.roomsPage + 1 >= this.roomsTotalPages) {
      return;
    }
    this.roomsPage += 1;
    this.loadRooms();
  }

  previousRoomsPage(): void {
    if (this.roomsPage <= 0) {
      return;
    }
    this.roomsPage -= 1;
    this.loadRooms();
  }

  goToRoomsPage(page: number): void {
    if (page < 0 || page >= this.roomsTotalPages || page === this.roomsPage) {
      return;
    }
    this.roomsPage = page;
    this.loadRooms();
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

  private loadRooms(): void {
    const minCapacity = this.capacityFilter === 'small'
      ? 1
      : this.capacityFilter === 'medium'
        ? 11
        : this.capacityFilter === 'large'
          ? 31
          : undefined;

    this.roomsLoading = true;
    this.reservationService.getRooms({
      page: this.roomsPage,
      size: this.roomsPageSize,
      sort: 'name,asc',
      search: this.searchTerm.trim() || undefined,
      active: undefined,
      minCapacity,
    }).subscribe({
      next: (rooms) => {
        this.rooms = rooms;
        this.roomsLoadError = '';
        if (!this.overlapCheck.roomId && rooms.length > 0) {
          this.overlapCheck.roomId = rooms[0].id;
        }
        this.roomsLoading = false;
      },
      error: (error) => {
        this.rooms = [];
        this.roomsLoading = false;
        this.roomsLoadError = this.readBackendError(error, 'Chargement des salles impossible. Verifiez vos droits puis reessayez.');
      }
    });
  }

  private readRouteSearch(): string {
    return (this.route.snapshot.queryParamMap.get('search') || this.route.snapshot.queryParamMap.get('q') || '').trim();
  }

}
