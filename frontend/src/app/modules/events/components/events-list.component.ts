import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FullCalendarComponent, FullCalendarModule } from '@fullcalendar/angular';
import { EventInput, CalendarOptions, DateSelectArg, EventClickArg, EventContentArg } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import frLocale from '@fullcalendar/core/locales/fr';
import { Subscription, catchError, forkJoin, map, of, switchMap, throwError } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { EventService } from '../../../core/services/event.service';
import { InvitationService } from '../../../core/services/invitation.service';
import { AuthService } from '../../../core/services/auth.service';
import { ReservationService } from '../../../core/services/reservation.service';
import { AppRole, Equipment, Event, EventMode, EventStatus, InvitationStatus, Room } from '../../../core/models';
import { Option, SelectComponent } from '../../../shared/components/form/select/select.component';

type CalendarVisualLevel = 'Danger' | 'Success' | 'Primary' | 'Warning';
type EventSortMode = 'recent' | 'title' | 'status';
type CalendarInviteFeedbackTone = 'success' | 'error';

interface CalendarPartnerInviteDispatchResult {
  sentCount: number;
  failedCount: number;
  failedEmails: string[];
}

@Component({
  selector: 'app-events-list',
  standalone: true,
  imports: [CommonModule, FormsModule, FullCalendarModule, SelectComponent],
  template: `
    <div class="mx-auto max-w-7xl space-y-6 px-4 py-6">
      <section class="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 class="mb-1 text-2xl font-bold text-gray-900 dark:text-white/90 lg:text-3xl">Evenements</h1>
            <p class="max-w-2xl text-sm text-gray-600 dark:text-gray-400">
              Planification, validation et participation aux evenements internes dans un espace clair et lisible.
            </p>
            <div class="mt-3 flex flex-wrap items-center gap-2">
              <span class="inline-flex rounded-full bg-brand-500/10 px-3 py-1 text-xs font-semibold text-brand-700 dark:text-brand-300">
                {{ roleLabels[currentRole] }}
              </span>
              <span class="inline-flex rounded-full bg-success-500/10 px-3 py-1 text-xs font-semibold text-success-700 dark:text-success-300">
                Workflow actif
              </span>
            </div>
          </div>

          <div class="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
            <button
              (click)="viewMode = 'list'"
              [ngClass]="viewMode === 'list' ? 'border-brand-500 bg-brand-500 text-white' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-white/[0.03]'"
              class="rounded-xl border px-5 py-2.5 text-sm font-semibold transition"
            >
              Voir la liste
            </button>
            <button
              (click)="viewMode = 'calendar'"
              [ngClass]="viewMode === 'calendar' ? 'border-brand-500 bg-brand-500 text-white' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-white/[0.03]'"
              class="rounded-xl border px-5 py-2.5 text-sm font-semibold transition"
            >
              Voir calendrier
            </button>
            <button
              *ngIf="canCreateEvents()"
              (click)="openCalendarModal()"
              class="rounded-xl bg-success-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-success-600"
            >
              Nouvel evenement
            </button>
          </div>
        </div>

        <div
          *ngIf="calendarSubmissionFeedback"
          class="mt-5 rounded-xl border px-4 py-3 text-sm font-medium"
          [ngClass]="calendarSubmissionFeedbackTone === 'success'
            ? 'border-success-300 bg-success-50 text-success-700 dark:border-success-500/40 dark:bg-success-500/10 dark:text-success-300'
            : 'border-error-300 bg-error-50 text-error-700 dark:border-error-500/40 dark:bg-error-500/10 dark:text-error-300'"
        >
          {{ calendarSubmissionFeedback }}
        </div>

        <div
          *ngIf="eventsLoadError"
          class="mt-3 rounded-xl border border-error-300 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/40 dark:bg-error-500/10 dark:text-error-300"
        >
          {{ eventsLoadError }}
        </div>

        <div class="mt-5 grid grid-cols-1 gap-3 md:grid-cols-4">
          <article class="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
            <p class="text-3xl font-semibold text-gray-900 dark:text-white/90">{{ totalElements }}</p>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Evenements total</p>
          </article>

          <article class="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
            <p class="text-3xl font-semibold text-gray-900 dark:text-white/90">{{ getPublishedEventsCount() }}</p>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Publies</p>
          </article>

          <article class="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
            <p class="text-3xl font-semibold text-gray-900 dark:text-white/90">{{ pendingEvents.length }}</p>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">En attente validation</p>
          </article>

          <article class="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
            <p class="text-3xl font-semibold text-gray-900 dark:text-white/90">{{ getReferenceMonthCount() }}</p>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Programmes recemment</p>
          </article>
        </div>

        <div class="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_220px_220px_auto_auto_auto]">
          <input
            type="text"
            [(ngModel)]="searchTerm"
            (keydown.enter)="applyListFilters()"
            placeholder="Rechercher un evenement, lieu, organisateur..."
            class="h-11 w-full rounded-xl border border-gray-300 bg-transparent px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
          />

          <app-select
            [(ngModel)]="statusFilter"
            (ngModelChange)="applyListFilters()"
            [options]="statusFilterOptions"
            placeholder="Tous les statuts"
            className="bg-white dark:bg-gray-900"
          ></app-select>

          <app-select
            [(ngModel)]="typeFilter"
            (ngModelChange)="applyListFilters()"
            [options]="typeFilterOptions"
            placeholder="Tous les types"
            className="bg-white dark:bg-gray-900"
          ></app-select>

          <button
            type="button"
            (click)="cycleSortMode()"
            class="h-11 rounded-xl border border-gray-300 px-4 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
          >
            Trier: {{ getSortModeLabel() }}
          </button>

          <button
            type="button"
            (click)="applyListFilters()"
            class="h-11 rounded-xl border border-brand-300 px-4 text-sm font-semibold text-brand-700 transition hover:bg-brand-50 dark:border-brand-500/50 dark:text-brand-300 dark:hover:bg-brand-500/10"
          >
            Appliquer
          </button>

          <button
            type="button"
            (click)="resetListFilters()"
            class="h-11 rounded-xl border border-gray-300 px-4 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
          >
            Reinitialiser
          </button>
        </div>
      </section>

      <section *ngIf="viewMode === 'list'" class="space-y-5">
        <div
          *ngIf="isListLoading"
          class="rounded-2xl border border-gray-200 bg-white px-6 py-8 text-center text-sm text-gray-500 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-300"
        >
          Chargement des evenements...
        </div>

        <div
          *ngIf="!isListLoading && canReviewWorkflowEvents() && pendingEvents.length > 0"
          class="rounded-2xl border border-warning-300 bg-warning-50 p-5 dark:border-warning-500/40 dark:bg-warning-500/10"
        >
          <h3 class="mb-3 text-sm font-semibold uppercase tracking-wide text-warning-700 dark:text-warning-300">
            Demandes en attente de validation
          </h3>

          <div class="space-y-3">
            <article
              *ngFor="let request of pendingEvents"
              class="flex flex-col gap-3 rounded-xl border border-warning-200 bg-white p-4 dark:border-warning-500/40 dark:bg-gray-900"
            >
              <div class="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p class="text-base font-semibold text-gray-900 dark:text-white/90">{{ request.title }}</p>
                  <p class="text-sm text-gray-500 dark:text-gray-400">
                    {{ getEventModeLabel(request) }} - {{ isEventOnlineOnly(request) ? 'Acces en ligne' : request.location }} - {{ request.startDate | date:'short' }}
                  </p>
                </div>
                <div class="flex gap-2">
                  <button
                    (click)="approveEvent(request)"
                    class="rounded-lg bg-success-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-success-600"
                  >
                    Valider
                  </button>
                  <button
                    (click)="rejectEvent(request)"
                    class="rounded-lg bg-error-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-error-600"
                  >
                    Refuser
                  </button>
                </div>
              </div>
            </article>
          </div>
        </div>

        <div *ngIf="!isListLoading && filteredEvents.length === 0" class="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center dark:border-gray-700 dark:bg-white/[0.03]">
          <p class="text-lg font-semibold text-gray-800 dark:text-white/90">Aucun evenement trouve</p>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Ajustez vos filtres ou creez un nouvel evenement.</p>
        </div>

        <div *ngIf="!isListLoading && filteredEvents.length > 0" class="grid max-h-[68vh] grid-cols-1 gap-4 overflow-y-auto pr-1 md:grid-cols-2 xl:grid-cols-3">
          <article
            *ngFor="let event of filteredEvents"
            class="group rounded-2xl border border-gray-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-theme-md dark:border-gray-800 dark:bg-white/[0.03] dark:hover:border-brand-500"
          >
            <div class="mb-4 h-1.5 rounded-full" [ngClass]="getEventAccentClass(event.type)"></div>

            <div class="mb-3 flex flex-wrap items-start justify-between gap-2">
              <h3 class="line-clamp-2 text-lg font-semibold text-gray-900 dark:text-white/90">{{ event.title }}</h3>
              <div class="flex flex-wrap items-center gap-2">
                <span class="rounded-full px-2.5 py-1 text-xs font-semibold" [ngClass]="getEventTypeBadgeClass(event.type)">
                  {{ event.type }}
                </span>
                <span
                  class="rounded-full bg-brand-500/10 px-2.5 py-1 text-xs font-semibold text-brand-700 dark:text-brand-300"
                >
                  {{ getEventModeLabel(event) }}
                </span>
              </div>
            </div>

            <p class="mb-4 line-clamp-2 text-sm text-gray-600 dark:text-gray-400">{{ event.description || 'Aucune description.' }}</p>

            <div class="space-y-2 text-sm text-gray-600 dark:text-gray-300">
              <p><span class="font-semibold">{{ isEventOnlineOnly(event) ? 'Acces' : 'Lieu' }}:</span> {{ isEventOnlineOnly(event) ? 'Salle virtuelle integree' : event.location }}</p>
              <p><span class="font-semibold">Date:</span> {{ getEventDateRangeLabel(event) }}</p>
              <p><span class="font-semibold">Organisateur:</span> {{ event.organiserName }}</p>
            </div>

            <div class="mt-4">
              <div class="mb-1 flex items-center justify-between text-xs font-medium text-gray-500 dark:text-gray-400">
                <span>Participation</span>
                <span>{{ event.participants.length }} / {{ event.maxParticipants || 0 }}</span>
              </div>
              <div class="h-2 rounded-full bg-gray-200 dark:bg-gray-700">
                <div class="h-2 rounded-full bg-brand-500" [style.width.%]="getParticipantFill(event)"></div>
              </div>
            </div>

            <div class="mt-4 flex flex-wrap items-center justify-between gap-2">
              <span class="rounded-full px-2.5 py-1 text-xs font-semibold" [ngClass]="getEventStatusBadgeClass(event.status)">
                {{ getEventStatusLabel(event.status) }}
              </span>
              <span class="text-xs text-gray-500 dark:text-gray-400">Mis a jour {{ event.updatedAt | date:'shortDate' }}</span>
            </div>

            <div class="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                (click)="viewEvent(event)"
                class="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
              >
                Voir detail
              </button>
              <button
                (click)="openEventInCalendar(event)"
                class="rounded-lg border border-brand-300 px-3 py-2 text-sm font-semibold text-brand-700 transition hover:bg-brand-50 dark:border-brand-500/50 dark:text-brand-300 dark:hover:bg-brand-500/10"
              >
                Voir calendrier
              </button>
              <button
                *ngIf="canEditEvent(event)"
                (click)="editEvent(event)"
                class="rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-brand-600"
              >
                Modifier
              </button>
              <button
                *ngIf="canSubmitEvent(event)"
                (click)="submitEvent(event)"
                class="rounded-lg bg-warning-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-warning-600"
              >
                Soumettre
              </button>
            </div>

            <button
              (click)="openPhotoAlbum(event)"
              class="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
            >
              Album photos
            </button>

            <button
              (click)="downloadEventPdf(event)"
              [disabled]="!canDownloadEventPdf(event)"
              class="mt-2 w-full rounded-lg border border-brand-300 px-3 py-2 text-sm font-semibold text-brand-700 transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-brand-500/50 dark:text-brand-300 dark:hover:bg-brand-500/10"
            >
              Telecharger PDF officiel
            </button>
            <p *ngIf="!canDownloadEventPdf(event)" class="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {{ getPdfUnavailableReason(event) }}
            </p>

            <div *ngIf="canDecideEvent(event)" class="mt-3 grid grid-cols-2 gap-2">
              <button
                (click)="approveEvent(event)"
                class="rounded-lg bg-success-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-success-600"
              >
                Valider
              </button>
              <button
                (click)="rejectEvent(event)"
                class="rounded-lg bg-error-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-error-600"
              >
                Refuser
              </button>
            </div>
          </article>
        </div>

        <div
          *ngIf="!isListLoading && totalElements > 0"
          class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-white/[0.03]"
        >
          <p class="text-sm text-gray-600 dark:text-gray-300">
            Affichage {{ getPaginationStart(currentPage, pageSize, totalElements) }}-{{ getPaginationEnd(currentPage, pageSize, totalElements) }} sur {{ totalElements }} éléments
          </p>
          <div class="flex items-center gap-2">
            <button
              type="button"
              (click)="previousPage()"
              [disabled]="currentPage === 0"
              class="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300"
            >
              Precedent
            </button>
            <button
              *ngFor="let page of getVisiblePages(currentPage, totalPages)"
              type="button"
              (click)="goToPage(page)"
              class="rounded-lg border px-3 py-2 text-sm font-semibold transition dark:border-gray-700"
              [ngClass]="page === currentPage
                ? 'border-brand-500 bg-brand-500 text-white'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/[0.03]'"
            >
              {{ page + 1 }}
            </button>
            <button
              type="button"
              (click)="nextPage()"
              [disabled]="currentPage + 1 >= totalPages"
              class="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300"
            >
              Suivant
            </button>
          </div>
        </div>
      </section>

      <section *ngIf="viewMode === 'calendar'" class="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div class="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 p-5 dark:border-gray-800">
          <div>
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white/90">Calendrier des evenements</h2>
            <p class="text-sm text-gray-500 dark:text-gray-400">Cliquez sur un evenement pour afficher ses details et ses actions.</p>
          </div>

          <button
            *ngIf="canCreateEvents()"
            (click)="openCalendarModal()"
            class="rounded-xl bg-success-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-success-600"
          >
            Nouvel evenement
          </button>
        </div>

        <div class="grid grid-cols-1 gap-5 p-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div class="custom-calendar overflow-hidden rounded-xl border border-gray-200 p-3 dark:border-gray-700">
            <full-calendar #calendar [options]="calendarOptions"></full-calendar>
          </div>

          <aside class="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
            <ng-container *ngIf="selectedEvent; else emptyCalendarSelection">
              <div class="mb-3 flex flex-wrap items-start justify-between gap-2">
                <h3 class="line-clamp-2 text-lg font-semibold text-gray-900 dark:text-white/90">{{ selectedEvent.title }}</h3>
                <div class="flex items-center gap-2">
                  <span class="rounded-full px-2.5 py-1 text-xs font-semibold" [ngClass]="getEventStatusBadgeClass(selectedEvent.status)">
                    {{ getEventStatusLabel(selectedEvent.status) }}
                  </span>
                  <button
                    type="button"
                    (click)="closeEventDetails()"
                    class="inline-flex h-7 w-7 items-center justify-center rounded-full border border-gray-300 text-xs font-semibold text-gray-600 transition hover:bg-white dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                    aria-label="Fermer le detail evenement"
                  >
                    x
                  </button>
                </div>
              </div>

              <div class="mb-3 flex flex-wrap gap-2">
                <span class="rounded-full px-2.5 py-1 text-xs font-semibold" [ngClass]="getEventTypeBadgeClass(selectedEvent.type)">
                  {{ selectedEvent.type }}
                </span>
                <span class="rounded-full bg-brand-500/10 px-2.5 py-1 text-xs font-semibold text-brand-700 dark:text-brand-300">
                  {{ getEventModeLabel(selectedEvent) }}
                </span>
              </div>

              <p class="mb-4 line-clamp-3 text-sm text-gray-700 dark:text-gray-300">{{ selectedEvent.description || 'Aucune description.' }}</p>

              <div class="space-y-3 text-sm">
                <p class="text-gray-700 dark:text-gray-300">
                  <span class="font-semibold text-gray-900 dark:text-white/90">{{ isEventOnlineOnly(selectedEvent) ? 'Acces' : 'Lieu' }}:</span>
                  {{ isEventOnlineOnly(selectedEvent) ? (selectedEvent.onlineMeetingUrl || 'Lien non disponible') : selectedEvent.location }}
                </p>
                <p
                  *ngIf="isOnlineMode(getResolvedEventMode(selectedEvent)) && selectedEvent.onlineMeetingPassword"
                  class="text-gray-700 dark:text-gray-300"
                >
                  <span class="font-semibold text-gray-900 dark:text-white/90">Code d'accès:</span>
                  {{ selectedEvent.onlineMeetingPassword }}
                </p>
                <p class="text-gray-700 dark:text-gray-300">
                  <span class="font-semibold text-gray-900 dark:text-white/90">Periode:</span>
                  {{ getEventDateRangeLabel(selectedEvent) }}
                </p>
                <p class="text-gray-700 dark:text-gray-300">
                  <span class="font-semibold text-gray-900 dark:text-white/90">Organisateur:</span>
                  {{ selectedEvent.organiserName }}
                </p>
                <p class="text-gray-700 dark:text-gray-300">
                  <span class="font-semibold text-gray-900 dark:text-white/90">Participants:</span>
                  {{ selectedEvent.participants.length }} / {{ selectedEvent.maxParticipants || 0 }}
                </p>
              </div>

              <div *ngIf="isOnlineMode(getResolvedEventMode(selectedEvent))" class="mt-4 space-y-2">
                <button
                  type="button"
                  (click)="openInternalMeeting(selectedEvent)"
                  class="w-full rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-brand-600"
                >
                  Rejoindre en ligne
                </button>
                <p *ngIf="onlineJoinFeedback" class="text-xs" [ngClass]="onlineJoinFeedbackTone === 'success' ? 'text-success-600 dark:text-success-300' : 'text-error-600 dark:text-error-300'">
                  {{ onlineJoinFeedback }}
                </p>
              </div>

              <div class="mt-4 grid grid-cols-1 gap-2">
                <button
                  type="button"
                  (click)="downloadEventPdf(selectedEvent)"
                  [disabled]="!canDownloadEventPdf(selectedEvent)"
                  class="rounded-lg border border-brand-300 px-3 py-2 text-sm font-semibold text-brand-700 transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-brand-500/50 dark:text-brand-300 dark:hover:bg-brand-500/10"
                >
                  Telecharger PDF
                </button>
                <p *ngIf="!canDownloadEventPdf(selectedEvent)" class="text-xs text-gray-500 dark:text-gray-400">
                  {{ getPdfUnavailableReason(selectedEvent) }}
                </p>
                <button
                  type="button"
                  (click)="openPhotoAlbum(selectedEvent)"
                  class="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
                >
                  Album photos
                </button>
                <button
                  *ngIf="canSubmitEvent(selectedEvent)"
                  type="button"
                  (click)="submitEvent(selectedEvent)"
                  class="rounded-lg bg-warning-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-warning-600"
                >
                  Soumettre
                </button>
                <button
                  *ngIf="canEditEvent(selectedEvent)"
                  type="button"
                  (click)="editEvent(selectedEvent)"
                  class="rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-brand-600"
                >
                  Modifier
                </button>
                <button
                  *ngIf="canDecideEvent(selectedEvent)"
                  type="button"
                  (click)="approveEvent(selectedEvent)"
                  class="rounded-lg bg-success-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-success-600"
                >
                  Valider
                </button>
                <button
                  *ngIf="canDecideEvent(selectedEvent)"
                  type="button"
                  (click)="rejectEvent(selectedEvent)"
                  class="rounded-lg bg-error-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-error-600"
                >
                  Refuser
                </button>
              </div>
            </ng-container>

            <ng-template #emptyCalendarSelection>
              <div class="rounded-xl border border-dashed border-gray-300 bg-white px-4 py-8 text-center dark:border-gray-700 dark:bg-gray-900">
                <p class="text-sm font-semibold text-gray-800 dark:text-white/90">Aucun evenement selectionne</p>
                <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Selectionnez un evenement dans le calendrier pour afficher le detail.
                </p>
              </div>
            </ng-template>
          </aside>
        </div>
      </section>

      <div *ngIf="isCalendarModalOpen" class="fixed inset-0 z-[110000] flex items-center justify-center bg-gray-950/60 p-4 backdrop-blur-sm">
        <div class="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
          <div class="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 class="text-xl font-semibold text-gray-900 dark:text-white/90">{{ selectedEventForModal ? 'Modifier evenement' : 'Ajouter evenement' }}</h3>
              <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Date selectionnee: {{ getModalDateHint() }}</p>
            </div>
            <button
              (click)="closeCalendarModal()"
              class="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
            >
              Fermer
            </button>
          </div>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div class="sm:col-span-2">
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Titre <span class="text-error-500">*</span></label>
              <input
                type="text"
                [(ngModel)]="calendarEventTitle"
                placeholder="Ex: Revue trimestrielle"
                class="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              />
            </div>

            <div class="sm:col-span-2">
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Description</label>
              <textarea
                rows="3"
                [(ngModel)]="calendarEventDescription"
                placeholder="Detaillez l objectif et les points cles..."
                class="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              ></textarea>
            </div>

            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                {{ isPhysicalMode(calendarEventMode) ? 'Lieu (salle)' : 'Lien / canal de reunion' }}
                <span *ngIf="isPhysicalMode(calendarEventMode)" class="text-error-500">*</span>
              </label>
              <ng-container *ngIf="isPhysicalMode(calendarEventMode); else onlineLocationField">
                <app-select
                  [(ngModel)]="calendarEventLocation"
                  (ngModelChange)="updateSelectedCalendarRoomImage()"
                  [options]="roomLocationSelectOptions"
                  placeholder="Selectionner une salle"
                ></app-select>
              </ng-container>
              <ng-template #onlineLocationField>
                <input
                  type="text"
                  [(ngModel)]="calendarEventLocation"
                  placeholder="Ex: Salle virtuelle CNSTN (optionnel)"
                  class="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                />
              </ng-template>
            </div>

            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Type</label>
              <app-select
                [(ngModel)]="calendarEventType"
                [options]="eventTypeSelectOptions"
                placeholder="Type"
              ></app-select>
            </div>

            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Debut</label>
              <input
                type="date"
                [(ngModel)]="calendarEventStartDate"
                class="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              />
            </div>

            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Fin</label>
              <input
                type="date"
                [(ngModel)]="calendarEventEndDate"
                class="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              />
            </div>

            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Heure debut</label>
              <input
                type="time"
                [(ngModel)]="calendarEventStartTime"
                class="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              />
            </div>

            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Heure fin</label>
              <input
                type="time"
                [(ngModel)]="calendarEventEndTime"
                class="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              />
            </div>

            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Statut</label>
              <ng-container *ngIf="canApproveEvents(); else autoStatus">
                <app-select
                  [(ngModel)]="calendarEventStatus"
                  [options]="eventStatusSelectOptions"
                  placeholder="Statut"
                ></app-select>
              </ng-container>
              <ng-template #autoStatus>
                <div class="h-11 rounded-lg border border-gray-300 bg-gray-50 px-4 py-2.5 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                  EN ATTENTE (automatique)
                </div>
              </ng-template>
            </div>

            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Participants max</label>
              <input
                type="number"
                min="1"
                [(ngModel)]="calendarEventMaxParticipants"
                class="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              />
            </div>

            <div class="sm:col-span-2">
              <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-400">Mode evenement</label>
              <app-select
                [(ngModel)]="calendarEventMode"
                [options]="eventModeSelectOptions"
                placeholder="Choisir un mode"
                (ngModelChange)="onCalendarEventModeChange()"
              ></app-select>
              <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Presentiel: salle obligatoire. En ligne: salle virtuelle automatique. Hybride: salle + salle virtuelle.
              </p>
            </div>

            <div *ngIf="isOnlineMode(calendarEventMode)" class="sm:col-span-2 space-y-3">
              <label class="flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                <input
                  type="checkbox"
                  [(ngModel)]="calendarEventRequiresAccessCode"
                  (ngModelChange)="onCalendarAccessCodeToggle()"
                  class="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                />
                <span>Faut-il un code spécial pour accéder à l’événement ?</span>
              </label>

              <div *ngIf="calendarEventRequiresAccessCode">
                <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Code spécial</label>
                <input
                  type="text"
                  maxlength="120"
                  [(ngModel)]="calendarEventAccessCode"
                  placeholder="Ex: CNSTN-2026"
                  class="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                />
              </div>
            </div>

            <div *ngIf="isPhysicalMode(calendarEventMode) && selectedCalendarRoomImageUrl" class="sm:col-span-2">
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Image 3D de la salle</label>
              <img
                [src]="selectedCalendarRoomImageUrl"
                alt="Image de la salle selectionnee"
                class="max-h-64 w-full rounded-xl border border-gray-200 object-cover dark:border-gray-700"
              />
            </div>

            <div *ngIf="isPhysicalMode(calendarEventMode)" class="sm:col-span-2">
              <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-400">Equipements</label>
              <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <label
                  *ngFor="let equipment of availableEventEquipment"
                  class="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                >
                  <input
                    type="checkbox"
                    [checked]="isCalendarEquipmentSelected(equipment.id)"
                    (change)="toggleCalendarEquipment(equipment.id, $any($event.target).checked)"
                    class="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                  />
                  <span>{{ equipment.name }}</span>
                </label>
              </div>
              <p *ngIf="availableEventEquipment.length === 0" class="text-sm text-gray-500 dark:text-gray-400">
                Aucun equipement disponible.
              </p>
            </div>

            <div
              *ngIf="isOnlineMode(calendarEventMode) && canInvitePartners()"
              class="sm:col-span-2 rounded-xl border border-brand-300/70 bg-brand-500/5 dark:border-brand-500/40 dark:bg-brand-500/10"
            >
              <div class="border-b border-brand-200/70 p-4 dark:border-brand-500/30">
                <div class="flex items-start gap-3">
                  <span class="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500 text-white">
                    <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none">
                      <path d="M16 7C16 8.65685 14.6569 10 13 10C11.3431 10 10 8.65685 10 7C10 5.34315 11.3431 4 13 4C14.6569 4 16 5.34315 16 7Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                      <path d="M7 9C8.10457 9 9 8.10457 9 7C9 5.89543 8.10457 5 7 5C5.89543 5 5 5.89543 5 7C5 8.10457 5.89543 9 7 9Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                      <path d="M20 17V16C20 14.3431 18.6569 13 17 13H13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                      <path d="M4 18V16.8C4 15.1431 5.34315 13.8 7 13.8H11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </span>
                  <div>
                    <h4 class="text-base font-semibold text-brand-700 dark:text-brand-300">Inviter des partenaires externes</h4>
                    <p class="mt-1 text-sm text-gray-600 dark:text-gray-300">
                      Les partenaires recevront un e-mail d'invitation avec les informations de l'evenement.
                    </p>
                  </div>
                </div>
              </div>

              <div class="border-b border-brand-200/70 p-4 dark:border-brand-500/30">
                <div class="flex flex-col gap-2 sm:flex-row">
                  <input
                    [(ngModel)]="calendarPartnerInviteEmail"
                    type="email"
                    placeholder="partenaire@organisation.tn"
                    class="h-11 flex-1 rounded-lg border border-gray-300 bg-white px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                  />
                  <button
                    type="button"
                    (click)="addCalendarPartnerEmail()"
                    class="h-11 rounded-lg bg-brand-500 px-4 text-sm font-semibold text-white transition hover:bg-brand-600"
                  >
                    + Ajouter
                  </button>
                </div>
              </div>

              <div class="border-b border-brand-200/70 p-4 dark:border-brand-500/30">
                <div *ngIf="calendarPartnerInvites.length === 0" class="text-sm italic text-gray-500 dark:text-gray-400">
                  Aucun partenaire ajoute
                </div>
                <div *ngIf="calendarPartnerInvites.length > 0" class="flex flex-wrap gap-2">
                  <span
                    *ngFor="let email of calendarPartnerInvites"
                    class="inline-flex items-center gap-2 rounded-full border border-brand-300 bg-white px-3 py-1 text-xs font-semibold text-brand-700 dark:border-brand-500/40 dark:bg-gray-900 dark:text-brand-300"
                  >
                    {{ email }}
                    <button
                      type="button"
                      (click)="removeCalendarPartnerEmail(email)"
                      class="text-brand-700 transition hover:text-error-600 dark:text-brand-300 dark:hover:text-error-300"
                    >
                      x
                    </button>
                  </span>
                </div>
              </div>

              <div class="p-4">
                <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Message d'invitation personnalise</label>
                <textarea
                  [(ngModel)]="calendarPartnerInviteMessage"
                  rows="3"
                  placeholder="Bonjour, nous avons le plaisir de vous inviter a participer a notre evenement..."
                  class="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                ></textarea>

                <div class="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <p class="text-sm text-gray-600 dark:text-gray-300">
                    <span class="font-semibold text-brand-700 dark:text-brand-300">{{ calendarPartnerInvites.length }}</span>
                    partenaire(s) invite(s)
                  </p>
                  <button
                    type="button"
                    (click)="previewCalendarInvitation()"
                    class="rounded-lg border border-brand-300 px-4 py-2 text-sm font-semibold text-brand-700 transition hover:bg-brand-500/10 dark:border-brand-500/40 dark:text-brand-300 dark:hover:bg-brand-500/10"
                  >
                    Previsualiser l'invitation
                  </button>
                </div>

                <p
                  *ngIf="calendarInviteFeedback"
                  class="mt-3 text-xs"
                  [ngClass]="calendarInviteFeedbackTone === 'success' ? 'text-success-600 dark:text-success-300' : 'text-error-600 dark:text-error-300'"
                >
                  {{ calendarInviteFeedback }}
                </p>
              </div>
            </div>

            <div class="sm:col-span-2">
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Couleur visuelle</label>
              <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <button
                  *ngFor="let entry of (calendarsEvents | keyvalue)"
                  type="button"
                  (click)="selectVisualLevel(entry.key)"
                  [ngClass]="calendarEventLevel === entry.key ? 'border-brand-500 ring-2 ring-brand-500/20' : 'border-gray-300 dark:border-gray-700'"
                  class="flex h-11 items-center justify-center gap-2 rounded-lg border bg-white text-sm font-medium text-gray-700 transition hover:border-brand-400 dark:bg-gray-900 dark:text-gray-200"
                >
                  <span class="h-3 w-3 rounded-full" [style.backgroundColor]="entry.value"></span>
                  {{ entry.key }}
                </button>
              </div>
            </div>
          </div>

          <div *ngIf="calendarFormError" class="mt-5 rounded-lg border border-error-300 bg-error-50 px-4 py-3 text-sm text-error-600 dark:border-error-500/40 dark:bg-error-500/10 dark:text-error-300">
            {{ calendarFormError }}
          </div>

          <div class="mt-6 flex flex-wrap justify-end gap-2">
            <button
              (click)="closeCalendarModal()"
              class="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
            >
              Annuler
            </button>
            <button
              (click)="handleAddOrUpdateCalendarEvent()"
              class="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600"
            >
              {{ selectedEventForModal ? 'Enregistrer' : 'Ajouter evenement' }}
            </button>
          </div>
        </div>
      </div>

      <div
        *ngIf="selectedEvent && viewMode === 'list'"
        class="fixed inset-0 z-[110000] overflow-y-auto bg-gray-950/60 p-4 backdrop-blur-sm"
        (click)="closeEventDetails()"
      >
        <div class="flex min-h-full items-center justify-center">
          <div
            class="w-full max-w-3xl rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-800 dark:bg-gray-900"
            (click)="$event.stopPropagation()"
          >
            <div class="mb-5 flex flex-wrap items-start justify-between gap-4">
              <div>
                <h3 class="text-xl font-semibold text-gray-900 dark:text-white/90">{{ selectedEvent.title }}</h3>
                <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Detail evenement</p>
              </div>
              <button
                (click)="closeEventDetails()"
                class="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
              >
                Fermer
              </button>
            </div>

            <div class="mb-4 flex flex-wrap items-center gap-2">
              <span class="rounded-full px-2.5 py-1 text-xs font-semibold" [ngClass]="getEventStatusBadgeClass(selectedEvent.status)">
                {{ getEventStatusLabel(selectedEvent.status) }}
              </span>
              <span class="rounded-full px-2.5 py-1 text-xs font-semibold" [ngClass]="getEventTypeBadgeClass(selectedEvent.type)">
                {{ selectedEvent.type }}
              </span>
              <span
                class="rounded-full bg-brand-500/10 px-2.5 py-1 text-xs font-semibold text-brand-700 dark:text-brand-300"
              >
                {{ getEventModeLabel(selectedEvent) }}
              </span>
            </div>

            <div class="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/70">
              <p class="text-sm text-gray-700 dark:text-gray-300">{{ selectedEvent.description || 'Aucune description.' }}</p>
            </div>

            <div class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div class="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
                <p class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{{ isEventOnlineOnly(selectedEvent) ? 'Acces' : 'Lieu' }}</p>
                <p class="mt-1 text-sm font-medium text-gray-900 dark:text-white/90">
                  {{ isEventOnlineOnly(selectedEvent) ? (selectedEvent.onlineMeetingUrl || 'Lien de reunion non disponible.') : selectedEvent.location }}
                </p>
              </div>
              <div
                *ngIf="isOnlineMode(getResolvedEventMode(selectedEvent)) && selectedEvent.onlineMeetingPassword"
                class="rounded-xl border border-gray-200 p-4 dark:border-gray-700"
              >
                <p class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Code d'accès</p>
                <p class="mt-1 text-sm font-medium text-gray-900 dark:text-white/90">{{ selectedEvent.onlineMeetingPassword }}</p>
              </div>
              <div class="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
                <p class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Periode</p>
                <p class="mt-1 text-sm font-medium text-gray-900 dark:text-white/90">{{ getEventDateRangeLabel(selectedEvent) }}</p>
              </div>
              <div class="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
                <p class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Participants</p>
                <p class="mt-1 text-sm font-medium text-gray-900 dark:text-white/90">{{ selectedEvent.participants.length }} / {{ selectedEvent.maxParticipants }}</p>
              </div>
              <div class="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
                <p class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Organisateur</p>
                <p class="mt-1 text-sm font-medium text-gray-900 dark:text-white/90">{{ selectedEvent.organiserName }}</p>
              </div>
            </div>

            <div
              *ngIf="isOnlineMode(getResolvedEventMode(selectedEvent))"
              class="mt-5 rounded-xl border border-brand-300 bg-brand-500/5 p-4 dark:border-brand-500/40 dark:bg-brand-500/10"
            >
              <div class="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 class="text-sm font-semibold text-gray-900 dark:text-white/90">Reunion en ligne</h4>
                  <p class="mt-1 text-xs text-gray-600 dark:text-gray-300">
                    Ouvrir la salle virtuelle directement dans la plateforme.
                  </p>
                </div>

                <button
                  (click)="openInternalMeeting(selectedEvent)"
                  class="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Rejoindre en ligne
                </button>
              </div>

              <p *ngIf="onlineJoinFeedback" class="mt-3 text-xs" [ngClass]="onlineJoinFeedbackTone === 'success' ? 'text-success-600 dark:text-success-300' : 'text-error-600 dark:text-error-300'">
                {{ onlineJoinFeedback }}
              </p>
            </div>

            <div *ngIf="canInvitePartners() || canCreateEvents()" class="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/70">
              <h4 class="mb-3 text-sm font-semibold text-gray-800 dark:text-white/90">Inviter des employes</h4>
              <p class="mb-3 text-xs text-gray-600 dark:text-gray-300">Saisissez les destinataires reels (utilisateur + email), puis envoyez les invitations.</p>

              <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <input
                  [(ngModel)]="internalInviteRecipient.username"
                  type="text"
                  placeholder="Nom utilisateur"
                  class="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                />
                <input
                  [(ngModel)]="internalInviteRecipient.name"
                  type="text"
                  placeholder="Nom complet"
                  class="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                />
                <input
                  [(ngModel)]="internalInviteRecipient.email"
                  type="email"
                  placeholder="Email employe"
                  class="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                />
              </div>

              <div class="mt-3 flex flex-wrap items-center gap-2">
                <button
                  (click)="addInternalRecipient()"
                  class="rounded-lg border border-brand-300 px-4 py-2 text-sm font-semibold text-brand-700 transition hover:bg-brand-50 dark:border-brand-500/50 dark:text-brand-300 dark:hover:bg-brand-500/10"
                >
                  Ajouter destinataire
                </button>
                <span class="text-xs text-gray-500 dark:text-gray-400">{{ internalInviteRecipients.length }} destinataire(s)</span>
              </div>

              <div *ngIf="internalInviteRecipients.length > 0" class="mt-3 flex flex-wrap gap-2">
                <span
                  *ngFor="let recipient of internalInviteRecipients"
                  class="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 dark:bg-gray-700 dark:text-gray-200"
                >
                  {{ recipient.name }} ({{ recipient.email }})
                  <button type="button" (click)="removeInternalRecipient(recipient.username)" class="text-error-600 dark:text-error-300">x</button>
                </span>
              </div>

              <textarea
                [(ngModel)]="internalInviteMessage"
                rows="2"
                placeholder="Message invitation (optionnel)"
                class="mt-3 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              ></textarea>

              <div class="mt-3 flex flex-wrap items-center gap-2">
                <button
                  (click)="sendInternalInvitations(selectedEvent)"
                  [disabled]="isSendingInternalInvites"
                  class="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {{ isSendingInternalInvites ? 'Envoi...' : 'Envoyer invitations employes' }}
                </button>
                <p
                  *ngIf="internalInviteFeedback"
                  class="text-xs"
                  [ngClass]="internalInviteFeedbackTone === 'success' ? 'text-success-600 dark:text-success-300' : 'text-error-600 dark:text-error-300'"
                >
                  {{ internalInviteFeedback }}
                </p>
              </div>
            </div>

            <div *ngIf="canSubmitEvent(selectedEvent)" class="mt-5 flex flex-wrap gap-2">
              <button
                (click)="submitEvent(selectedEvent)"
                class="rounded-lg bg-warning-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-warning-600"
              >
                Soumettre evenement
              </button>
              <button
                (click)="downloadEventPdf(selectedEvent)"
                [disabled]="!canDownloadEventPdf(selectedEvent)"
                class="rounded-lg border border-brand-300 px-4 py-2 text-sm font-semibold text-brand-700 transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-brand-500/50 dark:text-brand-300 dark:hover:bg-brand-500/10"
              >
                Telecharger PDF officiel
              </button>
              <p *ngIf="!canDownloadEventPdf(selectedEvent)" class="text-xs text-gray-500 dark:text-gray-400">
                {{ getPdfUnavailableReason(selectedEvent) }}
              </p>
            </div>

            <div *ngIf="canDecideEvent(selectedEvent)" class="mt-5 flex flex-wrap gap-2">
              <button
                (click)="approveEvent(selectedEvent)"
                class="rounded-lg bg-success-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-success-600"
              >
                Valider demande
              </button>
              <button
                (click)="rejectEvent(selectedEvent)"
                class="rounded-lg bg-error-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-error-600"
              >
                Refuser demande
              </button>
            </div>

            <div *ngIf="canInvitePartners()" class="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/70">
              <h4 class="mb-3 text-sm font-semibold text-gray-800 dark:text-white/90">Inviter un partenaire externe</h4>

              <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input
                  [(ngModel)]="partnerInvite.name"
                  type="text"
                  placeholder="Nom partenaire"
                  class="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                />
                <input
                  [(ngModel)]="partnerInvite.email"
                  type="email"
                  placeholder="Email partenaire"
                  class="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                />
                <input
                  [(ngModel)]="partnerInvite.organization"
                  type="text"
                  placeholder="Organisation"
                  class="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 sm:col-span-2"
                />
                <textarea
                  [(ngModel)]="partnerInvite.message"
                  rows="2"
                  placeholder="Message invitation"
                  class="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 sm:col-span-2"
                ></textarea>
              </div>

              <div class="mt-3 flex flex-wrap items-center gap-2">
                <button
                  (click)="sendPartnerInvitation(selectedEvent)"
                  class="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600"
                >
                  Envoyer invitation
                </button>
                <p
                  *ngIf="inviteFeedback"
                  class="text-xs"
                  [ngClass]="inviteFeedbackTone === 'success' ? 'text-success-600 dark:text-success-300' : 'text-error-600 dark:text-error-300'"
                >
                  {{ inviteFeedback }}
                </p>
              </div>
            </div>

            <div class="mt-6 flex flex-wrap justify-end gap-2">
              <button
                *ngIf="canEditEvent(selectedEvent)"
                (click)="editEvent(selectedEvent)"
                class="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600"
              >
                Modifier evenement
              </button>
              <button
                (click)="closeEventDetails()"
                class="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host ::ng-deep {
      .fc {
        font-family: inherit;
      }

      .fc .fc-toolbar-title {
        color: #111827;
        font-size: 1.125rem;
        font-weight: 600;
      }

      .dark .fc .fc-toolbar-title {
        color: #e5e7eb;
      }

      .fc .fc-button-primary {
        background-color: #465fff;
        border-color: #465fff;
      }

      .fc .fc-button-primary:hover {
        background-color: #3641f5;
        border-color: #3641f5;
      }

      .fc .fc-button-primary.fc-button-active {
        background-color: #3641f5;
        border-color: #3641f5;
      }

      .fc-event {
        cursor: pointer;
        transition: transform 0.2s ease;
        border-radius: 0.75rem;
        padding: 0;
      }

      .fc-event:hover {
        transform: translateY(-1px);
      }

      .fc .calendar-event-card {
        display: flex;
        flex-direction: column;
        gap: 0.2rem;
        padding: 0.3rem 0.45rem 0.4rem;
      }

      .fc .calendar-event-title {
        font-size: 0.72rem;
        font-weight: 700;
        line-height: 1.05rem;
        white-space: normal;
        overflow: hidden;
        text-overflow: ellipsis;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
      }

      .fc .calendar-event-time {
        font-size: 0.68rem;
        line-height: 0.85rem;
        color: #334155;
        font-weight: 600;
      }

      .fc .calendar-event-meta {
        display: flex;
        gap: 0.25rem;
        flex-wrap: wrap;
      }

      .fc .calendar-event-meta-badge {
        display: inline-flex;
        align-items: center;
        border-radius: 999px;
        border: 1px solid #cbd5e1;
        background: #f8fafc;
        color: #334155;
        padding: 0.05rem 0.35rem;
        font-size: 0.62rem;
        font-weight: 700;
        line-height: 0.8rem;
      }

      .fc .fc-timegrid-event .calendar-event-title {
        -webkit-line-clamp: 1;
      }
    }

    .line-clamp-2 {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
  `]
})
export class EventsListComponent implements OnInit, OnDestroy {
  @ViewChild('calendar') calendarComponent!: FullCalendarComponent;

