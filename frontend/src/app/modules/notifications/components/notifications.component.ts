import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { Notification, NotificationEmailLog, NotificationType } from '../../../core/models';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService, NotificationEmailLogQueryOptions } from '../../../core/services/notification.service';
import { Option, SelectComponent } from '../../../shared/components/form/select/select.component';

type NotificationFilter = 'all' | 'reservation' | 'intervention' | 'event' | 'ged' | 'equipment' | 'system';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, FormsModule, SelectComponent],
  template: `
    <div class="space-y-6">
      <div class="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03] sm:p-5">
        <div class="grid grid-cols-1 gap-3 lg:grid-cols-[220px_minmax(0,1fr)_auto] lg:items-center">
          <app-select
            [(ngModel)]="selectedFilter"
            [options]="filterOptions"
            placeholder="Toutes"
          ></app-select>

          <div class="flex flex-wrap items-center gap-3">
            <input
              type="text"
              [(ngModel)]="searchTerm"
              (keydown.enter)="refreshNotifications(true)"
              placeholder="Recherche titre ou message"
              class="h-11 min-w-[220px] flex-1 rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-700 placeholder:text-gray-400 dark:border-gray-700 dark:text-gray-200"
            />
            <label class="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <input
                type="checkbox"
                [(ngModel)]="unreadOnly"
                (change)="refreshNotifications(true)"
                class="h-4 w-4 rounded border-gray-300"
              />
              Non lues uniquement
            </label>
            <button
              type="button"
              (click)="refreshNotifications(true)"
              class="h-11 rounded-lg border border-brand-300 px-4 text-sm font-semibold text-brand-700 transition hover:bg-brand-50 dark:border-brand-500/50 dark:text-brand-300 dark:hover:bg-brand-500/10"
            >
              Appliquer
            </button>
          </div>

          <div class="flex justify-end">
            <button
              type="button"
              (click)="markAllVisibleAsRead()"
              [disabled]="visibleUnreadCount === 0"
              class="h-11 rounded-lg border border-gray-300 px-4 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
            >
              Tout marquer comme lu
            </button>
          </div>
        </div>
      </div>

      <section
        *ngIf="canViewEmailLogs()"
        class="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]"
      >
        <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 class="text-base font-semibold text-gray-900 dark:text-white/90">Suivi e-mail des notifications</h3>
            <p class="text-xs text-gray-500 dark:text-gray-400">Etat réel d'envoi SMTP (SENT/FAILED/SKIPPED).</p>
          </div>
          <button
            type="button"
            (click)="toggleEmailLogsPanel()"
            class="h-10 rounded-lg border border-gray-300 px-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
          >
            {{ showEmailLogs ? 'Masquer logs e-mail' : 'Afficher logs e-mail' }}
          </button>
        </div>

        <div *ngIf="showEmailLogs" class="space-y-3">
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-[180px_auto]">
            <app-select
              [(ngModel)]="emailLogStatusFilter"
              [options]="emailLogStatusOptions"
              placeholder="Tous statuts"
            ></app-select>
            <button
              type="button"
              (click)="loadEmailLogs(true)"
              class="h-10 justify-self-start rounded-lg border border-brand-300 px-3 text-sm font-semibold text-brand-700 hover:bg-brand-50 dark:border-brand-500/50 dark:text-brand-300 dark:hover:bg-brand-500/10"
            >
              Filtrer les logs
            </button>
          </div>

          <div *ngIf="isLoadingEmailLogs" class="text-sm text-gray-500 dark:text-gray-400">Chargement des logs e-mail...</div>

          <div class="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
            <table class="min-w-full">
              <thead>
                <tr class="border-b border-gray-200 dark:border-gray-700">
                  <th class="px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">Date</th>
                  <th class="px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">Destinataire</th>
                  <th class="px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">Sujet</th>
                  <th class="px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">Statut</th>
                  <th class="px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">Erreur</th>
                  <th class="px-3 py-2 text-right text-xs font-semibold text-gray-500 dark:text-gray-400">Action</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let log of emailLogs" class="border-b border-gray-200 dark:border-gray-700">
                  <td class="px-3 py-2 text-xs text-gray-700 dark:text-gray-300">{{ log.attemptedAt || log.createdAt | date:'dd/MM/yyyy HH:mm' }}</td>
                  <td class="px-3 py-2 text-xs text-gray-700 dark:text-gray-300">
                    {{ log.recipientUsername }}<br />
                    <span class="text-gray-500 dark:text-gray-400">{{ log.recipientEmail || 'N/A' }}</span>
                  </td>
                  <td class="px-3 py-2 text-xs text-gray-700 dark:text-gray-300">{{ log.emailSubject || 'N/A' }}</td>
                  <td class="px-3 py-2 text-xs">
                    <span class="inline-flex rounded-full px-2 py-1 text-[11px] font-semibold" [ngClass]="getEmailBadgeClass(log.status)">
                      {{ getEmailLabel(log.status) }}
                    </span>
                  </td>
                  <td class="px-3 py-2 text-xs text-gray-600 dark:text-gray-400">{{ log.failureReason || '-' }}</td>
                  <td class="px-3 py-2 text-right">
                    <button
                      type="button"
                      (click)="resendNotificationEmail(log.notificationId)"
                      [disabled]="log.status === 'SENT'"
                      class="h-8 rounded-lg border border-gray-300 px-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
                    >
                      Renvoyer
                    </button>
                  </td>
                </tr>
                <tr *ngIf="emailLogs.length === 0 && !isLoadingEmailLogs">
                  <td colspan="6" class="px-3 py-3 text-center text-xs text-gray-500 dark:text-gray-400">
                    Aucun log e-mail disponible.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <ng-container *ngIf="todayNotifications.length > 0">
        <h3 class="text-lg font-semibold text-gray-700 dark:text-gray-300">Aujourd'hui</h3>
        <div class="space-y-3">
          <article
            *ngFor="let notification of todayNotifications"
            class="rounded-2xl border border-gray-200 bg-white p-4 transition hover:border-gray-300 dark:border-gray-800 dark:bg-white/[0.03] dark:hover:border-gray-700"
            (click)="handleNotificationClick(notification)"
          >
            <div class="flex items-start gap-3">
              <span class="mt-2 inline-block h-2.5 w-2.5 rounded-full" [ngClass]="getLeadingDotClass(notification)"></span>

              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-2">
                  <p class="truncate text-xl font-semibold text-gray-900 dark:text-white/90">
                    {{ notification.title }}
                  </p>
                  <span class="inline-flex rounded-full px-3 py-1 text-xs font-semibold" [ngClass]="getBadgeClass(notification)">
                    {{ getCategoryLabel(notification) }}
                  </span>
                  <span
                    *ngIf="notification.priority && notification.priority !== 'NORMAL'"
                    class="inline-flex rounded-full px-3 py-1 text-xs font-semibold"
                    [ngClass]="getPriorityBadgeClass(notification.priority)"
                  >
                    {{ getPriorityLabel(notification.priority) }}
                  </span>
                  <span
                    *ngIf="notification.emailDeliveryStatus"
                    class="inline-flex rounded-full px-3 py-1 text-xs font-semibold"
                    [ngClass]="getEmailBadgeClass(notification.emailDeliveryStatus)"
                  >
                    {{ getEmailLabel(notification.emailDeliveryStatus) }}
                  </span>
                </div>

                <p *ngIf="notification.message" class="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  {{ notification.message }}
                </p>

                <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  {{ getRelativeTime(notification.createdAt) }}
                </p>
              </div>

              <div class="pt-2">
                <span
                  *ngIf="!notification.isRead"
                  class="inline-block h-2.5 w-2.5 rounded-full bg-brand-500"
                ></span>
              </div>
            </div>
          </article>
        </div>
      </ng-container>

      <ng-container *ngIf="yesterdayNotifications.length > 0">
        <h3 class="text-lg font-semibold text-gray-700 dark:text-gray-300">Hier</h3>
        <div class="space-y-3">
          <article
            *ngFor="let notification of yesterdayNotifications"
            class="rounded-2xl border border-gray-200 bg-white p-4 transition hover:border-gray-300 dark:border-gray-800 dark:bg-white/[0.03] dark:hover:border-gray-700"
            (click)="handleNotificationClick(notification)"
          >
            <div class="flex items-start gap-3">
              <span class="mt-2 inline-block h-2.5 w-2.5 rounded-full" [ngClass]="getLeadingDotClass(notification)"></span>

              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-2">
                  <p class="truncate text-xl font-semibold text-gray-900 dark:text-white/90">
                    {{ notification.title }}
                  </p>
                  <span class="inline-flex rounded-full px-3 py-1 text-xs font-semibold" [ngClass]="getBadgeClass(notification)">
                    {{ getCategoryLabel(notification) }}
                  </span>
                  <span
                    *ngIf="notification.priority && notification.priority !== 'NORMAL'"
                    class="inline-flex rounded-full px-3 py-1 text-xs font-semibold"
                    [ngClass]="getPriorityBadgeClass(notification.priority)"
                  >
                    {{ getPriorityLabel(notification.priority) }}
                  </span>
                  <span
                    *ngIf="notification.emailDeliveryStatus"
                    class="inline-flex rounded-full px-3 py-1 text-xs font-semibold"
                    [ngClass]="getEmailBadgeClass(notification.emailDeliveryStatus)"
                  >
                    {{ getEmailLabel(notification.emailDeliveryStatus) }}
                  </span>
                </div>

                <p *ngIf="notification.message" class="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  {{ notification.message }}
                </p>

                <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  {{ getRelativeTime(notification.createdAt) }}
                </p>
              </div>

              <div class="pt-2">
                <span
                  *ngIf="!notification.isRead"
                  class="inline-block h-2.5 w-2.5 rounded-full bg-brand-500"
                ></span>
              </div>
            </div>
          </article>
        </div>
      </ng-container>

      <ng-container *ngIf="olderNotifications.length > 0">
        <h3 class="text-lg font-semibold text-gray-700 dark:text-gray-300">Anterieur</h3>
        <div class="space-y-3">
          <article
            *ngFor="let notification of olderNotifications"
            class="rounded-2xl border border-gray-200 bg-white p-4 transition hover:border-gray-300 dark:border-gray-800 dark:bg-white/[0.03] dark:hover:border-gray-700"
            (click)="handleNotificationClick(notification)"
          >
            <div class="flex items-start gap-3">
              <span class="mt-2 inline-block h-2.5 w-2.5 rounded-full" [ngClass]="getLeadingDotClass(notification)"></span>

              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-2">
                  <p class="truncate text-xl font-semibold text-gray-900 dark:text-white/90">
                    {{ notification.title }}
                  </p>
                  <span class="inline-flex rounded-full px-3 py-1 text-xs font-semibold" [ngClass]="getBadgeClass(notification)">
                    {{ getCategoryLabel(notification) }}
                  </span>
                  <span
                    *ngIf="notification.priority && notification.priority !== 'NORMAL'"
                    class="inline-flex rounded-full px-3 py-1 text-xs font-semibold"
                    [ngClass]="getPriorityBadgeClass(notification.priority)"
                  >
                    {{ getPriorityLabel(notification.priority) }}
                  </span>
                  <span
                    *ngIf="notification.emailDeliveryStatus"
                    class="inline-flex rounded-full px-3 py-1 text-xs font-semibold"
                    [ngClass]="getEmailBadgeClass(notification.emailDeliveryStatus)"
                  >
                    {{ getEmailLabel(notification.emailDeliveryStatus) }}
                  </span>
                </div>

                <p *ngIf="notification.message" class="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  {{ notification.message }}
                </p>

                <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  {{ getRelativeTime(notification.createdAt) }}
                </p>
              </div>

              <div class="pt-2">
                <span
                  *ngIf="!notification.isRead"
                  class="inline-block h-2.5 w-2.5 rounded-full bg-brand-500"
                ></span>
              </div>
            </div>
          </article>
        </div>
      </ng-container>

      <div
        *ngIf="isLoading"
        class="rounded-2xl border border-gray-200 bg-white p-10 text-center dark:border-gray-800 dark:bg-white/[0.03]"
      >
        <p class="text-base text-gray-600 dark:text-gray-300">Chargement des notifications...</p>
      </div>

      <div
        *ngIf="!isLoading && filteredNotifications.length === 0"
        class="rounded-2xl border border-gray-200 bg-white p-10 text-center dark:border-gray-800 dark:bg-white/[0.03]"
      >
        <p class="text-base text-gray-600 dark:text-gray-300">Aucune notification pour ce filtre.</p>
      </div>

      <div
        *ngIf="!isLoading && totalElements > 0"
        class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-white/[0.03]"
      >
        <p class="text-sm text-gray-600 dark:text-gray-300">
          Page {{ currentPage + 1 }} / {{ totalPages }} - {{ totalElements }} notification(s)
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
            type="button"
            (click)="nextPage()"
            [disabled]="currentPage + 1 >= totalPages"
            class="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300"
          >
            Suivant
          </button>
        </div>
      </div>
    </div>
  `,
})
export class NotificationsComponent implements OnInit, OnDestroy {
  // Global switch: keep the email logs panel hidden for all users.
  private readonly emailLogsPanelEnabled = false;
  currentRecipient = 'current-user';
  selectedFilter: NotificationFilter = 'all';
  searchTerm = '';
  unreadOnly = false;
  showEmailLogs = false;
  emailLogStatusFilter: 'ALL' | 'PENDING' | 'SENT' | 'FAILED' | 'SKIPPED' = 'ALL';
  emailLogs: NotificationEmailLog[] = [];
  isLoadingEmailLogs = false;
  notifications: Notification[] = [];
  currentPage = 0;
  pageSize = 10;
  totalElements = 0;
  totalPages = 0;
  isLoading = false;

