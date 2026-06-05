import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subject, catchError, forkJoin, map, of, tap, throwError } from 'rxjs';
import { ApiPageResponse, buildApiUrl, extractPageContent } from '../config/backend-api.config';
import {
  Notification,
  NotificationEmailLog,
  NotificationPreference,
  NotificationType,
} from '../models';

interface BackendNotificationResponse {
  id: string;
  recipientUsername: string;
  title: string;
  message: string;
  read: boolean;
  emailDeliveryStatus?: 'PENDING' | 'SENT' | 'FAILED' | 'SKIPPED' | null;
  emailDeliveryError?: string | null;
  emailLastAttemptAt?: string | null;
  actionUrl?: string | null;
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL' | null;
  createdAt?: string;
  updatedAt?: string;
}

interface BackendNotificationCreateRequest {
  recipientUsername: string;
  title: string;
  message: string;
  recipientEmail?: string | null;
  notificationType?: string | null;
  actionUrl?: string | null;
  inAppOnly?: boolean | null;
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL' | null;
}

interface BackendUnreadCountResponse {
  unreadCount: number;
}

interface BackendNotificationEmailLogResponse {
  id: string;
  notificationId: string;
  recipientUsername: string;
  recipientEmail?: string | null;
  notificationType?: string | null;
  emailSubject?: string | null;
  status: 'PENDING' | 'SENT' | 'FAILED' | 'SKIPPED';
  failureReason?: string | null;
  attemptedAt?: string | null;
  createdAt: string;
}

interface BackendEmailStatusResponse {
  notificationId: string;
  emailDeliveryStatus?: 'PENDING' | 'SENT' | 'FAILED' | 'SKIPPED' | null;
  emailDeliveryError?: string | null;
  emailLastAttemptAt?: string | null;
}

export interface NotificationQueryOptions {
  userId?: string;
  page?: number;
  size?: number;
  unread?: boolean;
  search?: string;
  sort?: string;
}

