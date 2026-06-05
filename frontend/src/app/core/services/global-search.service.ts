import { Injectable } from '@angular/core';
import { Observable, catchError, forkJoin, map, of } from 'rxjs';
import {
  Document,
  Equipment,
  Event,
  Intervention,
  ItEquipment,
  ItIntervention,
  Notification,
  Room,
} from '../models';
import { AuthService } from './auth.service';
import { DocumentService } from './document.service';
import { EventService } from './event.service';
import { InterventionService } from './intervention.service';
import { ItEquipmentService } from './it-equipment.service';
import { ItInterventionService } from './it-intervention.service';
import { NotificationService } from './notification.service';
import { ReservationService } from './reservation.service';

export type GlobalSearchGroupId =
  | 'documents'
  | 'events'
  | 'rooms'
  | 'reservation-equipment'
  | 'it-equipment'
  | 'logistic-interventions'
  | 'it-interventions'
  | 'notifications';

export interface GlobalSearchResult {
  id: string;
  title: string;
  description: string;
  moduleLabel: string;
  typeLabel: string;
  route: string;
  queryParams?: Record<string, string>;
  meta: string[];
  date?: Date;
}

export interface GlobalSearchGroup {
  id: GlobalSearchGroupId;
  label: string;
  route: string;
  queryParams: Record<string, string>;
  results: GlobalSearchResult[];
  total: number;
  error?: boolean;
}

export interface GlobalSearchResponse {
  query: string;
  groups: GlobalSearchGroup[];
  totalResults: number;
  generatedAt: Date;
}

type SearchProvider = {
  id: GlobalSearchGroupId;
  label: string;
  route: string;
  queryParams: Record<string, string>;
  results$: Observable<GlobalSearchResult[]>;
};

@Injectable({
  providedIn: 'root',
})
export class GlobalSearchService {
  private readonly resultLimit = 5;

  constructor(
    private authService: AuthService,
    private documentService: DocumentService,
    private eventService: EventService,
    private reservationService: ReservationService,
    private interventionService: InterventionService,
    private itEquipmentService: ItEquipmentService,
    private itInterventionService: ItInterventionService,
    private notificationService: NotificationService,
  ) {}

  search(rawQuery: string): Observable<GlobalSearchResponse> {
    const query = rawQuery.trim();

    if (!query) {
      return of(this.emptyResponse(''));
    }

    const providers = this.buildProviders(query);
    if (providers.length === 0) {
      return of(this.emptyResponse(query));
    }

    return forkJoin(providers.map((provider) => this.toGroup(provider))).pipe(
      map((groups) => {
        const visibleGroups = groups.filter((group) => group.results.length > 0 || group.error);
        return {
          query,
          groups: visibleGroups,
          totalResults: visibleGroups.reduce((sum, group) => sum + group.total, 0),
          generatedAt: new Date(),
        };
      }),
    );
  }