  readonly filterOptions: Option[] = [
    { value: 'all', label: 'Toutes' },
    { value: 'reservation', label: 'Reservations' },
    { value: 'intervention', label: 'Interventions' },
    { value: 'event', label: 'Evenements' },
    { value: 'ged', label: 'GED' },
    { value: 'equipment', label: 'Equipement' },
    { value: 'system', label: 'Systeme' },
  ];

  readonly emailLogStatusOptions: Option[] = [
    { value: 'ALL', label: 'Tous statuts e-mail' },
    { value: 'SENT', label: 'Email envoye' },
    { value: 'FAILED', label: 'Email echoue' },
    { value: 'SKIPPED', label: 'Email desactive/non applicable' },
    { value: 'PENDING', label: 'Email en attente' },
  ];

  private authSubscription?: Subscription;
  private notificationsSubscription?: Subscription;
  private pageStateSubscription?: Subscription;
  private routeQuerySubscription?: Subscription;

  constructor(
    private notificationService: NotificationService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.searchTerm = this.readRouteSearch();

    this.pageStateSubscription = this.notificationService.notificationPageState$.subscribe((pageState) => {
      this.currentPage = pageState.page;
      this.pageSize = pageState.size;
      this.totalElements = pageState.totalElements;
      const safeSize = pageState.size > 0 ? pageState.size : this.pageSize || 1;
      const computedPages = pageState.totalElements > 0 ? Math.ceil(pageState.totalElements / safeSize) : 0;
      this.totalPages = Math.max(pageState.totalPages, computedPages);
    });

    this.authSubscription = this.authService.currentUser$.subscribe((user) => {
      this.currentRecipient = this.resolveRecipientKey(user);
      this.currentPage = 0;
      this.refreshNotifications();
    });

    this.routeQuerySubscription = this.route.queryParamMap.subscribe((params) => {
      const routeSearch = (params.get('search') || params.get('q') || '').trim();
      if (routeSearch === this.searchTerm) {
        return;
      }
      this.searchTerm = routeSearch;
      this.currentPage = 0;
      this.refreshNotifications();
    });
  }