export interface NotificationPageState {
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface NotificationEmailLogQueryOptions {
  page?: number;
  size?: number;
  notificationId?: string;
  status?: 'PENDING' | 'SENT' | 'FAILED' | 'SKIPPED';
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService implements OnDestroy {
  private notificationsSubject = new BehaviorSubject<Notification[]>([]);
  public notifications$ = this.notificationsSubject.asObservable();

  private unreadCountSubject = new BehaviorSubject<number>(0);
  public unreadCount$ = this.unreadCountSubject.asObservable();

  private notificationPreferencesSubject = new BehaviorSubject<NotificationPreference[]>([]);
  public notificationPreferences$ = this.notificationPreferencesSubject.asObservable();

  private notificationPageStateSubject = new BehaviorSubject<NotificationPageState>({
    page: 0,
    size: 20,
    totalElements: 0,
    totalPages: 0,
  });
  public notificationPageState$ = this.notificationPageStateSubject.asObservable();

  private sseSubject = new Subject<Notification>();
  public sseNotifications$ = this.sseSubject.asObservable();

  private currentRecipient = '';
  private eventSource: EventSource | null = null;

  constructor(private http: HttpClient) {
    this.updateUnreadCount();
  }

  ngOnDestroy(): void {
    this.eventSource?.close();
  }

  getNotifications(optionsOrUserId?: NotificationQueryOptions | string): Observable<Notification[]> {
    const options = typeof optionsOrUserId === 'string'
      ? { userId: optionsOrUserId } satisfies NotificationQueryOptions
      : optionsOrUserId ?? {};

    const recipient = (options.userId || this.currentRecipient || '').trim();
    this.currentRecipient = recipient;

    let params = new HttpParams()
      .set('page', String(options.page ?? 0))
      .set('size', String(options.size ?? 20))
      .set('sort', options.sort || 'createdAt,desc');

    if (typeof options.unread === 'boolean') {
      params = params.set('unread', String(options.unread));
    }
    if (options.search?.trim()) {
      params = params.set('search', options.search.trim());
    }

    const request$ = this.http
      .get<ApiPageResponse<BackendNotificationResponse>>(buildApiUrl('/api/v1/notifications'), { params })
      .pipe(
        map((response) => {
          this.notificationPageStateSubject.next({
            page: response.page ?? options.page ?? 0,
            size: response.size ?? options.size ?? 20,
            totalElements: response.totalElements ?? 0,
            totalPages: response.totalPages ?? 0,
          });
          return extractPageContent(response).map((item) => this.mapNotification(item));
        }),
        tap((notifications) => {
          this.notificationsSubject.next(notifications);
          this.refreshUnreadCountFromBackend();
        }),
      );

    return this.withFallback(request$, () => {
      const notifications = [...this.notificationsSubject.value];
      this.updateUnreadCount();
      return of(notifications);
    });
  }

  getUnreadNotifications(userId?: string): Observable<Notification[]> {
    return this.getNotifications(userId).pipe(
      map((notifications) => notifications.filter((notification) => !notification.isRead)),
    );
  }

  getUnreadCount(userId?: string): Observable<number> {
    const recipient = (userId || '').trim();
    if (recipient) {
      this.currentRecipient = recipient;
    }

    const request$ = this.http
      .get<BackendUnreadCountResponse>(buildApiUrl('/api/v1/notifications/unread-count'))
      .pipe(
        map((response) => Number(response.unreadCount ?? 0)),
        tap((count) => this.unreadCountSubject.next(count)),
      );

    return this.withFallback(request$, () => {
      this.updateUnreadCount();
      return this.unreadCountSubject.asObservable();
    });
  }

  markAsRead(notificationId: string): Observable<Notification | null> {
    const request$ = this.http
      .put<BackendNotificationResponse>(buildApiUrl(`/api/v1/notifications/${notificationId}/read`), {})
      .pipe(
        map((response) => this.mapNotification(response)),
        tap((updated) => this.upsertNotification(updated)),
      );

    return this.withFallback(request$, () => {
      const notifications = this.notificationsSubject.value;
      const notification = notifications.find((item) => item.id === notificationId) ?? null;
      if (!notification) {
        return of(null);
      }

      notification.isRead = true;
      notification.readAt = new Date();
      this.notificationsSubject.next([...notifications]);
      this.refreshUnreadCountFromBackend();
      return of(notification);
    });
  }

  markMultipleAsRead(notificationIds: string[]): Observable<boolean> {
    if (notificationIds.length === 0) {
      return of(true);
    }

    const request$ = forkJoin(notificationIds.map((id) => this.markAsRead(id))).pipe(
      map(() => true),
    );

    return this.withFallback(request$, () => {
      const notifications = this.notificationsSubject.value;
      notificationIds.forEach((id) => {
        const notification = notifications.find((item) => item.id === id);
        if (notification) {
          notification.isRead = true;
          notification.readAt = new Date();
        }
      });
      this.notificationsSubject.next([...notifications]);
      this.refreshUnreadCountFromBackend();
      return of(true);
    });
  }

  markAllAsRead(userId?: string): Observable<boolean> {
    const recipient = (userId || '').trim();
    if (recipient) {
      this.currentRecipient = recipient;
    }

    const request$ = this.http
      .put<void>(buildApiUrl('/api/v1/notifications/read-all'), {})
      .pipe(
        map(() => true),
        tap(() => {
          this.notificationsSubject.next(
            this.notificationsSubject.value.map((notification) => ({
              ...notification,
              isRead: true,
              readAt: notification.readAt || new Date(),
            })),
          );
          this.unreadCountSubject.next(0);
        }),
      );

    return this.withFallback(request$, () => {
      this.notificationsSubject.next(
        this.notificationsSubject.value.map((notification) => ({
          ...notification,
          isRead: true,
          readAt: notification.readAt || new Date(),
        })),
      );
      this.unreadCountSubject.next(0);
      return of(true);
    });
  }

  deleteNotification(notificationId: string): Observable<boolean> {
    return this.http.delete<void>(buildApiUrl(`/api/v1/notifications/${notificationId}`)).pipe(
      tap(() => {
        this.notificationsSubject.next(this.notificationsSubject.value.filter((item) => item.id !== notificationId));
        this.refreshUnreadCountFromBackend();
      }),
      map(() => true),
    );
  }

  deleteMultiple(notificationIds: string[]): Observable<boolean> {
    if (notificationIds.length === 0) {
      return of(true);
    }

    return forkJoin(notificationIds.map((id) => this.deleteNotification(id))).pipe(
      map(() => true),
    );
  }

  createNotification(notification: Omit<Notification, 'id' | 'createdAt' | 'isRead' | 'readAt'>): Observable<Notification> {
    const payload: BackendNotificationCreateRequest = {
      recipientUsername: notification.userId,
      title: notification.title,
      message: notification.message,
      priority: notification.priority ?? 'NORMAL',
    };

    const request$ = this.http
      .post<BackendNotificationResponse>(buildApiUrl('/api/v1/notifications'), payload)
      .pipe(
        map((response) => this.mapNotification(response)),
        tap((created) => {
          this.notificationsSubject.next([created, ...this.notificationsSubject.value]);
          this.sseSubject.next(created);
          this.refreshUnreadCountFromBackend();
        }),
      );

    return this.withFallback(request$, () => {
      const created: Notification = {
        ...notification,
        id: this.generateId(),
        createdAt: new Date(),
        isRead: false,
      };
      this.notificationsSubject.next([created, ...this.notificationsSubject.value]);
      this.sseSubject.next(created);
      this.refreshUnreadCountFromBackend();
      return of(created);
    });
  }

  getEmailLogs(options: NotificationEmailLogQueryOptions = {}): Observable<ApiPageResponse<NotificationEmailLog>> {
    let params = new HttpParams()
      .set('page', String(options.page ?? 0))
      .set('size', String(options.size ?? 20))
      .set('sort', 'attemptedAt,desc');

    if (options.notificationId) {
      params = params.set('notificationId', options.notificationId);
    }
    if (options.status) {
      params = params.set('status', options.status);
    }

    return this.http
      .get<ApiPageResponse<BackendNotificationEmailLogResponse>>(buildApiUrl('/api/v1/notifications/email-logs'), { params })
      .pipe(
        map((response) => ({
          ...response,
          content: extractPageContent(response).map((item) => this.mapEmailLog(item)),
        })),
      );
  }

  resendEmail(notificationId: string): Observable<Notification | null> {
    return this.http
      .post<BackendEmailStatusResponse>(buildApiUrl(`/api/v1/notifications/${notificationId}/resend-email`), {})
      .pipe(
        map((response) => {
          const notifications = this.notificationsSubject.value;
          const target = notifications.find((item) => item.id === notificationId);
          if (!target) {
            return null;
          }

          const updated: Notification = {
            ...target,
            emailDeliveryStatus: response.emailDeliveryStatus ?? null,
            emailDeliveryError: response.emailDeliveryError ?? null,
            emailLastAttemptAt: this.toOptionalDate(response.emailLastAttemptAt),
          };
          this.upsertNotification(updated);
          return updated;
        }),
      );
  }

  getNotificationPreferences(userId?: string): Observable<NotificationPreference[]> {
    return this.unsupportedOperation(
      'Preferences notifications non disponibles: aucun endpoint backend ne persiste ces reglages.',
    );
  }

  updateNotificationPreference(preference: NotificationPreference): Observable<NotificationPreference> {
    return this.unsupportedOperation(
      'Mise a jour preferences notifications desactivee: aucun endpoint backend ne persiste ces reglages.',
    );
  }

  connectSSE(userId: string): Observable<Notification> {
    this.currentRecipient = userId.trim();
    this.eventSource?.close();
    this.openSSEConnection();

    return this.sseNotifications$;
  }

  private openSSEConnection(): void {
    try {
      this.eventSource = new EventSource(buildApiUrl('/api/v1/notifications/stream'));
      this.eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data) as BackendNotificationResponse;
          const notification = this.mapNotification(payload);
          this.notificationsSubject.next([notification, ...this.notificationsSubject.value]);
          this.sseSubject.next(notification);
          this.refreshUnreadCountFromBackend();
        } catch {
          // Ignore malformed SSE payloads.
        }
      };
      this.eventSource.onerror = () => {
        this.eventSource?.close();
        this.eventSource = null;
      };
    } catch {
      this.eventSource = null;
    }
  }

  private mapNotification(response: BackendNotificationResponse): Notification {
    const createdAt = this.toDate(response.createdAt);
    const updatedAt = this.toDate(response.updatedAt, createdAt);
    const isRead = response.read;

    return {
      id: response.id,
      userId: response.recipientUsername,
      type: this.inferNotificationType(response.title, response.message),
      title: response.title,
      message: response.message || '',
      priority: response.priority ?? 'NORMAL',
      emailDeliveryStatus: response.emailDeliveryStatus ?? null,
      emailDeliveryError: response.emailDeliveryError ?? null,
      emailLastAttemptAt: this.toOptionalDate(response.emailLastAttemptAt),
      data: response.actionUrl ? { actionUrl: response.actionUrl } : undefined,
      createdAt,
      isRead,
      readAt: isRead ? updatedAt : undefined,
    };
  }

  private mapEmailLog(response: BackendNotificationEmailLogResponse): NotificationEmailLog {
    return {
      id: response.id,
      notificationId: response.notificationId,
      recipientUsername: response.recipientUsername,
      recipientEmail: response.recipientEmail ?? null,
      notificationType: response.notificationType ?? null,
      emailSubject: response.emailSubject ?? null,
      status: response.status,
      failureReason: response.failureReason ?? null,
      attemptedAt: this.toOptionalDate(response.attemptedAt),
      createdAt: this.toDate(response.createdAt),
    };
  }

  private inferNotificationType(title: string, message: string): NotificationType {
    const text = `${title} ${message}`.toLowerCase();

    if (text.includes('reservation') && text.includes('rej')) {
      return NotificationType.RESERVATION_REJECTED;
    }
    if (text.includes('reservation')) {
      return NotificationType.RESERVATION_APPROVED;
    }
    if (text.includes('invitation') && text.includes('accept')) {
      return NotificationType.INVITATION_ACCEPTED;
    }
    if (text.includes('invitation') && text.includes('declin')) {
      return NotificationType.INVITATION_DECLINED;
    }
    if (text.includes('invitation')) {
      return NotificationType.INVITATION_SENT;
    }
    if (text.includes('intervention') && text.includes('complete')) {
      return NotificationType.INTERVENTION_COMPLETED;
    }
    if (text.includes('intervention') && text.includes('assign')) {
      return NotificationType.INTERVENTION_ASSIGNED;
    }
    if (text.includes('intervention')) {
      return NotificationType.INTERVENTION_UPDATED;
    }
    if (text.includes('document')) {
      return NotificationType.DOCUMENT_SHARED;
    }
    if (text.includes('event') || text.includes('evenement')) {
      return NotificationType.EVENT_REMINDER;
    }

    return NotificationType.SYSTEM_ALERT;
  }

  private upsertNotification(updated: Notification): void {
    const notifications = this.notificationsSubject.value;
    const index = notifications.findIndex((item) => item.id === updated.id);

    if (index >= 0) {
      notifications[index] = updated;
      this.notificationsSubject.next([...notifications]);
    } else {
      this.notificationsSubject.next([updated, ...notifications]);
    }

    this.updateUnreadCount();
  }

  private updateUnreadCount(): void {
    const unreadCount = this.notificationsSubject.value.filter((item) => !item.isRead).length;
    this.unreadCountSubject.next(unreadCount);
  }

  private refreshUnreadCountFromBackend(): void {
    this.http
      .get<BackendUnreadCountResponse>(buildApiUrl('/api/v1/notifications/unread-count'))
      .pipe(
        map((response) => Number(response.unreadCount ?? 0)),
        catchError(() => of(this.notificationsSubject.value.filter((item) => !item.isRead).length)),
      )
      .subscribe((count) => this.unreadCountSubject.next(count));
  }

  private toDate(value?: string, fallback = new Date()): Date {
    if (!value) {
      return fallback;
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? fallback : parsed;
  }

  private toOptionalDate(value?: string | null): Date | null {
    if (!value) {
      return null;
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private withFallback<T>(request$: Observable<T>, fallbackFactory: () => Observable<T>): Observable<T> {
    return request$.pipe(
      catchError((error) => throwError(() => error)),
    );
  }

  private unsupportedOperation<T>(message: string): Observable<T> {
    return throwError(() => new Error(message));
  }

  private generateId(): string {
    return Math.random().toString(36).slice(2, 11);
  }
}