  private buildProviders(query: string): SearchProvider[] {
    const providers: SearchProvider[] = [];

    if (this.canViewGed()) {
      const searchQuery = this.toScopedQuery(query, ['ged', 'document', 'documents']);
      providers.push({
        id: 'documents',
        label: 'Documents GED',
        route: '/documents',
        queryParams: this.toQueryParams(searchQuery),
        results$: this.documentService.getDocuments({ search: searchQuery || undefined, page: 0, size: this.resultLimit }).pipe(
          map((documents) => documents.map((document) => this.mapDocument(document, searchQuery))),
        ),
      });
    }

    if (this.canViewEvents()) {
      const searchQuery = this.toScopedQuery(query, ['calendrier', 'event', 'events', 'evenement', 'evenements']);
      providers.push({
        id: 'events',
        label: 'Evenements',
        route: '/events',
        queryParams: this.toQueryParams(searchQuery),
        results$: this.eventService.getEvents({ search: searchQuery || undefined, page: 0, size: this.resultLimit }).pipe(
          map((events) => events.map((event) => this.mapEvent(event, searchQuery))),
        ),
      });
    }

    if (this.canViewReservations()) {
      const roomSearchQuery = this.toScopedQuery(query, ['reservation', 'reservations', 'salle', 'salles']);
      providers.push({
        id: 'rooms',
        label: 'Salles',
        route: '/reservations/salles',
        queryParams: this.toQueryParams(roomSearchQuery),
        results$: this.reservationService.getRooms({ search: roomSearchQuery || undefined, page: 0, size: this.resultLimit }).pipe(
          map((rooms) => rooms.map((room) => this.mapRoom(room, roomSearchQuery))),
        ),
      });

      const equipmentSearchQuery = this.toScopedQuery(query, [
        'equipment',
        'equipement',
        'equipements',
        'materiel',
        'reservation',
        'reservations',
      ]);
      providers.push({
        id: 'reservation-equipment',
        label: 'Equipements de reservation',
        route: '/reservations/equipements',
        queryParams: this.toQueryParams(equipmentSearchQuery),
        results$: this.reservationService.getEquipment({ search: equipmentSearchQuery || undefined, page: 0, size: this.resultLimit }).pipe(
          map((equipment) => equipment.map((item) => this.mapReservationEquipment(item, equipmentSearchQuery))),
        ),
      });
    }

    if (this.canViewItEquipment()) {
      const searchQuery = this.toScopedQuery(query, ['equipment', 'equipement', 'equipements', 'it', 'materiel', 'parc']);
      providers.push({
        id: 'it-equipment',
        label: 'Parc IT',
        route: '/it/equipements',
        queryParams: this.toQueryParams(searchQuery),
        results$: this.itEquipmentService.listEquipments({ search: searchQuery || undefined, page: 0, size: this.resultLimit }).pipe(
          map((page) => (page.content ?? []).map((equipment) => this.mapItEquipment(equipment, searchQuery))),
        ),
      });
    }

    if (this.canViewLogisticInterventions()) {
      const searchQuery = this.toScopedQuery(query, ['intervention', 'interventions', 'logistique', 'logistiques']);
      providers.push({
        id: 'logistic-interventions',
        label: 'Interventions logistiques',
        route: '/interventions',
        queryParams: this.toQueryParams(searchQuery),
        results$: this.interventionService.getInterventions({ search: searchQuery || undefined, page: 0, size: this.resultLimit }).pipe(
          map((interventions) => interventions.map((intervention) => this.mapLogisticIntervention(intervention, searchQuery))),
        ),
      });
    }

    if (this.canViewItInterventions()) {
      const searchQuery = this.toScopedQuery(query, ['intervention', 'interventions', 'it', 'support']);
      providers.push({
        id: 'it-interventions',
        label: 'Interventions IT',
        route: '/it/interventions',
        queryParams: this.toQueryParams(searchQuery),
        results$: this.fetchItInterventions().pipe(
          map((items) => this.filterItInterventions(items, searchQuery).map((item) => this.mapItIntervention(item, searchQuery))),
        ),
      });
    }

    if (this.authService.isAuthenticated()) {
      const searchQuery = this.toScopedQuery(query, ['email', 'mail', 'message', 'messages', 'notification', 'notifications']);
      providers.push({
        id: 'notifications',
        label: 'Notifications',
        route: '/notifications',
        queryParams: this.toQueryParams(searchQuery),
        results$: this.notificationService.getNotifications({ search: searchQuery || undefined, page: 0, size: this.resultLimit }).pipe(
          map((notifications) => notifications.map((notification) => this.mapNotification(notification, searchQuery))),
        ),
      });
    }

    return providers;
  }

  private toGroup(provider: SearchProvider): Observable<GlobalSearchGroup> {
    return provider.results$.pipe(
      map((results) => ({
        id: provider.id,
        label: provider.label,
        route: provider.route,
        queryParams: provider.queryParams,
        results: this.sortResults(results).slice(0, this.resultLimit),
        total: results.length,
      })),
      catchError(() => of({
        id: provider.id,
        label: provider.label,
        route: provider.route,
        queryParams: provider.queryParams,
        results: [],
        total: 0,
        error: true,
      })),
    );
  }

