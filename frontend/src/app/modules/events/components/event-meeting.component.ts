import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { EventMeeting } from '../../../core/models';
import { EventService } from '../../../core/services/event.service';

@Component({
  selector: 'app-event-meeting',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="mx-auto max-w-6xl space-y-5 px-4 py-6">
      <a routerLink="/events" class="inline-flex rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300">
        Retour aux evenements
      </a>

      <section class="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
        <p class="text-xs font-semibold uppercase tracking-wide text-brand-600 dark:text-brand-300">Salle virtuelle</p>
        <h1 class="mt-1 text-2xl font-bold text-gray-900 dark:text-white/90">{{ meeting?.title || 'Evenement' }}</h1>
        <p class="mt-2 text-sm text-gray-600 dark:text-gray-300" *ngIf="meeting">
          {{ meeting.startAt | date:'short' }} - {{ meeting.endAt | date:'short' }}
        </p>
      </section>

      <section *ngIf="isLoading" class="rounded-2xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-600 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-300">
        Chargement de la salle virtuelle...
      </section>

      <section *ngIf="!isLoading && errorMessage" class="rounded-2xl border border-error-300 bg-error-50 p-5 text-sm text-error-700 dark:border-error-500/40 dark:bg-error-500/10 dark:text-error-300">
        {{ errorMessage }}
      </section>

      <section *ngIf="!isLoading && meeting?.onlineAvailable" class="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
        <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p class="text-sm font-semibold text-gray-900 dark:text-white/90">Room: {{ meeting?.meetingRoomId }}</p>
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">La reunion reste integree dans la plateforme.</p>
          </div>
          <button
            type="button"
            (click)="showMeeting = true"
            class="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600"
          >
            Rejoindre
          </button>
        </div>

        <div *ngIf="showMeeting && meetingUrl" class="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
          <iframe
            [src]="meetingUrl"
            title="Reunion virtuelle CNSTN"
            allow="camera; microphone; fullscreen; display-capture"
            class="h-[72vh] w-full bg-gray-900"
          ></iframe>
        </div>
      </section>
    </div>
  `,
})
export class EventMeetingComponent implements OnInit {
  meeting: EventMeeting | null = null;
  meetingUrl: SafeResourceUrl | null = null;
  isLoading = false;
  showMeeting = false;
  errorMessage = '';

  constructor(
    private route: ActivatedRoute,
    private eventService: EventService,
    private sanitizer: DomSanitizer,
  ) {}

  ngOnInit(): void {
    const eventId = this.route.snapshot.paramMap.get('id');
    if (!eventId) {
      this.errorMessage = 'Evenement introuvable.';
      return;
    }

    this.isLoading = true;
    this.eventService.getEventMeeting(eventId).subscribe({
      next: (meeting) => {
        this.meeting = meeting;
        this.isLoading = false;
        if (!meeting.onlineAvailable) {
          this.errorMessage = 'Cet evenement est presentiel seulement. Aucune salle virtuelle disponible.';
          return;
        }

        const roomName = encodeURIComponent(meeting.meetingRoomId || `CNSTN-${meeting.eventId}`);
        this.meetingUrl = this.sanitizer.bypassSecurityTrustResourceUrl(`https://meet.jit.si/${roomName}#config.prejoinPageEnabled=false`);
      },
      error: () => {
        this.isLoading = false;
        this.errorMessage = 'Impossible de charger la salle virtuelle.';
      },
    });
  }
}