  ngOnDestroy(): void {
    this.authSubscription?.unsubscribe();
    this.notificationsSubscription?.unsubscribe();
    this.pageStateSubscription?.unsubscribe();
    this.routeQuerySubscription?.unsubscribe();
  }

  get filteredNotifications(): Notification[] {
    return this.notifications.filter((notification) => {
      if (this.selectedFilter === 'all') {
        return true;
      }

      return this.resolveCategory(notification) === this.selectedFilter;
    });
  }

  get todayNotifications(): Notification[] {
    return this.filteredNotifications.filter((notification) => this.isToday(this.toDate(notification.createdAt)));
  }

  get yesterdayNotifications(): Notification[] {
    return this.filteredNotifications.filter((notification) => this.isYesterday(this.toDate(notification.createdAt)));
  }

  get olderNotifications(): Notification[] {
    return this.filteredNotifications.filter((notification) => {
      const createdAt = this.toDate(notification.createdAt);
      return !this.isToday(createdAt) && !this.isYesterday(createdAt);
    });
  }

  get visibleUnreadCount(): number {
    return this.filteredNotifications.filter((notification) => !notification.isRead).length;
  }

  handleNotificationClick(notification: Notification): void {
    if (!notification.isRead) {
      this.notificationService.markAsRead(notification.id).subscribe(() => {
        this.applyReadState(notification.id);
      });
    }

    const actionUrl = notification.data?.actionUrl;
    if (actionUrl && actionUrl.startsWith('/')) {
      this.router.navigateByUrl(actionUrl);
    }
  }