  events: Event[] = [];
  rooms: Room[] = [];
  equipment: Equipment[] = [];
  selectedEvent: Event | null = null;
  viewMode: 'list' | 'calendar' = 'list';
  currentRole: AppRole = 'EMPLOYEE';
  currentUserId = 'current-user';
  currentUsername = '';
  currentUserName = 'Current User';

  searchTerm = '';
  statusFilter: 'all' | EventStatus = 'all';
  typeFilter: 'all' | Event['type'] = 'all';
  sortMode: EventSortMode = 'recent';
  currentPage = 0;
  pageSize = 10;
  totalElements = 0;
  totalPages = 0;
  isListLoading = false;
  eventsLoadError = '';
  private eventPageStateSubscription?: Subscription;
  private routeQuerySubscription?: Subscription;
  private pendingRouteEventId = '';
  private routeQueryReady = false;

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

  isCalendarModalOpen = false;
  selectedEventForModal: Event | null = null;
  calendarEventTitle = '';
  calendarEventDescription = '';
  calendarEventLocation = '';
  calendarEventMode: EventMode = 'PRESENTIEL';
  calendarEventType: Event['type'] = 'MEETING';
  calendarEventStatus: EventStatus = EventStatus.DRAFT;
  calendarEventMaxParticipants = 50;
  calendarEventLevel: CalendarVisualLevel = 'Primary';
  calendarEventStartDate = '';
  calendarEventEndDate = '';
  calendarEventStartTime = '09:00';
  calendarEventEndTime = '18:00';
  calendarEventRequiresAccessCode = false;
  calendarEventAccessCode = '';
  calendarFormError = '';
  selectedCalendarRoomImageUrl = '';
  selectedCalendarEquipmentIds: string[] = [];
  calendarPartnerInviteEmail = '';
  calendarPartnerInvites: string[] = [];
  calendarPartnerInviteMessage = '';
  calendarInviteFeedback = '';
  calendarInviteFeedbackTone: CalendarInviteFeedbackTone = 'success';
  calendarSubmissionFeedback = '';
  calendarSubmissionFeedbackTone: CalendarInviteFeedbackTone = 'success';
  onlineJoinFeedback = '';
  onlineJoinFeedbackTone: 'success' | 'error' = 'success';