  private fetchItInterventions(): Observable<ItIntervention[]> {
    const page = 0;
    const size = 50;

    if (this.authService.hasRole('ADMIN')) {
      return this.itInterventionService.listAll(page, size).pipe(map((response) => response.content ?? []));
    }
    if (this.authService.hasRole('IT_MANAGER')) {
      return this.itInterventionService.listProcessing(page, size).pipe(map((response) => response.content ?? []));
    }
    if (this.authService.hasRole('DSN_DIRECTOR')) {
      return this.itInterventionService.listDsn(page, size).pipe(map((response) => response.content ?? []));
    }
    if (this.authService.hasRole('MANAGER')) {
      return this.itInterventionService.listManager(page, size).pipe(map((response) => response.content ?? []));
    }
    return this.itInterventionService.listMine(page, size).pipe(map((response) => response.content ?? []));
  }

  private filterItInterventions(items: ItIntervention[], query: string): ItIntervention[] {
    const term = this.normalize(query);
    if (!term) {
      return items.slice(0, this.resultLimit);
    }
    return items.filter((item) => this.normalize([
      item.title,
      item.description,
      item.equipmentName,
      item.equipmentSerialNumber,
      item.equipmentCategory,
      item.requestedBy,
      item.requesterName,
      item.itWorkflowStatus,
    ].join(' ')).includes(term));
  }

  private mapDocument(document: Document, query: string): GlobalSearchResult {
    return {
      id: document.id,
      title: document.title || document.referenceCode || 'Document',
      description: document.description || document.referenceCode || document.category?.name || '',
      moduleLabel: 'GED',
      typeLabel: 'Document',
      route: '/documents',
      queryParams: this.toQueryParams(query),
      meta: this.compact([document.referenceCode, document.category?.name, document.gedStatus, document.ownerService]),
      date: document.updatedAt || document.uploadedAt,
    };
  }

  private mapEvent(event: Event, query: string): GlobalSearchResult {
    return {
      id: event.id,
      title: event.title || 'Evenement',
      description: event.description || event.location || '',
      moduleLabel: 'Evenements',
      typeLabel: 'Evenement',
      route: '/events',
      queryParams: this.toQueryParams(query, { eventId: event.id }),
      meta: this.compact([event.referenceCode, event.location, event.status, event.eventMode]),
      date: event.startDate,
    };
  }

  private mapRoom(room: Room, query: string): GlobalSearchResult {
    return {
      id: room.id,
      title: room.name || 'Salle',
      description: room.description || room.location || '',
      moduleLabel: 'Reservations',
      typeLabel: 'Salle',
      route: '/reservations/salles',
      queryParams: this.toQueryParams(query),
      meta: this.compact([room.location, `${room.capacity} places`, room.status]),
      date: room.createdAt,
    };
  }

  private mapReservationEquipment(equipment: Equipment, query: string): GlobalSearchResult {
    return {
      id: equipment.id,
      title: equipment.name || equipment.serialNumber || 'Equipement',
      description: equipment.description || equipment.location || '',
      moduleLabel: 'Reservations',
      typeLabel: 'Equipement',
      route: '/reservations/equipements',
      queryParams: this.toQueryParams(query),
      meta: this.compact([equipment.serialNumber, equipment.category, equipment.status, equipment.location]),
      date: equipment.createdAt,
    };
  }

  private mapItEquipment(equipment: ItEquipment, query: string): GlobalSearchResult {
    return {
      id: equipment.id,
      title: equipment.name || equipment.serialNumber || 'Equipement IT',
      description: equipment.description || equipment.categoryName || '',
      moduleLabel: 'Parc IT',
      typeLabel: 'Equipement IT',
      route: '/it/equipements',
      queryParams: this.toQueryParams(query),
      meta: this.compact([equipment.serialNumber, equipment.categoryName, equipment.state, equipment.assignmentStatus]),
      date: equipment.updatedAt || equipment.createdAt,
    };
  }

  private mapLogisticIntervention(intervention: Intervention, query: string): GlobalSearchResult {
    return {
      id: intervention.id,
      title: intervention.title || 'Intervention',
      description: intervention.description || intervention.location || '',
      moduleLabel: 'Interventions',
      typeLabel: 'Logistique',
      route: '/interventions',
      queryParams: this.toQueryParams(query),
      meta: this.compact([intervention.priority, intervention.status, intervention.location, intervention.requesterName]),
      date: intervention.updatedAt || intervention.createdAt,
    };
  }

