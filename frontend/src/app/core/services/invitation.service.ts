import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, forkJoin, map, of, switchMap, tap } from 'rxjs';
import { ApiPageResponse, buildApiUrl, extractPageContent } from '../config/backend-api.config';
import { Invitation, InvitationResponse, InvitationStatus } from '../models';

interface BackendEventSummary {
  id: string;
  title: string;
  startAt: string;
  location?: string;
}

interface BackendPartnerInviteRequest {
  partnerName: string;
  partnerEmail: string;
}

interface BackendPartnerInviteResponse {
  id: string;
  eventId: string;
  partnerName: string;
  partnerEmail: string;
  accessApproved: boolean;
  createdAt?: string;
}

interface BackendInternalInviteRecipient {
  username: string;
  email: string;
  displayName: string;
}

interface BackendInternalInviteRequest {
  recipients: BackendInternalInviteRecipient[];
  message?: string | null;
}

interface BackendEventInvitationResponse {
  id: string;
  eventId: string;
  eventTitle: string;
  eventStartAt: string;
  eventEndAt: string;
  eventMode: 'PRESENTIEL' | 'EN_LIGNE' | 'HYBRIDE';
  eventLocation?: string;
  onlineMeetingLink?: string;
  invitedUsername: string;
  invitedEmail: string;
  invitedDisplayName: string;
  invitedByUsername: string;
  invitedByDisplayName: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED' | 'CANCELLED';
  message?: string;
  responseReason?: string;
  respondedAt?: string;
  expiresAt?: string;
  createdAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class InvitationService {
  private invitationsSubject = new BehaviorSubject<Invitation[]>([]);
  public invitations$ = this.invitationsSubject.asObservable();

  constructor(private http: HttpClient) {}

  getInvitations(includeAdminScope = false): Observable<Invitation[]> {
    return this.refreshInternalInvitations(includeAdminScope).pipe(
      map((invitations) => invitations.filter((invitation) => !invitation.isExternalPartner)),
    );
  }

  getInvitationsByUser(_userId: string): Observable<Invitation[]> {
    return this.getInvitations();
  }

  getInvitationsByEvent(eventId: string): Observable<Invitation[]> {
    return this.http
      .get<BackendEventInvitationResponse[]>(buildApiUrl(`/api/v1/events/${eventId}/invitations`))
      .pipe(
        map((items) => (Array.isArray(items) ? items.map((item) => this.mapInternalInvitation(item)) : [])),
      );
  }

  getInvitationsByStatus(status: InvitationStatus): Observable<Invitation[]> {
    return this.getInvitations().pipe(
      map((invitations) => invitations.filter((invitation) => invitation.status === status)),
    );
  }

  sendInvitation(invitation: Omit<Invitation, 'id' | 'sentAt'>): Observable<Invitation> {
    if (invitation.isExternalPartner) {
      return this.sendPartnerInvitation(invitation);
    }

    const payload: BackendInternalInviteRequest = {
      recipients: [
        {
          username: (invitation.recipientUsername || invitation.recipientId || invitation.recipientEmail).trim(),
          email: invitation.recipientEmail.trim().toLowerCase(),
          displayName: invitation.recipientName.trim(),
        },
      ],
      message: invitation.message?.trim() || null,
    };

    return this.http
      .post<BackendEventInvitationResponse[]>(buildApiUrl(`/api/v1/events/${invitation.eventId}/invitations`), payload)
      .pipe(
        map((created) => {
          const first = Array.isArray(created) ? created[0] : undefined;
          if (!first) {
            throw new Error('Creation invitation impossible.');
          }
          return this.mapInternalInvitation(first);
        }),
        tap((created) => this.upsertInvitation(created)),
      );
  }

  sendBulkInvitations(
    eventId: string,
    recipients: Array<{ userId: string; email: string; name: string }>,
    _senderId: string,
    _senderName: string,
    message?: string,
  ): Observable<Invitation[]> {
    const normalizedRecipients = recipients
      .map((recipient) => ({
        username: (recipient.userId || recipient.email).trim(),
        email: recipient.email.trim().toLowerCase(),
        displayName: recipient.name.trim(),
      }))
      .filter((recipient) => !!recipient.username && !!recipient.email && !!recipient.displayName);

    if (normalizedRecipients.length === 0) {
      return of([]);
    }

    const payload: BackendInternalInviteRequest = {
      recipients: normalizedRecipients,
      message: message?.trim() || null,
    };

    return this.http
      .post<BackendEventInvitationResponse[]>(buildApiUrl(`/api/v1/events/${eventId}/invitations`), payload)
      .pipe(
        map((created) => (Array.isArray(created) ? created.map((item) => this.mapInternalInvitation(item)) : [])),
        tap((createdInvitations) => this.upsertInvitations(createdInvitations)),
      );
  }

  respondToInvitation(invitationId: string, response: InvitationResponse): Observable<Invitation | null> {
    if (response.status === InvitationStatus.ACCEPTED) {
      return this.acceptInvitation(invitationId);
    }
    if (response.status === InvitationStatus.DECLINED) {
      return this.declineInvitation(invitationId, response.responseReason);
    }
    return of(null);
  }

  acceptInvitation(invitationId: string): Observable<Invitation | null> {
    return this.http
      .post<BackendEventInvitationResponse>(buildApiUrl(`/api/v1/events/invitations/${invitationId}/accept`), {})
      .pipe(
        map((updated) => this.mapInternalInvitation(updated)),
        tap((updated) => this.upsertInvitation(updated)),
      );
  }

  declineInvitation(invitationId: string, reason?: string): Observable<Invitation | null> {
    return this.http
      .post<BackendEventInvitationResponse>(buildApiUrl(`/api/v1/events/invitations/${invitationId}/decline`), {
        reason: reason?.trim() || null,
      })
      .pipe(
        map((updated) => this.mapInternalInvitation(updated)),
        tap((updated) => this.upsertInvitation(updated)),
      );
  }

  getInvitation(id: string): Observable<Invitation | undefined> {
    return this.getInvitations().pipe(
      map((invitations) => invitations.find((invitation) => invitation.id === id)),
    );
  }

  cancelInvitation(id: string): Observable<boolean> {
    return this.http
      .put<BackendEventInvitationResponse>(buildApiUrl(`/api/v1/events/invitations/${id}/cancel`), {})
      .pipe(
        map((updated) => this.mapInternalInvitation(updated)),
        tap((updated) => this.upsertInvitation(updated)),
        map(() => true),
      );
  }

  getPartnerInvitations(): Observable<Invitation[]> {
    if (!this.canReadPartnerInvitationsFromBackend()) {
      return of(this.invitationsSubject.value.filter((invitation) => invitation.isExternalPartner));
    }

    return this.refreshPartnerInvitations().pipe(
      map(() => this.invitationsSubject.value.filter((invitation) => invitation.isExternalPartner)),
    );
  }

  refreshInternalInvitations(includeAdminScope = false): Observable<Invitation[]> {
    const endpoint = includeAdminScope ? '/api/v1/events/invitations/admin' : '/api/v1/events/invitations/mine';
    return this.http
      .get<BackendEventInvitationResponse[]>(buildApiUrl(endpoint))
      .pipe(
        map((items) => (Array.isArray(items) ? items.map((item) => this.mapInternalInvitation(item)) : [])),
        tap((internalInvitations) => {
          const externalInvitations = this.invitationsSubject.value.filter((invitation) => invitation.isExternalPartner);
          this.invitationsSubject.next(this.mergeById([...externalInvitations, ...internalInvitations]));
        }),
      );
  }

  private sendPartnerInvitation(invitation: Omit<Invitation, 'id' | 'sentAt'>): Observable<Invitation> {
    const payload: BackendPartnerInviteRequest = {
      partnerName: invitation.recipientName,
      partnerEmail: invitation.recipientEmail,
    };

    const request$ = this.http
      .post<BackendPartnerInviteResponse>(buildApiUrl(`/api/v1/events/${invitation.eventId}/partners`), payload)
      .pipe(
        map((response) => this.mapPartnerInvitation(response, invitation)),
        tap((created) => this.upsertInvitation(created)),
      );

    return request$;
  }

  private refreshPartnerInvitations(): Observable<Invitation[]> {
    return this.http
      .get<ApiPageResponse<BackendEventSummary>>(buildApiUrl('/api/v1/events'))
      .pipe(
        map((response) => extractPageContent(response)),
        switchMap((events) => {
          if (events.length === 0) {
            return of([] as Invitation[]);
          }

          const perEventRequests = events.map((event) =>
            this.http
              .get<BackendPartnerInviteResponse[]>(buildApiUrl(`/api/v1/events/${event.id}/partners`))
              .pipe(
                map((partners) => partners.map((partner) => this.mapPartnerInvitation(partner, {
                  eventId: event.id,
                  eventTitle: event.title,
                  eventDate: this.toDate(event.startAt),
                  eventLocation: event.location || '',
                  recipientId: partner.partnerEmail,
                  recipientEmail: partner.partnerEmail,
                  recipientName: partner.partnerName,
                  senderId: 'backend',
                  senderName: 'Backend API',
                  status: InvitationStatus.PENDING,
                  respondedAt: undefined,
                  message: '',
                  responseReason: undefined,
                  isExternalPartner: true,
                  isVerifiedByDsn: partner.accessApproved,
                  verifiedBy: undefined,
                  verifiedAt: undefined,
                  partnerOrganization: undefined,
                }))),
              ),
          );

          return forkJoin(perEventRequests).pipe(
            map((collections) => collections.flat()),
          );
        }),
        tap((partnerInvitations) => {
          const internalInvitations = this.invitationsSubject.value.filter((invitation) => !invitation.isExternalPartner);
          this.invitationsSubject.next(this.mergeById([...internalInvitations, ...partnerInvitations]));
        }),
      );
  }

  private upsertInvitation(invitation: Invitation): void {
    this.upsertInvitations([invitation]);
  }

  private upsertInvitations(invitations: Invitation[]): void {
    const current = this.invitationsSubject.value;
    this.invitationsSubject.next(this.mergeById([...current, ...invitations]));
  }

  private mergeById(invitations: Invitation[]): Invitation[] {
    const merged = new Map<string, Invitation>();
    invitations.forEach((invitation) => {
      merged.set(invitation.id, invitation);
    });
    return Array.from(merged.values()).sort((left, right) => right.sentAt.getTime() - left.sentAt.getTime());
  }

  private mapInternalInvitation(response: BackendEventInvitationResponse): Invitation {
    return {
      id: response.id,
      eventId: response.eventId,
      eventTitle: response.eventTitle,
      eventDate: this.toDate(response.eventStartAt),
      eventEndDate: this.toDate(response.eventEndAt),
      eventMode: response.eventMode,
      eventLocation: response.eventLocation || '',
      onlineMeetingLink: response.onlineMeetingLink || undefined,
      recipientId: response.invitedUsername,
      recipientUsername: response.invitedUsername,
      recipientEmail: response.invitedEmail,
      recipientName: response.invitedDisplayName,
      senderId: response.invitedByUsername,
      senderUsername: response.invitedByUsername,
      senderName: response.invitedByDisplayName || response.invitedByUsername,
      status: this.toInvitationStatus(response.status),
      sentAt: this.toDate(response.createdAt),
      expiresAt: response.expiresAt ? this.toDate(response.expiresAt) : undefined,
      respondedAt: response.respondedAt ? this.toDate(response.respondedAt) : undefined,
      message: response.message || undefined,
      responseReason: response.responseReason || undefined,
      isExternalPartner: false,
      isVerifiedByDsn: true,
      verifiedBy: undefined,
      verifiedAt: undefined,
      partnerOrganization: undefined,
    };
  }

  private toInvitationStatus(status: BackendEventInvitationResponse['status']): InvitationStatus {
    if (status === 'ACCEPTED') {
      return InvitationStatus.ACCEPTED;
    }
    if (status === 'DECLINED') {
      return InvitationStatus.DECLINED;
    }
    if (status === 'EXPIRED') {
      return InvitationStatus.EXPIRED;
    }
    if (status === 'CANCELLED') {
      return InvitationStatus.CANCELLED;
    }
    return InvitationStatus.PENDING;
  }

  private mapPartnerInvitation(
    response: BackendPartnerInviteResponse,
    context: Omit<Invitation, 'id' | 'sentAt'>,
  ): Invitation {
    return {
      id: response.id,
      eventId: response.eventId || context.eventId,
      eventTitle: context.eventTitle || 'Event',
      eventDate: context.eventDate,
      eventEndDate: context.eventEndDate,
      eventMode: context.eventMode,
      eventLocation: context.eventLocation,
      onlineMeetingLink: context.onlineMeetingLink,
      recipientId: context.recipientId || response.partnerEmail,
      recipientUsername: context.recipientUsername,
      recipientEmail: response.partnerEmail || context.recipientEmail,
      recipientName: response.partnerName || context.recipientName,
      senderId: context.senderId,
      senderUsername: context.senderUsername,
      senderName: context.senderName,
      status: context.status,
      sentAt: this.toDate(response.createdAt),
      respondedAt: context.respondedAt,
      expiresAt: context.expiresAt,
      message: context.message,
      responseReason: context.responseReason,
      isExternalPartner: true,
      isVerifiedByDsn: response.accessApproved,
      verifiedBy: context.verifiedBy,
      verifiedAt: context.verifiedAt,
      partnerOrganization: context.partnerOrganization,
    };
  }

  private toDate(value?: Date | string): Date {
    if (!value) {
      return new Date();
    }
    if (value instanceof Date) {
      return value;
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  }

  private canReadPartnerInvitationsFromBackend(): boolean {
    return true;
  }
}