  internalInviteRecipient = {
    username: '',
    email: '',
    name: '',
  };
  internalInviteRecipients: Array<{ username: string; email: string; name: string }> = [];
  internalInviteMessage = '';
  internalInviteFeedback = '';
  internalInviteFeedbackTone: 'success' | 'error' = 'success';
  isSendingInternalInvites = false;

  partnerInvite = {
    name: '',
    email: '',
    organization: '',
    message: ''
  };
  inviteFeedback = '';
  inviteFeedbackTone: 'success' | 'error' = 'success';

  eventTypeOptions: Event['type'][] = ['CONFERENCE', 'MEETING', 'TRAINING', 'WORKSHOP', 'OTHER'];
  eventStatusOptions: EventStatus[] = [
    EventStatus.DRAFT,
    EventStatus.SUBMITTED,
    EventStatus.PUBLISHED,
    EventStatus.CANCELLED,
    EventStatus.COMPLETED
  ];
  readonly eventModeOptions: EventMode[] = ['PRESENTIEL', 'EN_LIGNE', 'HYBRIDE'];

  get eventTypeSelectOptions(): Option[] {
    return this.eventTypeOptions.map((type) => ({
      value: type,
      label: type,
    }));
  }

  get eventStatusSelectOptions(): Option[] {
    return this.eventStatusOptions.map((status) => ({
      value: status,
      label: this.getEventStatusLabel(status),
    }));
  }