  markAllVisibleAsRead(): void {
    if (this.visibleUnreadCount === 0) {
      return;
    }

    this.notificationService.markAllAsRead(this.currentRecipient).subscribe(() => {
      this.notifications = this.notifications.map((notification) => ({
        ...notification,
        isRead: true,
        readAt: notification.readAt || new Date(),
      }));
      this.refreshNotifications();
    });
  }

  canViewEmailLogs(): boolean {
    return this.emailLogsPanelEnabled && this.authService.hasRole('ADMIN', 'DSN_DIRECTOR', 'QUALITY_MANAGER');
  }

  toggleEmailLogsPanel(): void {
    this.showEmailLogs = !this.showEmailLogs;
    if (this.showEmailLogs) {
      this.loadEmailLogs(true);
    }
  }

  loadEmailLogs(reset = false): void {
    if (!this.canViewEmailLogs()) {
      return;
    }
    if (reset) {
      this.emailLogs = [];
    }

    const options: NotificationEmailLogQueryOptions = {
      page: 0,
      size: 30,
      status: this.emailLogStatusFilter === 'ALL' ? undefined : this.emailLogStatusFilter,
    };
    this.isLoadingEmailLogs = true;
    this.notificationService.getEmailLogs(options).subscribe({
      next: (response) => {
        this.emailLogs = Array.isArray(response.content) ? response.content : [];
        this.isLoadingEmailLogs = false;
      },
      error: () => {
        this.emailLogs = [];
        this.isLoadingEmailLogs = false;
      },
    });
  }