  private mapItIntervention(intervention: ItIntervention, query: string): GlobalSearchResult {
    return {
      id: intervention.id,
      title: intervention.title || 'Intervention IT',
      description: intervention.description || intervention.equipmentName || '',
      moduleLabel: 'Interventions IT',
      typeLabel: 'IT',
      route: '/it/interventions',
      queryParams: this.toQueryParams(query),
      meta: this.compact([
        intervention.priority,
        intervention.itWorkflowStatus,
        intervention.equipmentName,
        intervention.requesterName || intervention.requestedBy,
      ]),
      date: intervention.updatedAt || intervention.createdAt,
    };
  }

  private mapNotification(notification: Notification, query: string): GlobalSearchResult {
    const actionUrl = notification.data?.actionUrl?.startsWith('/') ? notification.data.actionUrl : '/notifications';
    return {
      id: notification.id,
      title: notification.title || 'Notification',
      description: notification.message || '',
      moduleLabel: 'Notifications',
      typeLabel: 'Notification',
      route: actionUrl,
      queryParams: actionUrl === '/notifications' ? this.toQueryParams(query) : undefined,
      meta: this.compact([notification.type, notification.isRead ? 'Lue' : 'Non lue']),
      date: notification.createdAt,
    };
  }

  private sortResults(results: GlobalSearchResult[]): GlobalSearchResult[] {
    return [...results].sort((left, right) => {
      const rightDate = right.date?.getTime() ?? 0;
      const leftDate = left.date?.getTime() ?? 0;
      return rightDate - leftDate;
    });
  }

  private canViewGed(): boolean {
    return this.authService.isAuthenticated() && this.authService.hasAllPermissions(['VIEW_GED_MODULE']);
  }

  private canViewEvents(): boolean {
    return this.authService.isAuthenticated() && this.authService.hasAllPermissions(['VIEW_EVENTS_MODULE']);
  }

  private canViewReservations(): boolean {
    return this.authService.canAccess([
      'ADMIN',
      'EMPLOYEE',
      'MANAGER',
      'ROOM_MANAGER',
      'SECURITY_MANAGER',
      'DSN_DIRECTOR',
      'QUALITY_MANAGER',
    ]);
  }

  private canViewItEquipment(): boolean {
    return this.authService.canAccess(['ADMIN', 'IT_MANAGER']);
  }

  private canViewLogisticInterventions(): boolean {
    return this.authService.canAccess(['ADMIN', 'ROOM_MANAGER', 'EMPLOYEE', 'MANAGER'])
      && this.authService.hasAllPermissions(['VIEW_INTERVENTIONS_MODULE']);
  }

  private canViewItInterventions(): boolean {
    return this.authService.canAccess(['ADMIN', 'EMPLOYEE', 'MANAGER', 'DSN_DIRECTOR', 'IT_MANAGER'])
      && this.authService.hasAllPermissions(['VIEW_INTERVENTIONS_MODULE']);
  }

  private emptyResponse(query: string): GlobalSearchResponse {
    return {
      query,
      groups: [],
      totalResults: 0,
      generatedAt: new Date(),
    };
  }

  private compact(values: Array<string | number | null | undefined>): string[] {
    return values
      .map((value) => (value == null ? '' : String(value).trim()))
      .filter((value) => value.length > 0);
  }

  private normalize(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  private toScopedQuery(query: string, scopeWords: string[]): string {
    const normalizedScopeWords = new Set(scopeWords.map((word) => this.normalize(word)));
    const tokens = query.split(/\s+/).filter((token) => token.trim().length > 0);
    const filteredTokens = tokens.filter((token) => !normalizedScopeWords.has(this.normalize(token)));

    if (filteredTokens.length === tokens.length) {
      return query.trim();
    }

    return filteredTokens.join(' ').trim();
  }

  private toQueryParams(searchQuery: string, extras: Record<string, string> = {}): Record<string, string> {
    const params = { ...extras };
    const normalizedSearch = searchQuery.trim();
    if (normalizedSearch) {
      params['search'] = normalizedSearch;
    }
    return params;
  }
}