  get eventModeSelectOptions(): Option[] {
    return this.eventModeOptions.map((mode) => ({
      value: mode,
      label: this.getEventModeText(mode),
    }));
  }

  get statusFilterOptions(): Option[] {
    return [
      { value: 'all', label: 'Tous les statuts' },
      ...this.eventStatusSelectOptions,
    ];
  }

  get typeFilterOptions(): Option[] {
    return [
      { value: 'all', label: 'Tous les types' },
      ...this.eventTypeSelectOptions,
    ];
  }

  get roomLocationSelectOptions(): Option[] {
    const activeRooms = this.rooms.filter((room) => room.isActive);
    const options = activeRooms.map((room) => ({
      value: room.name,
      label: `${room.name} (${room.location})`,
    }));

    if (this.calendarEventLocation && !options.some((option) => option.value === this.calendarEventLocation)) {
      options.unshift({
        value: this.calendarEventLocation,
        label: `${this.calendarEventLocation} (hors liste)`,
      });
    }

    if (options.length === 0) {
      return [{ value: '', label: 'Aucune salle disponible', disabled: true }];
    }

    return options;
  }

  calendarsEvents: Record<CalendarVisualLevel, string> = {
    'Danger': '#fecaca',
    'Success': '#bbf7d0',
    'Primary': '#bfdbfe',
    'Warning': '#fed7aa'
  };