  resendNotificationEmail(notificationId: string): void {
    if (!this.canViewEmailLogs()) {
      return;
    }
    this.notificationService.resendEmail(notificationId).subscribe({
      next: () => {
        this.refreshNotifications();
        if (this.showEmailLogs) {
          this.loadEmailLogs(true);
        }
      },
      error: () => {
        // Intentionally silent in UI list view; logs panel remains source of truth.
      },
    });
  }

  refreshNotifications(resetPage = false): void {
    if (resetPage) {
      this.currentPage = 0;
    }
    this.subscribeNotifications();
  }

  nextPage(): void {
    if (this.currentPage + 1 >= this.totalPages) {
      return;
    }
    this.currentPage += 1;
    this.subscribeNotifications();
  }

  previousPage(): void {
    if (this.currentPage <= 0) {
      return;
    }
    this.currentPage -= 1;
    this.subscribeNotifications();
  }

  getCategoryLabel(notification: Notification): string {
    const category = this.resolveCategory(notification);

    if (category === 'reservation') {
      return 'Reservation';
    }
    if (category === 'intervention') {
      return 'Intervention';
    }
    if (category === 'event') {
      return 'Evenement';
    }
    if (category === 'ged') {
      return 'GED';
    }
    if (category === 'equipment') {
      return 'Equipement';
    }

    return 'Systeme';
  }