  calendarOptions: CalendarOptions = {
    initialView: 'dayGridMonth',
    locale: frLocale,
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,timeGridDay'
    },
    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
    editable: true,
    selectable: true,
    selectMinDistance: 10,
    eventDisplay: 'block',
    buttonText: {
      today: 'Aujourd’hui',
      month: 'Mois',
      week: 'Semaine',
      day: 'Jour',
    },
    dayMaxEvents: 3,
    dayMaxEventRows: 3,
    moreLinkText: (count: number) => `+ ${count} autres`,
    eventTimeFormat: { hour: '2-digit', minute: '2-digit', meridiem: false },
    eventClick: (arg) => this.handleEventClick(arg),
    dateClick: (arg) => this.handleDateClick(arg),
    eventContent: (arg) => this.renderCalendarEventContent(arg),
    eventDidMount: (arg: any) => this.applyEventVisualStyles(arg),
    select: (arg) => this.handleDateSelect(arg),
    events: [],
    height: 'auto',
    contentHeight: 'auto'
  };

  constructor(
    private eventService: EventService,
    private invitationService: InvitationService,
    private authService: AuthService,
    private reservationService: ReservationService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.eventPageStateSubscription = this.eventService.eventPageState$.subscribe((pageState) => {
      this.currentPage = pageState.page;
      this.pageSize = pageState.size;
      this.totalElements = pageState.totalElements;
      const safeSize = Math.max(pageState.size || this.pageSize || 1, 1);
      const computedPages = pageState.totalElements > 0 ? Math.ceil(pageState.totalElements / safeSize) : 0;
      this.totalPages = Math.max(pageState.totalPages || 0, computedPages);
    });

    this.authService.currentUser$.subscribe(user => {
      if (!user) {
        return;
      }

      this.currentRole = user.role;
      this.currentUserId = user.id;
      this.currentUsername = (user.username || '').trim();
      this.currentUserName = `${user.firstName} ${user.lastName}`.trim();
    });

    this.routeQuerySubscription = this.route.queryParamMap.subscribe((params) => {
      const routeSearch = (params.get('search') || params.get('q') || '').trim();
      const shouldReloadSearch = this.routeQueryReady && routeSearch !== this.searchTerm;
      this.searchTerm = routeSearch;
      this.pendingRouteEventId = (params.get('eventId') || '').trim();
      if (this.pendingRouteEventId) {
        this.viewMode = 'calendar';
        this.handleRouteEventSelection();
      }
      if (shouldReloadSearch) {
        this.currentPage = 0;
        this.loadEvents();
      }
      this.routeQueryReady = true;
    });

    this.loadEvents();
    this.loadRooms();
    this.loadEquipment();
  }

  ngOnDestroy(): void {
    this.eventPageStateSubscription?.unsubscribe();
    this.routeQuerySubscription?.unsubscribe();
  }

  get filteredEvents(): Event[] {
    return [...this.events];
  }

  get pendingEvents(): Event[] {
    return this.events.filter((event) => this.canDecideEvent(event));
  }

  loadEvents(): void {
    this.isListLoading = true;
    this.eventsLoadError = '';
    this.eventService.getEvents({
      page: this.currentPage,
      size: this.pageSize,
      sort: this.getSortQueryParam(),
      search: this.searchTerm.trim() || undefined,
      status: this.statusFilter !== 'all' ? this.statusFilter : undefined,
      eventType: this.typeFilter !== 'all' ? this.typeFilter : undefined,
    }).subscribe({
      next: (data) => {
        this.events = Array.isArray(data) ? data : [];
        this.updateCalendarEvents();
        this.handleRouteEventSelection();
        this.isListLoading = false;
      },
      error: () => {
        this.events = [];
        this.eventsLoadError = 'Chargement des evenements impossible pour le moment.';
        this.isListLoading = false;
      }
    });
  }

  loadRooms(): void {
    this.reservationService.getRooms().subscribe({
      next: (rooms) => {
        this.rooms = Array.isArray(rooms) ? rooms : [];
      },
      error: (error) => {
        console.error('Error loading rooms for events:', error);
        this.rooms = [];
      },
    });
  }

  loadEquipment(): void {
    this.reservationService.getEquipment({ active: true, size: 200 }).subscribe({
      next: (equipment) => {
        this.equipment = Array.isArray(equipment) ? equipment : [];
      },
      error: () => {
        this.equipment = [];
      },
    });
  }

  get availableEventEquipment(): Equipment[] {
    return this.equipment.filter((item) =>
      item.isActive !== false
      && item.status !== 'MAINTENANCE'
      && item.status !== 'RETIRED'
    );
  }

  updateCalendarEvents(): void {
    const calendarEvents = this.convertEventsToCalendarFormat(this.events);
    if (this.calendarOptions.events) {
      this.calendarOptions.events = calendarEvents;
    }
    if (this.calendarComponent) {
      this.calendarComponent.getApi().refetchEvents();
    }
  }

  convertEventsToCalendarFormat(events: Event[]): EventInput[] {
    return events.map(event => {
      const visualLevel = this.getEventVisualLevel(event);
      const resolvedMode = this.getResolvedEventMode(event);
      return {
        id: event.id,
        title: event.title,
        start: event.startDate,
        end: event.endDate,
        backgroundColor: this.getLevelColor(visualLevel),
        borderColor: this.getLevelBorderColor(visualLevel),
        textColor: this.getLevelTextColor(visualLevel),
        extendedProps: {
          description: event.description,
          location: event.location,
          type: event.type,
          status: event.status,
          modeLabel: this.getEventModeText(resolvedMode),
          statusLabel: this.getEventStatusLabel(event.status),
          visualColor: event.visualColor,
          participants: event.participants,
          maxParticipants: event.maxParticipants,
          onlineEvent: event.onlineEvent
        }
      };
    });
  }

  cycleSortMode(): void {
    const sortOrder: EventSortMode[] = ['recent', 'title', 'status'];
    const currentIndex = sortOrder.indexOf(this.sortMode);
    this.sortMode = sortOrder[(currentIndex + 1) % sortOrder.length];
    this.currentPage = 0;
    this.loadEvents();
  }

  applyListFilters(): void {
    this.currentPage = 0;
    this.loadEvents();
  }

  resetListFilters(): void {
    this.searchTerm = '';
    this.statusFilter = 'all';
    this.typeFilter = 'all';
    this.sortMode = 'recent';
    this.currentPage = 0;
    this.loadEvents();
  }

  previousPage(): void {
    if (this.currentPage <= 0) {
      return;
    }
    this.currentPage -= 1;
    this.loadEvents();
  }

  nextPage(): void {
    if (this.currentPage + 1 >= this.totalPages) {
      return;
    }
    this.currentPage += 1;
    this.loadEvents();
  }

  goToPage(page: number): void {
    if (page < 0 || page >= this.totalPages || page === this.currentPage) {
      return;
    }
    this.currentPage = page;
    this.loadEvents();
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

  getSortModeLabel(): string {
    const labelMap: Record<EventSortMode, string> = {
      recent: 'recents',
      title: 'titre',
      status: 'statut'
    };
    return labelMap[this.sortMode];
  }

  getPublishedEventsCount(): number {
    return this.events.filter(event => event.status === EventStatus.PUBLISHED).length;
  }

  getReferenceMonthCount(): number {
    if (this.events.length === 0) {
      return 0;
    }

    const referenceTimestamp = Math.max(...this.events.map(event => new Date(event.startDate).getTime()));
    const referenceDate = new Date(referenceTimestamp);

    return this.events.filter(event => {
      const eventDate = new Date(event.startDate);
      return eventDate.getFullYear() === referenceDate.getFullYear()
        && eventDate.getMonth() === referenceDate.getMonth();
    }).length;
  }

  getEventAccentClass(type: Event['type']): string {
    const classMap: Record<Event['type'], string> = {
      CONFERENCE: 'bg-blue-400',
      MEETING: 'bg-slate-400',
      TRAINING: 'bg-emerald-400',
      WORKSHOP: 'bg-amber-400',
      OTHER: 'bg-gray-400'
    };
    return classMap[type];
  }

  getEventTypeBadgeClass(type: Event['type']): string {
    const classMap: Record<Event['type'], string> = {
      CONFERENCE: 'bg-blue-100 text-blue-700 dark:text-blue-300',
      MEETING: 'bg-slate-100 text-slate-700 dark:text-slate-300',
      TRAINING: 'bg-emerald-100 text-emerald-700 dark:text-emerald-300',
      WORKSHOP: 'bg-amber-100 text-amber-700 dark:text-amber-300',
      OTHER: 'bg-gray-100 text-gray-700 dark:text-gray-300'
    };
    return classMap[type];
  }

  getEventStatusBadgeClass(status: EventStatus): string {
    const classMap: Record<EventStatus, string> = {
      [EventStatus.PUBLISHED]: 'bg-emerald-100 text-emerald-700 dark:text-emerald-300',
      [EventStatus.SUBMITTED]: 'bg-amber-100 text-amber-700 dark:text-amber-300',
      [EventStatus.DRAFT]: 'bg-slate-100 text-slate-700 dark:text-slate-300',
      [EventStatus.CANCELLED]: 'bg-rose-100 text-rose-700 dark:text-rose-300',
      [EventStatus.COMPLETED]: 'bg-blue-100 text-blue-700 dark:text-blue-300'
    };
    return classMap[status];
  }

  getEventDateRangeLabel(event: Event): string {
    const startDate = new Date(event.startDate);
    const endDate = new Date(event.endDate);

    const startLabel = startDate.toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const endLabel = endDate.toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    return `${startLabel} - ${endLabel}`;
  }

  getParticipantFill(event: Event): number {
    const maxParticipants = event.maxParticipants || 0;
    if (maxParticipants <= 0) {
      return 0;
    }

    const fill = (event.participants.length / maxParticipants) * 100;
    return Math.min(100, Math.max(0, Math.round(fill)));
  }

  getSelectedCalendarColor(): string {
    return this.calendarsEvents[this.calendarEventLevel];
  }

  selectVisualLevel(level: string): void {
    if (this.isVisualLevel(level)) {
      this.calendarEventLevel = level;
    }
  }

  private getEventVisualLevel(event: Event): CalendarVisualLevel {
    const statusLevel = this.mapStatusToLevel(event.status);
    if (statusLevel) {
      return statusLevel;
    }

    if (event.visualColor && this.isVisualLevel(event.visualColor)) {
      return event.visualColor;
    }

    return this.mapTypeToLevel(event.type);
  }

  private handleRouteEventSelection(): void {
    const eventId = this.pendingRouteEventId.trim();
    if (!eventId) {
      return;
    }

    const matchingEvent = this.events.find((event) => event.id === eventId);
    if (matchingEvent) {
      this.viewMode = 'calendar';
      this.viewEvent(matchingEvent);
      this.clearRouteEventQueryParam();
      return;
    }

    this.eventService.getEventById(eventId).subscribe({
      next: (event) => {
        if (!event) {
          this.calendarSubmissionFeedbackTone = 'error';
          this.calendarSubmissionFeedback = 'Evenement introuvable ou non autorise pour ce compte.';
          this.clearRouteEventQueryParam();
          return;
        }

        if (!this.events.some((existing) => existing.id === event.id)) {
          this.events = [event, ...this.events];
          this.updateCalendarEvents();
        }

        this.viewMode = 'calendar';
        this.viewEvent(event);
        this.clearRouteEventQueryParam();
      },
      error: () => {
        this.calendarSubmissionFeedbackTone = 'error';
        this.calendarSubmissionFeedback = 'Ouverture de l evenement impossible pour ce compte.';
        this.clearRouteEventQueryParam();
      },
    });
  }

  private clearRouteEventQueryParam(): void {
    if (!this.pendingRouteEventId) {
      return;
    }
    this.pendingRouteEventId = '';
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { eventId: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  private getLevelColor(level: CalendarVisualLevel): string {
    return this.calendarsEvents[level];
  }

  private getLevelBorderColor(level: CalendarVisualLevel): string {
    const borderColorMap: Record<CalendarVisualLevel, string> = {
      'Danger': '#fca5a5',
      'Success': '#86efac',
      'Primary': '#93c5fd',
      'Warning': '#fdba74'
    };
    return borderColorMap[level];
  }

  private getLevelTextColor(level: CalendarVisualLevel): string {
    const textColorMap: Record<CalendarVisualLevel, string> = {
      'Danger': '#9f1239',
      'Success': '#166534',
      'Primary': '#1e3a8a',
      'Warning': '#9a3412'
    };
    return textColorMap[level];
  }

  handleEventClick(clickInfo: EventClickArg): void {
    const eventId = clickInfo.event.id;
    const matchedEvent = this.events.find(event => event.id === eventId);

    if (!matchedEvent) {
      return;
    }
    this.viewEvent(matchedEvent);
  }

  handleDateClick(dateInfo: any): void {
    if (!this.canCreateEvents()) {
      return;
    }

    this.openCalendarModal(dateInfo.date, dateInfo.date);
  }

  handleDateSelect(selectInfo: DateSelectArg): void {
    if (!this.canCreateEvents()) {
      return;
    }

    const startDate = new Date(selectInfo.start);
    let endDate = selectInfo.end ? new Date(selectInfo.end) : new Date(selectInfo.start);

    if (selectInfo.allDay && selectInfo.end) {
      endDate.setDate(endDate.getDate() - 1);
    }

    if (endDate < startDate) {
      endDate = new Date(startDate);
    }

    this.openCalendarModal(startDate, endDate);
  }

  openCalendarModal(startDate?: Date, endDate?: Date): void {
    const baseStartDate = startDate || new Date();
    const baseEndDate = endDate || baseStartDate;

    this.isCalendarModalOpen = true;
    this.selectedEventForModal = null;
    this.calendarEventTitle = '';
    this.calendarEventDescription = '';
    this.calendarEventLocation = '';
    this.calendarEventMode = 'PRESENTIEL';
    this.calendarEventType = 'MEETING';
    this.calendarEventStatus = EventStatus.DRAFT;
    this.calendarEventMaxParticipants = 50;
    this.calendarEventLevel = 'Primary';
    this.calendarEventStartDate = this.formatDateForInput(baseStartDate);
    this.calendarEventEndDate = this.formatDateForInput(baseEndDate);
    this.calendarEventStartTime = this.formatTimeForInput(baseStartDate, '09:00');
    this.calendarEventEndTime = this.formatTimeForInput(baseEndDate, '18:00');
    this.calendarFormError = '';
    this.selectedCalendarRoomImageUrl = '';
    this.selectedCalendarEquipmentIds = [];
    this.resetCalendarAccessCodeState();
    this.resetCalendarPartnerInviteState();
    this.calendarSubmissionFeedback = '';
  }

  closeCalendarModal(): void {
    this.isCalendarModalOpen = false;
    this.selectedEventForModal = null;
    this.calendarEventTitle = '';
    this.calendarEventDescription = '';
    this.calendarEventLocation = '';
    this.calendarEventMode = 'PRESENTIEL';
    this.calendarEventType = 'MEETING';
    this.calendarEventStatus = EventStatus.DRAFT;
    this.calendarEventMaxParticipants = 50;
    this.calendarEventLevel = 'Primary';
    this.calendarEventStartDate = '';
    this.calendarEventEndDate = '';
    this.calendarEventStartTime = '09:00';
    this.calendarEventEndTime = '18:00';
    this.calendarFormError = '';
    this.selectedCalendarRoomImageUrl = '';
    this.selectedCalendarEquipmentIds = [];
    this.resetCalendarAccessCodeState();
    this.resetCalendarPartnerInviteState();
  }

  onCalendarEventModeChange(): void {
    this.clearCalendarInviteFeedback();

    if (!this.isPhysicalMode(this.calendarEventMode)) {
      this.calendarEventLocation = '';
      this.selectedCalendarRoomImageUrl = '';
      this.selectedCalendarEquipmentIds = [];
    } else {
      this.updateSelectedCalendarRoomImage();
    }

    if (!this.isOnlineMode(this.calendarEventMode)) {
      this.resetCalendarAccessCodeState();
      this.resetCalendarPartnerInviteState();
    }
  }

  onCalendarAccessCodeToggle(): void {
    if (!this.calendarEventRequiresAccessCode) {
      this.calendarEventAccessCode = '';
    }
  }

  addCalendarPartnerEmail(): void {
    if (!this.isOnlineMode(this.calendarEventMode)) {
      this.calendarInviteFeedbackTone = 'error';
      this.calendarInviteFeedback = 'Activez d abord le mode evenement en ligne.';
      return;
    }

    if (!this.canInvitePartners()) {
      this.calendarInviteFeedbackTone = 'error';
      this.calendarInviteFeedback = 'Votre role ne peut pas inviter des partenaires externes.';
      return;
    }

    const normalizedEmail = this.normalizePartnerEmail(this.calendarPartnerInviteEmail);
    if (!normalizedEmail) {
      this.calendarInviteFeedbackTone = 'error';
      this.calendarInviteFeedback = 'Saisissez un email partenaire valide.';
      return;
    }

    if (this.calendarPartnerInvites.includes(normalizedEmail)) {
      this.calendarInviteFeedbackTone = 'error';
      this.calendarInviteFeedback = 'Ce partenaire est deja dans la liste.';
      return;
    }

    this.calendarPartnerInvites = [...this.calendarPartnerInvites, normalizedEmail];
    this.calendarPartnerInviteEmail = '';
    this.calendarInviteFeedbackTone = 'success';
    this.calendarInviteFeedback = 'Partenaire ajoute a la liste.';
  }

  removeCalendarPartnerEmail(email: string): void {
    this.calendarPartnerInvites = this.calendarPartnerInvites.filter((item) => item !== email);
    this.calendarInviteFeedbackTone = 'success';
    this.calendarInviteFeedback = 'Partenaire retire de la liste.';
  }

  previewCalendarInvitation(): void {
    if (!this.isOnlineMode(this.calendarEventMode)) {
      this.calendarInviteFeedbackTone = 'error';
      this.calendarInviteFeedback = 'Le mode evenement en ligne doit etre actif pour previsualiser.';
      return;
    }

    if (this.calendarPartnerInvites.length === 0) {
      this.calendarInviteFeedbackTone = 'error';
      this.calendarInviteFeedback = 'Ajoutez au moins un partenaire avant la previsualisation.';
      return;
    }

    const previewMessage = this.resolveCalendarInviteMessage();
    this.calendarInviteFeedbackTone = 'success';
    this.calendarInviteFeedback = `Previsualisation: ${previewMessage}`;
  }

  handleAddOrUpdateCalendarEvent(): void {
    if (!this.canCreateEvents()) {
      this.calendarFormError = 'Votre role ne peut pas creer ou modifier des evenements.';
      return;
    }

    const isUpdateMode = !!this.selectedEventForModal;
    this.calendarSubmissionFeedback = '';
    this.calendarSubmissionFeedbackTone = 'success';

    const title = this.calendarEventTitle.trim();
    const location = this.calendarEventLocation.trim();
    const description = this.calendarEventDescription.trim();
    const eventMode = this.calendarEventMode;
    const onlineEvent = this.isOnlineMode(eventMode);
    const requiresPhysicalLocation = this.isPhysicalMode(eventMode);
    const startDate = this.toEventDate(this.calendarEventStartDate, this.calendarEventStartTime);
    const endDate = this.toEventDate(this.calendarEventEndDate, this.calendarEventEndTime);
    const maxParticipants = Number(this.calendarEventMaxParticipants);
    const accessCode = this.calendarEventAccessCode.trim();

    if (!title) {
      this.calendarFormError = 'Le titre est obligatoire.';
      return;
    }

    if (requiresPhysicalLocation && !location) {
      this.calendarFormError = 'Le lieu est obligatoire.';
      return;
    }

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      this.calendarFormError = 'Veuillez selectionner des dates et heures valides.';
      return;
    }

    if (endDate < startDate) {
      this.calendarFormError = 'La date/heure de fin doit etre superieure ou egale a la date/heure de debut.';
      return;
    }

    const now = new Date();
    if (startDate <= now) {
      this.calendarFormError = 'La date de debut doit etre dans le futur.';
      return;
    }

    if (!Number.isFinite(maxParticipants) || maxParticipants < 1) {
      this.calendarFormError = 'Le nombre maximal de participants doit etre au moins 1.';
      return;
    }

    if (onlineEvent && this.calendarPartnerInvites.length > 0 && !this.canInvitePartners()) {
      this.calendarFormError = 'Votre role ne peut pas inviter des partenaires externes.';
      return;
    }

    if (onlineEvent && this.calendarEventRequiresAccessCode && !accessCode) {
      this.calendarFormError = 'Le code spécial est obligatoire pour accéder à l’événement.';
      return;
    }

    this.calendarFormError = '';
    const resolvedLocation = eventMode === 'EN_LIGNE' ? 'En ligne' : location;

    const eventToSave: Omit<Event, 'id' | 'createdAt' | 'updatedAt'> = {
      title,
      description,
      location: resolvedLocation,
      eventMode,
      onlineEvent,
      onlineMeetingProvider: onlineEvent ? 'Jitsi' : undefined,
      onlineMeetingUrl: undefined,
      onlineMeetingPassword: onlineEvent && this.calendarEventRequiresAccessCode ? accessCode : undefined,
      type: this.calendarEventType,
      visualColor: this.calendarEventLevel,
      status: this.canApproveEvents() ? this.calendarEventStatus : EventStatus.DRAFT,
      startDate,
      endDate,
      participants: this.selectedEventForModal?.participants || [],
      maxParticipants,
      organiserId: this.selectedEventForModal?.organiserId || this.currentUsername || this.currentUserId,
      organiserName: this.selectedEventForModal?.organiserName || this.currentUserName
    };

    const saveRequest$ = this.selectedEventForModal
      ? this.eventService.updateEvent(this.selectedEventForModal.id, eventToSave)
      : this.eventService.createEvent(eventToSave);

    saveRequest$.pipe(
      switchMap((savedEvent) => {
        if (!savedEvent) {
          return of(null);
        }

        return this.ensureRoomReservationBeforeSubmit(savedEvent).pipe(
          switchMap((roomPreparedEvent) => this.ensureEquipmentReservationsBeforeSubmit(roomPreparedEvent)),
          switchMap((preparedEvent) => {
            const shouldSubmitAfterCreate =
              !isUpdateMode
              && preparedEvent.status === EventStatus.DRAFT
              && this.canSubmitEvent(preparedEvent);

            if (!shouldSubmitAfterCreate) {
              return of(preparedEvent);
            }

            return this.eventService.submitEvent(
              preparedEvent.id,
              'Soumission depuis l interface utilisateur'
            );
          })
        );
      })
    ).subscribe({
      next: (savedEvent) => {
        if (!savedEvent) {
          this.calendarFormError = 'Evenement introuvable, veuillez rafraichir puis reessayer.';
          return;
        }

        this.dispatchCalendarPartnerInvitations(savedEvent).subscribe({
          next: (dispatchResult) => {
            this.loadEvents();
            this.closeCalendarModal();
            this.calendarSubmissionFeedbackTone = dispatchResult.failedCount === 0 ? 'success' : 'error';
            this.calendarSubmissionFeedback = this.buildCalendarSubmissionFeedback(isUpdateMode, dispatchResult);
          },
          error: () => {
            this.loadEvents();
            this.closeCalendarModal();
            this.calendarSubmissionFeedbackTone = 'error';
            this.calendarSubmissionFeedback = isUpdateMode
              ? 'Evenement mis a jour, mais l envoi des invitations partenaires a echoue.'
              : 'Evenement cree, mais l envoi des invitations partenaires a echoue.';
          }
        });
      },
      error: (error) => {
        this.calendarFormError = this.extractBackendError(
          error,
          isUpdateMode
            ? 'Impossible de modifier cet evenement pour le moment.'
            : 'Impossible de creer cet evenement pour le moment.'
        );
      }
    });
  }

  getModalDateHint(): string {
    if (!this.calendarEventStartDate) {
      return 'Aucune date selectionnee';
    }

    const startLabel = `${this.formatDateLabel(this.calendarEventStartDate)} ${this.calendarEventStartTime || '--:--'}`;
    if (!this.calendarEventEndDate) {
      return startLabel;
    }

    const endLabel = `${this.formatDateLabel(this.calendarEventEndDate)} ${this.calendarEventEndTime || '--:--'}`;
    if (this.calendarEventEndDate === this.calendarEventStartDate) {
      return `${this.formatDateLabel(this.calendarEventStartDate)} ${this.calendarEventStartTime || '--:--'} - ${this.calendarEventEndTime || '--:--'}`;
    }

    return `${startLabel} - ${endLabel}`;
  }

  private formatDateForInput(date: Date): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private formatTimeForInput(date: Date, fallbackTime: string): string {
    if (Number.isNaN(date.getTime())) {
      return fallbackTime;
    }

    const hours = date.getHours();
    const minutes = date.getMinutes();
    if (hours === 0 && minutes === 0) {
      return fallbackTime;
    }

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  private toEventDate(dateValue: string, timeValue: string): Date {
    if (!dateValue || !timeValue) {
      return new Date(Number.NaN);
    }

    const parsed = new Date(`${dateValue}T${timeValue}:00`);
    return Number.isNaN(parsed.getTime()) ? new Date(Number.NaN) : parsed;
  }

  private extractBackendError(error: unknown, fallbackMessage: string): string {
    if (error instanceof Error && error.message) {
      return error.message;
    }

    const candidate = error as { error?: { detail?: string; message?: string } } | null;
    return candidate?.error?.detail || candidate?.error?.message || fallbackMessage;
  }

  private dispatchCalendarPartnerInvitations(event: Event) {
    const uniqueEmails = Array.from(new Set(
      this.calendarPartnerInvites
        .map((email) => this.normalizePartnerEmail(email))
        .filter((email): email is string => !!email)
    ));

    if (!this.isOnlineMode(this.getResolvedEventMode(event)) || !this.canInvitePartners() || uniqueEmails.length === 0) {
      return of({
        sentCount: 0,
        failedCount: 0,
        failedEmails: []
      } satisfies CalendarPartnerInviteDispatchResult);
    }

    const invitationMessage = this.resolveCalendarInviteMessage(event.title);
    const inviteRequests = uniqueEmails.map((email) =>
      this.invitationService.sendInvitation({
        eventId: event.id,
        eventTitle: event.title,
        eventDate: event.startDate,
        eventLocation: event.location,
        recipientId: `${event.id}:${email}`,
        recipientEmail: email,
        recipientName: this.buildPartnerNameFromEmail(email),
        senderId: this.currentUserId,
        senderName: this.currentUserName,
        status: InvitationStatus.PENDING,
        respondedAt: undefined,
        message: invitationMessage,
        responseReason: undefined,
        isExternalPartner: true,
        isVerifiedByDsn: false,
        verifiedBy: undefined,
        verifiedAt: undefined,
        partnerOrganization: undefined
      }).pipe(
        map(() => ({ email, ok: true as const })),
        catchError(() => of({ email, ok: false as const }))
      )
    );

    return forkJoin(inviteRequests).pipe(
      map((results) => {
        const failedEmails = results.filter((result) => !result.ok).map((result) => result.email);
        return {
          sentCount: results.length - failedEmails.length,
          failedCount: failedEmails.length,
          failedEmails
        } satisfies CalendarPartnerInviteDispatchResult;
      })
    );
  }

  private buildCalendarSubmissionFeedback(
    isUpdateMode: boolean,
    dispatchResult: CalendarPartnerInviteDispatchResult
  ): string {
    const baseMessage = isUpdateMode
      ? 'Evenement mis a jour avec succes.'
      : 'Evenement cree avec succes.';

    if (dispatchResult.sentCount === 0 && dispatchResult.failedCount === 0) {
      return `${baseMessage} Aucun partenaire externe a inviter.`;
    }

    if (dispatchResult.failedCount === 0) {
      return `${baseMessage} ${dispatchResult.sentCount} invitation(s) partenaire envoyee(s).`;
    }

    const compactFailures = dispatchResult.failedEmails.slice(0, 3).join(', ');
    const suffix = dispatchResult.failedEmails.length > 3 ? ', ...' : '';
    return `${baseMessage} ${dispatchResult.sentCount} invitation(s) envoyee(s), ${dispatchResult.failedCount} echec(s): ${compactFailures}${suffix}.`;
  }

  private resolveCalendarInviteMessage(eventTitle?: string): string {
    const customMessage = this.calendarPartnerInviteMessage.trim();
    if (customMessage) {
      return customMessage;
    }

    const safeTitle = (eventTitle || this.calendarEventTitle.trim() || 'notre evenement').trim();
    const dateHint = this.calendarEventStartDate
      ? ` prevu le ${this.formatDateLabel(this.calendarEventStartDate)}`
      : '';
    const accessCode = this.calendarEventRequiresAccessCode ? this.calendarEventAccessCode.trim() : '';
    const accessCodeHint = accessCode ? ` Code d'accès: ${accessCode}.` : '';

    return `Bonjour, nous avons le plaisir de vous inviter a participer a ${safeTitle}${dateHint}.${accessCodeHint}`;
  }

  private resetCalendarPartnerInviteState(): void {
    this.calendarPartnerInviteEmail = '';
    this.calendarPartnerInvites = [];
    this.calendarPartnerInviteMessage = '';
    this.clearCalendarInviteFeedback();
  }

  private resetCalendarAccessCodeState(): void {
    this.calendarEventRequiresAccessCode = false;
    this.calendarEventAccessCode = '';
  }

  private clearCalendarInviteFeedback(): void {
    this.calendarInviteFeedback = '';
    this.calendarInviteFeedbackTone = 'success';
  }

  private normalizePartnerEmail(value: string): string | null {
    const normalized = value.trim().toLowerCase();
    if (!normalized) {
      return null;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    return emailPattern.test(normalized) ? normalized : null;
  }

  private buildPartnerNameFromEmail(email: string): string {
    const localPart = email.split('@')[0]?.trim() || '';
    const parts = localPart
      .split(/[._-]+/)
      .map((segment) => segment.trim())
      .filter((segment) => !!segment);

    if (parts.length === 0) {
      return 'Partenaire Externe';
    }

    return parts
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join(' ');
  }

  private formatDateLabel(dateString: string): string {
    const parsedDate = new Date(`${dateString}T00:00:00`);
    return parsedDate.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  private mapTypeToLevel(type: Event['type']): CalendarVisualLevel {
    if (type === 'CONFERENCE') {
      return 'Primary';
    }
    if (type === 'TRAINING') {
      return 'Success';
    }
    if (type === 'WORKSHOP') {
      return 'Danger';
    }
    return 'Warning';
  }

  private mapStatusToLevel(status: EventStatus): CalendarVisualLevel | null {
    if (status === EventStatus.PUBLISHED) {
      return 'Success';
    }
    if (status === EventStatus.CANCELLED) {
      return 'Danger';
    }
    if (status === EventStatus.SUBMITTED) {
      return 'Warning';
    }
    if (status === EventStatus.DRAFT || status === EventStatus.COMPLETED) {
      return 'Primary';
    }
    return null;
  }

  private isVisualLevel(level: string): level is CalendarVisualLevel {
    return Object.prototype.hasOwnProperty.call(this.calendarsEvents, level);
  }

  private applyEventVisualStyles(arg: any): void {
    const eventId = arg?.event?.id;
    if (!eventId) {
      return;
    }

    const matchedEvent = this.events.find(event => event.id === eventId);
    if (!matchedEvent) {
      return;
    }

    const visualLevel = this.getEventVisualLevel(matchedEvent);
    const bgColor = this.getLevelColor(visualLevel);
    const borderColor = this.getLevelBorderColor(visualLevel);
    const textColor = this.getLevelTextColor(visualLevel);

    const el = arg.el as HTMLElement;
    el.style.setProperty('background-color', bgColor, 'important');
    el.style.setProperty('border-color', borderColor, 'important');
    el.style.setProperty('color', textColor, 'important');

    const eventMain = el.querySelector('.fc-event-main') as HTMLElement | null;
    if (eventMain) {
      eventMain.style.setProperty('color', textColor, 'important');
    }

    const modeBadge = el.querySelector('.calendar-event-meta-badge--mode') as HTMLElement | null;
    const statusBadge = el.querySelector('.calendar-event-meta-badge--status') as HTMLElement | null;
    if (modeBadge) {
      modeBadge.style.setProperty('background-color', 'rgba(255,255,255,0.8)', 'important');
      modeBadge.style.setProperty('border-color', 'rgba(100,116,139,0.35)', 'important');
      modeBadge.style.setProperty('color', textColor, 'important');
    }
    if (statusBadge) {
      statusBadge.style.setProperty('background-color', 'rgba(248,250,252,0.95)', 'important');
      statusBadge.style.setProperty('border-color', 'rgba(100,116,139,0.35)', 'important');
      statusBadge.style.setProperty('color', textColor, 'important');
    }

    const tooltipTitle = [
      matchedEvent.title,
      this.getEventDateRangeLabel(matchedEvent),
      `${this.getEventModeLabel(matchedEvent)} • ${this.getEventStatusLabel(matchedEvent.status)}`,
    ].join('\n');
    el.setAttribute('title', tooltipTitle);
  }

  private renderCalendarEventContent(arg: EventContentArg): { html: string } {
    const mode = (arg.event.extendedProps?.['modeLabel'] as string | undefined) || 'Presentiel';
    const status = this.getShortCalendarStatusLabel((arg.event.extendedProps?.['statusLabel'] as string | undefined) || 'BROUILLON');
    const time = this.formatCalendarTimeRange(arg.event.start ?? undefined, arg.event.end ?? undefined);
    const title = this.escapeHtml(this.truncateCalendarTitle(arg.event.title || 'Evenement'));

    return {
      html: `
        <div class="calendar-event-card">
          <div class="calendar-event-title">${title}</div>
          <div class="calendar-event-time">${this.escapeHtml(time)}</div>
          <div class="calendar-event-meta">
            <span class="calendar-event-meta-badge calendar-event-meta-badge--mode">${this.escapeHtml(mode)}</span>
            <span class="calendar-event-meta-badge calendar-event-meta-badge--status">${this.escapeHtml(status)}</span>
          </div>
        </div>
      `
    };
  }

  private formatCalendarTimeRange(start?: Date, end?: Date): string {
    if (!start) {
      return '';
    }

    const startLabel = start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    if (!end) {
      return startLabel;
    }

    const endLabel = end.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    return `${startLabel} - ${endLabel}`;
  }

  private truncateCalendarTitle(value: string): string {
    const compact = value.trim();
    if (compact.length <= 34) {
      return compact;
    }
    return `${compact.slice(0, 31)}...`;
  }

  private getShortCalendarStatusLabel(label: string): string {
    const normalized = label.toUpperCase();
    if (normalized.includes('PUBLIE')) {
      return 'Publie';
    }
    if (normalized.includes('SOUMIS')) {
      return 'Attente';
    }
    if (normalized.includes('ANNULE')) {
      return 'Annule';
    }
    if (normalized.includes('TERMINE')) {
      return 'Termine';
    }
    return 'Brouillon';
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  viewEvent(event: Event): void {
    this.selectedEvent = event;
    this.clearOnlineJoinFeedback();
    this.resetInternalInviteState();
    this.inviteFeedback = '';
    this.inviteFeedbackTone = 'success';
  }

  editEvent(event: Event): void {
    if (!this.canEditEvent(event)) {
      return;
    }

    this.selectedEventForModal = event;
    this.calendarEventTitle = event.title;
    this.calendarEventDescription = event.description || '';
    this.calendarEventLocation = event.location || '';
    this.calendarEventMode = this.getResolvedEventMode(event);
    if (!this.isPhysicalMode(this.calendarEventMode)) {
      this.calendarEventLocation = '';
    }
    this.calendarEventRequiresAccessCode = !!event.onlineMeetingPassword;
    this.calendarEventAccessCode = event.onlineMeetingPassword || '';
    this.calendarEventType = event.type || 'MEETING';
    this.calendarEventStatus = event.status || EventStatus.DRAFT;
    this.calendarEventMaxParticipants = event.maxParticipants || 50;
    this.calendarEventStartDate = this.formatDateForInput(new Date(event.startDate));
    this.calendarEventEndDate = this.formatDateForInput(new Date(event.endDate));
    this.calendarEventStartTime = this.formatTimeForInput(new Date(event.startDate), '09:00');
    this.calendarEventEndTime = this.formatTimeForInput(new Date(event.endDate), '18:00');
    this.calendarEventLevel = this.getEventVisualLevel(event);
    this.updateSelectedCalendarRoomImage();
    this.selectedCalendarEquipmentIds = [];
    this.calendarFormError = '';
    this.resetCalendarPartnerInviteState();
    this.calendarSubmissionFeedback = '';
    this.isCalendarModalOpen = true;
    this.selectedEvent = null;
    this.clearOnlineJoinFeedback();
    this.resetInternalInviteState();
    this.inviteFeedback = '';
    this.inviteFeedbackTone = 'success';
  }

  getEventStatusLabel(status: EventStatus): string {
    if (status === EventStatus.DRAFT) {
      return 'BROUILLON';
    }

    if (status === EventStatus.SUBMITTED) {
      return 'SOUMIS';
    }

    if (status === EventStatus.PUBLISHED) {
      return 'PUBLIE';
    }

    if (status === EventStatus.CANCELLED) {
      return 'ANNULE';
    }

    return 'TERMINE';
  }

  getEventModeText(mode: EventMode): string {
    if (mode === 'PRESENTIEL') {
      return 'Presentiel';
    }
    if (mode === 'EN_LIGNE') {
      return 'En ligne';
    }
    return 'Hybride';
  }

  getResolvedEventMode(event: Event | null | undefined): EventMode {
    if (event?.eventMode === 'PRESENTIEL' || event?.eventMode === 'EN_LIGNE' || event?.eventMode === 'HYBRIDE') {
      return event.eventMode;
    }
    return event?.onlineEvent ? 'EN_LIGNE' : 'PRESENTIEL';
  }

  isOnlineMode(mode: EventMode): boolean {
    return mode !== 'PRESENTIEL';
  }

  isPhysicalMode(mode: EventMode): boolean {
    return mode !== 'EN_LIGNE';
  }

  isEventOnlineOnly(event: Event | null | undefined): boolean {
    return this.getResolvedEventMode(event) === 'EN_LIGNE';
  }

  getEventModeLabel(event: Event | null | undefined): string {
    return this.getEventModeText(this.getResolvedEventMode(event));
  }

  canOpenOnlineMeeting(event: Event | null | undefined): boolean {
    return !!event && this.isOnlineMode(this.getResolvedEventMode(event));
  }

  getOnlineJoinUnavailableReason(event: Event | null | undefined): string {
    if (!event) {
      return 'Evenement non selectionne.';
    }

    if (!this.isOnlineMode(this.getResolvedEventMode(event))) {
      return 'Evenement presentiel: aucun lien en ligne.';
    }

    return 'Salle virtuelle indisponible.';
  }

  canCreateEvents(): boolean {
    return this.authService.hasPermission('CREATE_EVENT');
  }

  canApproveEvents(): boolean {
    return this.authService.hasPermission('VALIDATE_EVENT');
  }

  canReviewWorkflowEvents(): boolean {
    return this.canApproveEvents() || this.currentRole === 'SECURITY_MANAGER' || this.currentRole === 'ROOM_MANAGER';
  }

  canDecideEvent(event: Event | null | undefined): boolean {
    if (!event || !event.workflowStep) {
      return false;
    }

    if (this.currentRole === 'ADMIN') {
      return ['VALIDATION_MANAGER', 'VALIDATION_SECURITE', 'VALIDATION_DSN', 'VALIDATION_SALLE'].includes(event.workflowStep);
    }

    if (this.currentRole === 'MANAGER') {
      return event.workflowStep === 'VALIDATION_MANAGER';
    }

    if (this.currentRole === 'SECURITY_MANAGER') {
      return event.workflowStep === 'VALIDATION_SECURITE';
    }

    if (this.currentRole === 'DSN_DIRECTOR') {
      return event.workflowStep === 'VALIDATION_DSN';
    }

    if (this.currentRole === 'ROOM_MANAGER') {
      return event.workflowStep === 'VALIDATION_SALLE';
    }

    return false;
  }

  canInvitePartners(): boolean {
    // Accept both English and French role names
    // Directeur DSN only validates, doesn't invite partners
    return ['EMPLOYEE', 'EMPLOYE', 'MANAGER', 'CHEF_HIERARCHIQUE', 'ADMIN'].includes(this.currentRole);
  }

  canEditEvent(event: Event): boolean {
    if (this.isCurrentUserAdmin()) {
      return true;
    }

    return this.isEventOwnedByCurrentUser(event);
  }

  canSubmitEvent(event: Event | null | undefined): boolean {
    if (!event) {
      return false;
    }

    if (event.status !== EventStatus.DRAFT) {
      return false;
    }

    return this.isEventOwnedByCurrentUser(event);
  }

  canDownloadEventPdf(event: Event | null | undefined): boolean {
    if (!event) {
      return false;
    }

    return event.status !== EventStatus.DRAFT;
  }

  getPdfUnavailableReason(event: Event | null | undefined): string {
    if (!event) {
      return 'Evenement non selectionne.';
    }

    if (event.status === EventStatus.DRAFT) {
      return 'PDF disponible apres soumission du workflow.';
    }

    return 'Document officiel indisponible pour cet evenement.';
  }

  openEventInCalendar(event: Event): void {
    this.viewMode = 'calendar';
    this.viewEvent(event);
  }

  private isCurrentUserAdmin(): boolean {
    return this.currentRole === 'ADMIN';
  }

  private isEventOwnedByCurrentUser(event: Event): boolean {
    const organiserId = (event.organiserId || '').trim().toLowerCase();
    if (!organiserId) {
      return false;
    }

    const currentCandidates = [
      this.currentUserId,
      this.currentUsername,
    ]
      .map((value) => (value || '').trim().toLowerCase())
      .filter((value) => !!value);

    return currentCandidates.includes(organiserId);
  }

  submitEvent(event: Event | null | undefined): void {
    if (!this.canSubmitEvent(event) || !event) {
      this.calendarSubmissionFeedbackTone = 'error';
      this.calendarSubmissionFeedback = 'Soumission impossible: vous devez etre l organisateur du brouillon.';
      return;
    }

    this.ensureRoomReservationBeforeSubmit(event).pipe(
      switchMap((preparedEvent) =>
        this.eventService.submitEvent(preparedEvent.id, 'Soumission depuis l interface utilisateur')
      )
    ).subscribe({
      next: (updated) => {
        if (!updated) {
          return;
        }
        this.loadEvents();
        if (this.selectedEvent?.id === event.id) {
          this.selectedEvent = updated;
        }
      },
      error: (err) => {
        this.calendarSubmissionFeedbackTone = 'error';
        this.calendarSubmissionFeedback = this.extractBackendError(err, 'Soumission impossible pour le moment.');
      }
    });
  }

  private ensureRoomReservationBeforeSubmit(event: Event) {
    if (!this.isPhysicalMode(this.getResolvedEventMode(event))) {
      return of(event);
    }

    const roomLookup$ = this.rooms.length > 0
      ? of(this.findRoomForEvent(event))
      : this.reservationService.getRooms().pipe(
          map((rooms) => {
            this.rooms = Array.isArray(rooms) ? rooms : [];
            return this.findRoomForEvent(event);
          })
        );

    return roomLookup$.pipe(
      switchMap((room) => {
        if (!room) {
          return throwError(() => new Error('Selectionnez une salle existante du referentiel avant de soumettre cet evenement.'));
        }

        return this.reservationService.getRoomReservations({ eventId: event.id, size: 100 }).pipe(
          switchMap((reservations) => {
            const hasRoomReservation = reservations.some((reservation) =>
              reservation.roomId === room.id
              && (reservation.status === 'PENDING' || reservation.status === 'APPROVED')
            );

            if (hasRoomReservation) {
              return of(event);
            }

            return this.reservationService.bookRoom({
              eventId: event.id,
              roomId: room.id,
              roomName: room.name,
              userId: this.currentUsername || this.currentUserId,
              userName: this.currentUserName || this.currentUsername || this.currentUserId,
              title: event.title,
              purpose: `Reservation salle pour evenement ${event.referenceCode || event.title}`,
              startDate: event.startDate,
              endDate: event.endDate,
              attendeeCount: event.maxParticipants || 1,
            }).pipe(
              switchMap((reservation) => {
                if (!reservation) {
                  return throwError(() => new Error('La salle selectionnee est deja reservee sur ce creneau.'));
                }

                return of(event);
              })
            );
          })
        );
      })
    );
  }

  private findRoomForEvent(event: Event): Room | undefined {
    const normalizedLocation = this.normalizeRoomLookup(event.location);

    return this.rooms.find((room) => {
      const candidates = [
        room.id,
        room.name,
        `${room.name} (${room.location})`,
        room.location,
      ].map((value) => this.normalizeRoomLookup(value));

      return candidates.includes(normalizedLocation);
    });
  }

  private ensureEquipmentReservationsBeforeSubmit(event: Event) {
    if (!this.isPhysicalMode(this.getResolvedEventMode(event)) || this.selectedCalendarEquipmentIds.length === 0) {
      return of(event);
    }

    return this.reservationService.getEquipmentReservations({ eventId: event.id, size: 100 }).pipe(
      switchMap((reservations) => {
        const activeReservations = reservations.filter((reservation) =>
          reservation.status === 'PENDING' || reservation.status === 'APPROVED' || reservation.status === 'IN_USE'
        );

        const missingEquipmentIds = this.selectedCalendarEquipmentIds.filter((equipmentId) =>
          !activeReservations.some((reservation) => reservation.equipmentId === equipmentId)
        );

        if (missingEquipmentIds.length === 0) {
          return of(event);
        }

        const requests = missingEquipmentIds.map((equipmentId) => {
          const equipment = this.equipment.find((item) => item.id === equipmentId);
          return this.reservationService.reserveEquipment({
            eventId: event.id,
            equipmentId,
            equipmentName: equipment?.name || 'Equipement',
            quantityRequested: 1,
            userId: this.currentUsername || this.currentUserId,
            userName: this.currentUserName || this.currentUsername || this.currentUserId,
            purpose: `Equipement pour evenement ${event.referenceCode || event.title}`,
            startDate: event.startDate,
            endDate: event.endDate,
          });
        });

        return forkJoin(requests).pipe(
          switchMap((createdReservations) => {
            if (createdReservations.some((reservation) => !reservation)) {
              return throwError(() => new Error('Un equipement selectionne est indisponible sur ce creneau.'));
            }
            return of(event);
          })
        );
      })
    );
  }

  private normalizeRoomLookup(value: string | undefined): string {
    return (value || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  updateSelectedCalendarRoomImage(): void {
    if (!this.isPhysicalMode(this.calendarEventMode)) {
      this.selectedCalendarRoomImageUrl = '';
      return;
    }

    const normalizedLocation = this.normalizeRoomLookup(this.calendarEventLocation);
    const room = this.rooms.find((candidate) => {
      const candidates = [
        candidate.id,
        candidate.name,
        `${candidate.name} (${candidate.location})`,
        candidate.location,
      ].map((value) => this.normalizeRoomLookup(value));

      return candidates.includes(normalizedLocation);
    });

    this.selectedCalendarRoomImageUrl = room?.imageUrl || '';
  }

  isCalendarEquipmentSelected(equipmentId: string): boolean {
    return this.selectedCalendarEquipmentIds.includes(equipmentId);
  }

  toggleCalendarEquipment(equipmentId: string, selected: boolean): void {
    if (selected) {
      if (!this.selectedCalendarEquipmentIds.includes(equipmentId)) {
        this.selectedCalendarEquipmentIds = [...this.selectedCalendarEquipmentIds, equipmentId];
      }
      return;
    }

    this.selectedCalendarEquipmentIds = this.selectedCalendarEquipmentIds.filter((id) => id !== equipmentId);
  }

  downloadEventPdf(event: Event | null | undefined): void {
    if (!event || !this.canDownloadEventPdf(event)) {
      this.calendarSubmissionFeedbackTone = 'error';
      this.calendarSubmissionFeedback = this.getPdfUnavailableReason(event);
      return;
    }

    this.eventService.downloadLatestOfficialDocument(event.id).subscribe({
      next: () => {
        this.calendarSubmissionFeedback = `PDF officiel telecharge pour ${event.referenceCode || event.title}.`;
        this.calendarSubmissionFeedbackTone = 'success';
      },
      error: () => {
        this.calendarSubmissionFeedback = 'Aucun PDF officiel disponible pour cet evenement.';
        this.calendarSubmissionFeedbackTone = 'error';
      }
    });
  }

  openPhotoAlbum(event: Event | null | undefined): void {
    if (!event) {
      return;
    }
    void this.router.navigate(['/events', event.id, 'album']);
  }

  openInternalMeeting(event: Event | null | undefined): void {
    if (!event || !this.isOnlineMode(this.getResolvedEventMode(event))) {
      this.onlineJoinFeedbackTone = 'error';
      this.onlineJoinFeedback = 'Cet evenement est presentiel. Aucune salle virtuelle disponible.';
      return;
    }
    void this.router.navigate(['/events', event.id, 'meeting']);
  }

  closeEventDetails(): void {
    this.clearOnlineJoinFeedback();
    this.resetInternalInviteState();
    this.selectedEvent = null;
    this.inviteFeedback = '';
    this.inviteFeedbackTone = 'success';
  }

  addInternalRecipient(): void {
    const username = this.internalInviteRecipient.username.trim();
    const name = this.internalInviteRecipient.name.trim();
    const email = this.normalizePartnerEmail(this.internalInviteRecipient.email) || '';

    if (!username || !name || !email) {
      this.internalInviteFeedbackTone = 'error';
      this.internalInviteFeedback = 'Nom utilisateur, nom complet et email valide sont obligatoires.';
      return;
    }

    const alreadyExists = this.internalInviteRecipients.some((recipient) =>
      recipient.username.toLowerCase() === username.toLowerCase() || recipient.email.toLowerCase() === email.toLowerCase(),
    );
    if (alreadyExists) {
      this.internalInviteFeedbackTone = 'error';
      this.internalInviteFeedback = 'Ce destinataire est deja ajoute.';
      return;
    }

    this.internalInviteRecipients = [
      ...this.internalInviteRecipients,
      { username, email, name },
    ];
    this.internalInviteRecipient = { username: '', email: '', name: '' };
    this.internalInviteFeedbackTone = 'success';
    this.internalInviteFeedback = 'Destinataire ajoute.';
  }

  removeInternalRecipient(username: string): void {
    this.internalInviteRecipients = this.internalInviteRecipients.filter((recipient) => recipient.username !== username);
    this.internalInviteFeedbackTone = 'success';
    this.internalInviteFeedback = 'Destinataire retire.';
  }

  sendInternalInvitations(event: Event): void {
    if (this.internalInviteRecipients.length === 0) {
      this.internalInviteFeedbackTone = 'error';
      this.internalInviteFeedback = 'Ajoutez au moins un destinataire avant envoi.';
      return;
    }

    this.isSendingInternalInvites = true;
    this.internalInviteFeedback = '';
    const recipients = this.internalInviteRecipients.map((recipient) => ({
      userId: recipient.username,
      email: recipient.email,
      name: recipient.name,
    }));

    this.invitationService.sendBulkInvitations(
      event.id,
      recipients,
      this.currentUserId,
      this.currentUserName,
      this.internalInviteMessage,
    ).subscribe({
      next: (created) => {
        this.isSendingInternalInvites = false;
        if (!created || created.length === 0) {
          this.internalInviteFeedbackTone = 'error';
          this.internalInviteFeedback = 'Aucune invitation creee.';
          return;
        }
        this.internalInviteFeedbackTone = 'success';
        this.internalInviteFeedback = `${created.length} invitation(s) employee envoyee(s).`;
        this.internalInviteRecipients = [];
        this.internalInviteMessage = '';
      },
      error: (error) => {
        this.isSendingInternalInvites = false;
        this.internalInviteFeedbackTone = 'error';
        this.internalInviteFeedback = this.extractBackendError(error, 'Envoi des invitations impossible.');
      },
    });
  }

  private clearOnlineJoinFeedback(): void {
    this.onlineJoinFeedback = '';
    this.onlineJoinFeedbackTone = 'success';
  }

  private resetInternalInviteState(): void {
    this.internalInviteRecipient = { username: '', email: '', name: '' };
    this.internalInviteRecipients = [];
    this.internalInviteMessage = '';
    this.internalInviteFeedback = '';
    this.internalInviteFeedbackTone = 'success';
    this.isSendingInternalInvites = false;
  }

  approveEvent(event: Event): void {
    if (!this.canDecideEvent(event)) {
      this.calendarSubmissionFeedbackTone = 'error';
      this.calendarSubmissionFeedback = 'Validation non autorisee pour votre role ou cette etape.';
      return;
    }

    this.eventService.changeEventStatus(event.id, EventStatus.PUBLISHED).subscribe({
      next: (updated) => {
        this.loadEvents();
        if (this.selectedEvent?.id === event.id) {
          this.selectedEvent = { ...event, status: EventStatus.PUBLISHED };
        }
      },
      error: (err) => {
        this.calendarSubmissionFeedbackTone = 'error';
        this.calendarSubmissionFeedback = this.extractBackendError(err, 'Validation impossible pour le moment.');
      }
    });
  }

  rejectEvent(event: Event): void {
    if (!this.canDecideEvent(event)) {
      this.calendarSubmissionFeedbackTone = 'error';
      this.calendarSubmissionFeedback = 'Refus non autorise pour votre role ou cette etape.';
      return;
    }

    this.eventService.changeEventStatus(event.id, EventStatus.CANCELLED).subscribe({
      next: (updated) => {
        this.loadEvents();
        if (this.selectedEvent?.id === event.id) {
          this.selectedEvent = { ...event, status: EventStatus.CANCELLED };
        }
      },
      error: (err) => {
        this.calendarSubmissionFeedbackTone = 'error';
        this.calendarSubmissionFeedback = this.extractBackendError(err, 'Refus impossible pour le moment.');
      }
    });
  }

  sendPartnerInvitation(event: Event): void {
    if (!this.canInvitePartners()) {
      return;
    }

    const name = this.partnerInvite.name.trim();
    const email = this.partnerInvite.email.trim().toLowerCase();

    if (!name || !email) {
      this.inviteFeedbackTone = 'error';
      this.inviteFeedback = 'Le nom et l email du partenaire sont obligatoires.';
      return;
    }

    this.invitationService.sendInvitation({
      eventId: event.id,
      eventTitle: event.title,
      eventDate: event.startDate,
      eventLocation: event.location,
      recipientId: `partner-${Date.now()}`,
      recipientEmail: email,
      recipientName: name,
      senderId: this.currentUserId,
      senderName: this.currentUserName,
      status: InvitationStatus.PENDING,
      respondedAt: undefined,
      message: this.partnerInvite.message.trim() || `Invitation partenaire envoyee par ${this.currentUserName}`,
      responseReason: undefined,
      isExternalPartner: true,
      isVerifiedByDsn: false,
      verifiedBy: undefined,
      verifiedAt: undefined,
      partnerOrganization: this.partnerInvite.organization.trim() || undefined
    }).subscribe({
      next: () => {
        this.inviteFeedbackTone = 'success';
        this.inviteFeedback = 'Invitation partenaire envoyee. En attente de verification DSN.';
        this.partnerInvite = {
          name: '',
          email: '',
          organization: '',
          message: ''
        };
      },
      error: () => {
        this.inviteFeedbackTone = 'error';
        this.inviteFeedback = 'Envoi impossible pour le moment. Verifiez les droits ou la disponibilite du service.';
      },
    });
  }

  private getSortQueryParam(): string {
    if (this.sortMode === 'title') {
      return 'title,asc';
    }
    if (this.sortMode === 'status') {
      return 'status,asc';
    }
    return 'startAt,desc';
  }
}