  getBadgeClass(notification: Notification): string {
    const category = this.resolveCategory(notification);
    const text = this.getNotificationText(notification);

    if (category === 'intervention') {
      if (text.includes('critique')) {
        return 'bg-error-50 text-error-700 dark:bg-error-500/20 dark:text-error-300';
      }

      return 'bg-success-50 text-success-700 dark:bg-success-500/20 dark:text-success-300';
    }

    if (category === 'reservation') {
      return 'bg-success-50 text-success-700 dark:bg-success-500/20 dark:text-success-300';
    }

    if (category === 'event') {
      return 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300';
    }

    if (category === 'ged') {
      return 'bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300';
    }

    if (category === 'equipment') {
      return 'bg-warning-50 text-warning-700 dark:bg-warning-500/20 dark:text-warning-300';
    }

    return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
  }

  getLeadingDotClass(notification: Notification): string {
    const category = this.resolveCategory(notification);
    const text = this.getNotificationText(notification);

    if (category === 'intervention') {
      if (text.includes('critique')) {
        return 'bg-error-500';
      }

      return 'bg-success-500';
    }

    if (category === 'reservation') {
      return 'bg-success-500';
    }

    if (category === 'event') {
      return 'bg-indigo-500';
    }

    if (category === 'ged') {
      return 'bg-blue-500';
    }

    if (category === 'equipment') {
      return 'bg-warning-500';
    }

    return 'bg-gray-500';
  }

  getRelativeTime(value: Date): string {
    const date = this.toDate(value);
    const now = new Date();
    const diffMs = Math.max(now.getTime() - date.getTime(), 0);
    const diffMinutes = Math.floor(diffMs / 60000);

    if (diffMinutes < 60) {
      return `Il y a ${Math.max(diffMinutes, 1)} min`;
    }

    if (this.isToday(date)) {
      const hours = Math.floor(diffMinutes / 60);
      const minutes = diffMinutes % 60;
      if (minutes === 0) {
        return `Il y a ${hours} h`;
      }

      return `Il y a ${hours} h ${minutes} min`;
    }

    if (this.isYesterday(date)) {
      return `Hier ${this.formatTime(date)}`;
    }

    return this.formatDate(date);
  }

  private subscribeNotifications(): void {
    this.notificationsSubscription?.unsubscribe();
    this.isLoading = true;
    this.notificationsSubscription = this.notificationService
      .getNotifications({
        userId: this.currentRecipient,
        page: this.currentPage,
        size: this.pageSize,
        unread: this.unreadOnly ? true : undefined,
        search: this.searchTerm.trim() || undefined,
        sort: 'createdAt,desc',
      })
      .subscribe((notifications) => {
        const safeNotifications = Array.isArray(notifications) ? notifications : [];
        this.notifications = [...safeNotifications].sort(
          (left, right) => this.toDate(right.createdAt).getTime() - this.toDate(left.createdAt).getTime(),
        );
        this.isLoading = false;
      }, () => {
        this.isLoading = false;
      });
  }

  getEmailLabel(status: string): string {
    if (status === 'SENT') {
      return 'Email envoye';
    }
    if (status === 'FAILED') {
      return 'Email echoue';
    }
    if (status === 'SKIPPED') {
      return 'Email desactive';
    }
    return 'Email en attente';
  }

  getEmailBadgeClass(status: string): string {
    if (status === 'SENT') {
      return 'bg-success-50 text-success-700 dark:bg-success-500/20 dark:text-success-300';
    }
    if (status === 'FAILED') {
      return 'bg-error-50 text-error-700 dark:bg-error-500/20 dark:text-error-300';
    }
    if (status === 'SKIPPED') {
      return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
    }
    return 'bg-warning-50 text-warning-700 dark:bg-warning-500/20 dark:text-warning-300';
  }

  getPriorityBadgeClass(priority: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL'): string {
    switch (priority) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300 ring-1 ring-red-300';
      case 'HIGH':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-300';
      case 'LOW':
        return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300';
      default:
        return 'bg-blue-50 text-blue-700';
    }
  }

  getPriorityLabel(priority: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL'): string {
    switch (priority) {
      case 'CRITICAL':
        return 'Critique';
      case 'HIGH':
        return 'Haute';
      case 'LOW':
        return 'Basse';
      default:
        return 'Normale';
    }
  }

  private resolveRecipientKey(user: { id?: string; username?: string; email?: string } | null): string {
    if (!user) {
      return 'current-user';
    }

    const username = user.username?.trim();
    if (username) {
      return username;
    }

    const email = user.email?.trim().toLowerCase() ?? '';
    if (email.includes('@')) {
      return email.split('@')[0];
    }

    return user.id?.trim() || 'current-user';
  }

  private resolveCategory(notification: Notification): Exclude<NotificationFilter, 'all'> {
    const text = this.getNotificationText(notification);

    if (text.includes('materiel') || text.includes('equipement')) {
      return 'equipment';
    }

    if (
      notification.type === NotificationType.RESERVATION_APPROVED ||
      notification.type === NotificationType.RESERVATION_REJECTED
    ) {
      return 'reservation';
    }

    if (
      notification.type === NotificationType.INTERVENTION_ASSIGNED ||
      notification.type === NotificationType.INTERVENTION_UPDATED ||
      notification.type === NotificationType.INTERVENTION_COMPLETED
    ) {
      return 'intervention';
    }

    if (
      notification.type === NotificationType.INVITATION_SENT ||
      notification.type === NotificationType.INVITATION_ACCEPTED ||
      notification.type === NotificationType.INVITATION_DECLINED ||
      notification.type === NotificationType.EVENT_REMINDER
    ) {
      return 'event';
    }

    if (notification.type === NotificationType.DOCUMENT_SHARED) {
      return 'ged';
    }

    return 'system';
  }

  private getNotificationText(notification: Notification): string {
    return `${notification.title} ${notification.message}`.trim().toLowerCase();
  }

  private applyReadState(notificationId: string): void {
    this.notifications = this.notifications.map((notification) => {
      if (notification.id !== notificationId) {
        return notification;
      }

      return {
        ...notification,
        isRead: true,
        readAt: new Date(),
      };
    });
  }

  private isToday(date: Date): boolean {
    const now = new Date();
    return (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate()
    );
  }

  private isYesterday(date: Date): boolean {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    return (
      date.getFullYear() === yesterday.getFullYear() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getDate() === yesterday.getDate()
    );
  }

  private formatTime(date: Date): string {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}h${minutes}`;
  }

  private formatDate(date: Date): string {
    const months = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aou', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  }

  private readRouteSearch(): string {
    return (this.route.snapshot.queryParamMap.get('search') || this.route.snapshot.queryParamMap.get('q') || '').trim();
  }

  private toDate(value: Date): Date {
    return value instanceof Date ? value : new Date(value);
  }
}
