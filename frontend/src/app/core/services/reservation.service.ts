import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, catchError, map, of, switchMap, tap, throwError } from 'rxjs';
import { buildApiUrl, extractPageContent, ApiPageResponse } from '../config/backend-api.config';
import {
  Room,
  RoomReservation,
  Equipment,
  EquipmentReservation,
  RoomAvailability,
} from '../models';

type BackendReservationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

interface BackendRoomResponse {
  id: string;
  name: string;
  location: string;
  description?: string;
  imageUrl?: string | null;
  capacity: number;
  status?: 'DISPONIBLE' | 'OCCUPEE' | 'MAINTENANCE' | 'INACTIVE';
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface BackendEquipmentResponse {
  id: string;
  name: string;
  serialNumber: string;
  description?: string;
  type?: string;
  location?: string;
  totalQuantity?: number;
  availableQuantity?: number;
  status?: 'DISPONIBLE' | 'OCCUPE' | 'MAINTENANCE' | 'INACTIVE';
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface BackendReservationResponse {
  id: string;
  eventId?: string | null;
  eventMode: 'PRESENTIEL' | 'EN_LIGNE' | 'HYBRIDE';
  referenceCode?: string;
  businessVersion?: number;
  roomId?: string | null;
  equipmentId?: string | null;
  quantityRequested?: number;
  requesterUsername: string;
  startAt: string;
  endAt: string;
  purpose?: string;
  status: BackendReservationStatus;
  securityCheckedBy?: string | null;
  securityCheckedAt?: string | null;
  securityDecisionComment?: string | null;
  rejectionReason?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

interface BackendSecurityValidationRequest {
  approved: boolean;
  decisionComment?: string;
}

interface BackendReservationCreateRequest {
  eventId?: string | null;
  roomId?: string;
  equipmentId?: string;
  quantityRequested?: number;
  startAt: string;
  endAt: string;
  purpose: string;
}

interface BackendConflictCheckResponse {
  conflict: boolean;
}

export interface RoomQueryOptions {
  page?: number;
  size?: number;
  sort?: string;
  search?: string;
  active?: boolean;
  minCapacity?: number;
}

export interface EquipmentQueryOptions {
  page?: number;
  size?: number;
  sort?: string;
  search?: string;
  active?: boolean;
}

export interface ReservationQueryOptions {
  page?: number;
  size?: number;
  sort?: string;
  eventId?: string;
  status?: BackendReservationStatus;
  requesterUsername?: string;
  roomId?: string;
  equipmentId?: string;
  eventMode?: 'PRESENTIEL' | 'EN_LIGNE' | 'HYBRIDE';
  search?: string;
}

export interface ReservationPageState {
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface RoomReservationBookingInput extends Omit<RoomReservation, 'id' | 'createdAt' | 'updatedAt' | 'status'> {
  eventId?: string;
}

export interface EquipmentReservationBookingInput extends Omit<EquipmentReservation, 'id' | 'createdAt' | 'updatedAt' | 'status'> {
  eventId?: string;
  quantityRequested?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ReservationService {
  private roomsSubject = new BehaviorSubject<Room[]>([]);
  public rooms$ = this.roomsSubject.asObservable();

  private equipmentSubject = new BehaviorSubject<Equipment[]>([]);
  public equipment$ = this.equipmentSubject.asObservable();

  private roomReservationsSubject = new BehaviorSubject<RoomReservation[]>([]);
  public roomReservations$ = this.roomReservationsSubject.asObservable();

  private equipmentReservationsSubject = new BehaviorSubject<EquipmentReservation[]>([]);
  public equipmentReservations$ = this.equipmentReservationsSubject.asObservable();
  private roomsPageStateSubject = new BehaviorSubject<ReservationPageState>({
    page: 0,
    size: 500,
    totalElements: 0,
    totalPages: 0,
  });
  public roomsPageState$ = this.roomsPageStateSubject.asObservable();

  private equipmentPageStateSubject = new BehaviorSubject<ReservationPageState>({
    page: 0,
    size: 500,
    totalElements: 0,
    totalPages: 0,
  });
  public equipmentPageState$ = this.equipmentPageStateSubject.asObservable();

  private roomReservationsPageStateSubject = new BehaviorSubject<ReservationPageState>({
    page: 0,
    size: 500,
    totalElements: 0,
    totalPages: 0,
  });
  public roomReservationsPageState$ = this.roomReservationsPageStateSubject.asObservable();

  private equipmentReservationsPageStateSubject = new BehaviorSubject<ReservationPageState>({
    page: 0,
    size: 500,
    totalElements: 0,
    totalPages: 0,
  });
  public equipmentReservationsPageState$ = this.equipmentReservationsPageStateSubject.asObservable();

  constructor(private http: HttpClient) {}

  // Room Methods
  getRooms(options: RoomQueryOptions = {}): Observable<Room[]> {
    if (!this.shouldUseBackendRequests()) {
      return of(this.roomsSubject.value);
    }

    if (!this.canReadRoomInventoryFromBackend()) {
      return of(this.roomsSubject.value);
    }

    let params = new URLSearchParams();
    params.set('page', String(options.page ?? 0));
    params.set('size', String(options.size ?? 500));
    params.set('sort', options.sort || 'name,asc');
    if (options.search?.trim()) {
      params.set('search', options.search.trim());
    }
    if (typeof options.active === 'boolean') {
      params.set('active', String(options.active));
    }
    if (typeof options.minCapacity === 'number') {
      params.set('minCapacity', String(options.minCapacity));
    }

    const request$ = this.http
      .get<ApiPageResponse<BackendRoomResponse>>(buildApiUrl('/api/v1/rooms'), {
        params: Object.fromEntries(params.entries()),
      })
      .pipe(
        map((response) => {
          this.roomsPageStateSubject.next({
            page: response.page ?? options.page ?? 0,
            size: response.size ?? options.size ?? 500,
            totalElements: response.totalElements ?? 0,
            totalPages: response.totalPages ?? 0,
          });
          return extractPageContent(response).map((item) => this.mapRoom(item));
        }),
        tap((rooms) => this.roomsSubject.next(rooms)),
      );

    return this.withFallback(request$, () => of(this.roomsSubject.value));
  }

  getRoomById(id: string): Observable<Room | undefined> {
    if (!this.shouldUseBackendRequests()) {
      return of(this.roomsSubject.value.find((item) => item.id === id));
    }

    if (!this.canReadRoomInventoryFromBackend()) {
      return of(this.roomsSubject.value.find((item) => item.id === id));
    }

    const request$ = this.http
      .get<BackendRoomResponse>(buildApiUrl(`/api/v1/rooms/${id}`))
      .pipe(map((room) => this.mapRoom(room)));

    return this.withFallback(request$, () => of(this.roomsSubject.value.find((item) => item.id === id)));
  }

  addRoom(room: Omit<Room, 'id' | 'createdAt'>): Observable<Room> {
    const payload = {
      name: room.name,
      location: room.location,
      description: room.description,
      imageUrl: room.imageUrl ?? null,
      capacity: room.capacity,
      status: room.status ?? (room.isActive ? 'DISPONIBLE' : 'INACTIVE'),
      active: room.isActive,
    };

    const request$ = this.http
      .post<BackendRoomResponse>(buildApiUrl('/api/v1/rooms'), payload)
      .pipe(
        map((response) => this.mapRoom(response)),
        tap((created) => this.roomsSubject.next([...this.roomsSubject.value, created])),
      );

    return this.withFallback(request$, () => {
      const created: Room = { ...room, id: this.generateId(), createdAt: new Date() };
      this.roomsSubject.next([...this.roomsSubject.value, created]);
      return of(created);
    });
  }

  updateRoom(id: string, updates: Partial<Room>): Observable<Room | null> {
    const existing = this.roomsSubject.value.find((room) => room.id === id);
    if (!existing) {
      return of(null);
    }

    const payload = {
      name: updates.name ?? existing.name,
      location: updates.location ?? existing.location,
      description: updates.description ?? existing.description,
      imageUrl: updates.imageUrl ?? existing.imageUrl ?? null,
      capacity: updates.capacity ?? existing.capacity,
      status: updates.status ?? existing.status ?? (existing.isActive ? 'DISPONIBLE' : 'INACTIVE'),
      active: updates.isActive ?? existing.isActive,
    };

    const request$ = this.http
      .put<BackendRoomResponse>(buildApiUrl(`/api/v1/rooms/${id}`), payload)
      .pipe(
        map((response) => this.mapRoom(response)),
        tap((updated) => this.replaceRoom(updated)),
      );

    return this.withFallback(request$, () => {
      const updated: Room = { ...existing, ...updates };
      this.replaceRoom(updated);
      return of(updated);
    });
  }

  deleteRoom(id: string): Observable<boolean> {
    const request$ = this.http
      .delete<void>(buildApiUrl(`/api/v1/rooms/${id}`))
      .pipe(
        map(() => true),
        tap(() => this.roomsSubject.next(this.roomsSubject.value.filter((room) => room.id !== id))),
      );

    return this.withFallback(request$, () => {
      this.roomsSubject.next(this.roomsSubject.value.filter((room) => room.id !== id));
      return of(true);
    });
  }

  // Equipment Methods
  getEquipment(options: EquipmentQueryOptions = {}): Observable<Equipment[]> {
    if (!this.shouldUseBackendRequests()) {
      return of(this.equipmentSubject.value);
    }

    if (!this.canReadEquipmentInventoryFromBackend()) {
      return of(this.equipmentSubject.value);
    }

    let params = new URLSearchParams();
    params.set('page', String(options.page ?? 0));
    params.set('size', String(options.size ?? 500));
    params.set('sort', options.sort || 'name,asc');
    if (options.search?.trim()) {
      params.set('search', options.search.trim());
    }
    if (typeof options.active === 'boolean') {
      params.set('active', String(options.active));
    }

    const request$ = this.http
      .get<ApiPageResponse<BackendEquipmentResponse>>(buildApiUrl('/api/v1/equipments'), {
        params: Object.fromEntries(params.entries()),
      })
      .pipe(
        map((response) => {
          this.equipmentPageStateSubject.next({
            page: response.page ?? options.page ?? 0,
            size: response.size ?? options.size ?? 500,
            totalElements: response.totalElements ?? 0,
            totalPages: response.totalPages ?? 0,
          });
          return extractPageContent(response).map((item) => this.mapEquipment(item));
        }),
        tap((equipment) => this.equipmentSubject.next(equipment)),
      );

    return this.withFallback(request$, () => of(this.equipmentSubject.value));
  }

  getEquipmentById(id: string): Observable<Equipment | undefined> {
    if (!this.shouldUseBackendRequests()) {
      return of(this.equipmentSubject.value.find((item) => item.id === id));
    }

    if (!this.canReadEquipmentInventoryFromBackend()) {
      return of(this.equipmentSubject.value.find((item) => item.id === id));
    }

    const request$ = this.http
      .get<BackendEquipmentResponse>(buildApiUrl(`/api/v1/equipments/${id}`))
      .pipe(map((response) => this.mapEquipment(response)));

    return this.withFallback(request$, () => of(this.equipmentSubject.value.find((item) => item.id === id)));
  }

  addEquipment(equipment: Omit<Equipment, 'id' | 'createdAt'>): Observable<Equipment> {
    const totalQuantity = equipment.totalQuantity && equipment.totalQuantity > 0 ? equipment.totalQuantity : 1;
    const availableQuantity = equipment.availableQuantity != null
      ? Math.max(0, Math.min(equipment.availableQuantity, totalQuantity))
      : totalQuantity;
    const payload = {
      name: equipment.name,
      serialNumber: equipment.serialNumber,
      description: equipment.description,
      type: equipment.type || equipment.name,
      location: equipment.location,
      totalQuantity,
      availableQuantity,
      status: this.toBackendEquipmentStatus(equipment.status, equipment.isActive ?? true),
      active: equipment.isActive ?? (equipment.status !== 'MAINTENANCE' && equipment.status !== 'RETIRED'),
    };

    const request$ = this.http
      .post<BackendEquipmentResponse>(buildApiUrl('/api/v1/equipments'), payload)
      .pipe(
        map((response) => this.mapEquipment(response)),
        tap((created) => this.equipmentSubject.next([...this.equipmentSubject.value, created])),
      );

    return this.withFallback(request$, () => {
      const created: Equipment = { ...equipment, id: this.generateId(), createdAt: new Date() };
      this.equipmentSubject.next([...this.equipmentSubject.value, created]);
      return of(created);
    });
  }

  updateEquipment(id: string, updates: Partial<Equipment>): Observable<Equipment | null> {
    const existing = this.equipmentSubject.value.find((item) => item.id === id);
    if (!existing) {
      return of(null);
    }

    const nextTotalQuantity = updates.totalQuantity != null
      ? Math.max(1, updates.totalQuantity)
      : (existing.totalQuantity && existing.totalQuantity > 0 ? existing.totalQuantity : 1);
    const nextAvailableQuantityRaw = updates.availableQuantity != null
      ? updates.availableQuantity
      : existing.availableQuantity ?? nextTotalQuantity;
    const nextAvailableQuantity = Math.max(0, Math.min(nextAvailableQuantityRaw, nextTotalQuantity));
    const nextStatus = updates.status ?? existing.status;
    const nextActive = updates.isActive ?? existing.isActive ?? (nextStatus !== 'MAINTENANCE' && nextStatus !== 'RETIRED');

    const payload = {
      name: updates.name ?? existing.name,
      serialNumber: updates.serialNumber ?? existing.serialNumber,
      description: updates.description ?? existing.description,
      type: updates.type ?? existing.type ?? existing.name,
      location: updates.location ?? existing.location,
      totalQuantity: nextTotalQuantity,
      availableQuantity: nextAvailableQuantity,
      status: this.toBackendEquipmentStatus(nextStatus, nextActive),
      active: nextActive,
    };

    const request$ = this.http
      .put<BackendEquipmentResponse>(buildApiUrl(`/api/v1/equipments/${id}`), payload)
      .pipe(
        map((response) => this.mapEquipment(response)),
        tap((updated) => this.replaceEquipment(updated)),
      );

    return this.withFallback(request$, () => {
      const updated: Equipment = { ...existing, ...updates };
      this.replaceEquipment(updated);
      return of(updated);
    });
  }

  deleteEquipment(id: string): Observable<boolean> {
    const request$ = this.http
      .delete<void>(buildApiUrl(`/api/v1/equipments/${id}`))
      .pipe(
        map(() => true),
        tap(() => this.equipmentSubject.next(this.equipmentSubject.value.filter((item) => item.id !== id))),
      );

    return this.withFallback(request$, () => {
      this.equipmentSubject.next(this.equipmentSubject.value.filter((item) => item.id !== id));
      return of(true);
    });
  }

  // Room Reservation Methods
  getRoomReservations(options: ReservationQueryOptions = {}): Observable<RoomReservation[]> {
    if (!this.shouldUseBackendRequests()) {
      return of(this.roomReservationsSubject.value);
    }

    const request$ = this.fetchReservations(options).pipe(
      map((response) => {
        this.roomReservationsPageStateSubject.next({
          page: response.page ?? options.page ?? 0,
          size: response.size ?? options.size ?? 500,
          totalElements: response.totalElements ?? 0,
          totalPages: response.totalPages ?? 0,
        });
        return extractPageContent(response).filter((item) => !!item.roomId).map((item) => this.mapRoomReservation(item));
      }),
      tap((mapped) => this.roomReservationsSubject.next(mapped)),
    );

    return this.withFallback(request$, () => of(this.roomReservationsSubject.value));
  }

  getRoomReservationsByRoom(roomId: string): Observable<RoomReservation[]> {
    return this.getRoomReservations().pipe(
      map((reservations) => reservations.filter((reservation) => reservation.roomId === roomId)),
    );
  }

  getPendingRoomReservations(): Observable<RoomReservation[]> {
    return this.getRoomReservations().pipe(
      map((reservations) => reservations.filter((reservation) => reservation.status === 'PENDING')),
    );
  }

  bookRoom(reservation: RoomReservationBookingInput): Observable<RoomReservation | null> {
    if (!this.shouldUseBackendRequests()) {
      const conflicts = this.checkRoomConflicts(reservation.roomId, reservation.startDate, reservation.endDate);
      if (conflicts.length > 0) {
        return of(null);
      }

      const created: RoomReservation = {
        ...reservation,
        id: this.generateId(),
        status: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.roomReservationsSubject.next([...this.roomReservationsSubject.value, created]);
      return of(created);
    }

    const payload: BackendReservationCreateRequest = {
      eventId: reservation.eventId?.trim() || null,
      roomId: reservation.roomId,
      startAt: reservation.startDate.toISOString(),
      endAt: reservation.endDate.toISOString(),
      purpose: reservation.purpose || reservation.title,
    };

    const createRequest$ = this.http
      .post<BackendReservationResponse>(buildApiUrl('/api/v1/reservations'), payload)
      .pipe(
        map((response) => this.mapRoomReservation(response)),
        tap((created) => this.roomReservationsSubject.next([...this.roomReservationsSubject.value, created])),
      );

    const request$ = this.checkBackendConflict(reservation.roomId, undefined, reservation.startDate, reservation.endDate).pipe(
      switchMap((hasConflict) => (hasConflict ? of(null) : createRequest$)),
    );

    return this.withFallback(request$, () => {
      const conflicts = this.checkRoomConflicts(reservation.roomId, reservation.startDate, reservation.endDate);
      if (conflicts.length > 0) {
        return of(null);
      }

      const created: RoomReservation = {
        ...reservation,
        id: this.generateId(),
        status: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.roomReservationsSubject.next([...this.roomReservationsSubject.value, created]);
      return of(created);
    });
  }

  getReservationConflicts(reservationId: string): Observable<RoomReservation[]> {
    const currentReservation = this.roomReservationsSubject.value.find((item) => item.id === reservationId);
    if (!currentReservation) {
      return of([]);
    }

    const conflicts = this.roomReservationsSubject.value.filter((reservation) =>
      reservation.id !== reservationId &&
      reservation.roomId === currentReservation.roomId &&
      (reservation.status === 'APPROVED' || reservation.status === 'PENDING') &&
      !(currentReservation.endDate <= reservation.startDate || currentReservation.startDate >= reservation.endDate),
    );

    return of(conflicts);
  }

  approveRoomReservation(id: string, approvedBy: string, decisionComment = ''): Observable<RoomReservation | null> {
    return this.securityValidateReservation(id, true, decisionComment, () => {
      const updated = this.roomReservationsSubject.value.find((reservation) => reservation.id === id) ?? null;
      if (!updated) {
        return of(null);
      }

      updated.status = 'APPROVED';
      updated.approvedBy = approvedBy;
      updated.approvalDate = new Date();
      updated.rejectionReason = undefined;
      updated.updatedAt = new Date();
      this.roomReservationsSubject.next([...this.roomReservationsSubject.value]);
      return of(updated);
    });
  }

  rejectRoomReservation(id: string, approvedBy: string, decisionComment = ''): Observable<RoomReservation | null> {
    return this.securityValidateReservation(id, false, decisionComment, () => {
      const updated = this.roomReservationsSubject.value.find((reservation) => reservation.id === id) ?? null;
      if (!updated) {
        return of(null);
      }

      updated.status = 'REJECTED';
      updated.approvedBy = approvedBy;
      updated.approvalDate = new Date();
      updated.rejectionReason = decisionComment || 'Refus';
      updated.updatedAt = new Date();
      this.roomReservationsSubject.next([...this.roomReservationsSubject.value]);
      return of(updated);
    });
  }

  cancelRoomReservation(id: string): Observable<RoomReservation | null> {
    const reservation = this.roomReservationsSubject.value.find((item) => item.id === id) ?? null;
    if (!reservation) {
      return of(null);
    }

    reservation.status = 'CANCELLED';
    reservation.updatedAt = new Date();
    this.roomReservationsSubject.next([...this.roomReservationsSubject.value]);
    return of(reservation);
  }

  getRoomAvailability(roomId: string, date: Date): Observable<RoomAvailability> {
    const reservations = this.roomReservationsSubject.value.filter((reservation) =>
      reservation.roomId === roomId &&
      reservation.startDate.toDateString() === date.toDateString() &&
      (reservation.status === 'APPROVED' || reservation.status === 'PENDING'),
    );

    const occupiedSlots = reservations.map((reservation) => ({
      startTime: this.timeToString(reservation.startDate),
      endTime: this.timeToString(reservation.endDate),
    }));

    const availability: RoomAvailability = {
      roomId,
      date,
      availableTimeSlots: this.calculateAvailableSlots(occupiedSlots),
    };

    return of(availability);
  }

  checkRoomConflict(roomId: string, startAt: Date, endAt: Date): Observable<boolean> {
    if (!roomId) {
      return of(false);
    }

    const safeStart = startAt instanceof Date ? startAt : new Date(startAt);
    const safeEnd = endAt instanceof Date ? endAt : new Date(endAt);
    if (Number.isNaN(safeStart.getTime()) || Number.isNaN(safeEnd.getTime())) {
      return of(false);
    }

    return this.checkBackendConflict(roomId, undefined, safeStart, safeEnd);
  }

  // Equipment Reservation Methods
  getEquipmentReservations(options: ReservationQueryOptions = {}): Observable<EquipmentReservation[]> {
    if (!this.shouldUseBackendRequests()) {
      return of(this.equipmentReservationsSubject.value);
    }

    const request$ = this.fetchReservations(options).pipe(
      map((response) => {
        this.equipmentReservationsPageStateSubject.next({
          page: response.page ?? options.page ?? 0,
          size: response.size ?? options.size ?? 500,
          totalElements: response.totalElements ?? 0,
          totalPages: response.totalPages ?? 0,
        });
        return extractPageContent(response).filter((item) => !!item.equipmentId).map((item) => this.mapEquipmentReservation(item));
      }),
      tap((mapped) => this.equipmentReservationsSubject.next(mapped)),
    );

    return this.withFallback(request$, () => of(this.equipmentReservationsSubject.value));
  }

  getEquipmentReservationsByEquipment(equipmentId: string): Observable<EquipmentReservation[]> {
    return this.getEquipmentReservations().pipe(
      map((reservations) => reservations.filter((reservation) => reservation.equipmentId === equipmentId)),
    );
  }

  getPendingEquipmentReservations(): Observable<EquipmentReservation[]> {
    return this.getEquipmentReservations().pipe(
      map((reservations) => reservations.filter((reservation) => reservation.status === 'PENDING')),
    );
  }

  reserveEquipment(reservation: EquipmentReservationBookingInput): Observable<EquipmentReservation | null> {
    if (!this.shouldUseBackendRequests()) {
      const equipment = this.equipmentSubject.value.find((item) => item.id === reservation.equipmentId);
      if (!equipment || equipment.status === 'MAINTENANCE' || equipment.status === 'RETIRED') {
        return of(null);
      }
      const requestedQuantity = reservation.quantityRequested && reservation.quantityRequested > 0
        ? reservation.quantityRequested
        : 1;
      const totalQuantity = equipment.totalQuantity ?? 1;
      const availableQuantity = equipment.availableQuantity ?? totalQuantity;
      if (availableQuantity < requestedQuantity) {
        return of(null);
      }

      const created: EquipmentReservation = {
        ...reservation,
        quantityRequested: requestedQuantity,
        id: this.generateId(),
        status: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.equipmentReservationsSubject.next([...this.equipmentReservationsSubject.value, created]);
      return of(created);
    }

    const requestedQuantity = reservation.quantityRequested && reservation.quantityRequested > 0
      ? reservation.quantityRequested
      : 1;
    const payload: BackendReservationCreateRequest = {
      eventId: reservation.eventId?.trim() || null,
      equipmentId: reservation.equipmentId,
      quantityRequested: requestedQuantity,
      startAt: reservation.startDate.toISOString(),
      endAt: reservation.endDate.toISOString(),
      purpose: reservation.purpose,
    };

    const createRequest$ = this.http
      .post<BackendReservationResponse>(buildApiUrl('/api/v1/reservations'), payload)
      .pipe(
        map((response) => this.mapEquipmentReservation(response)),
        tap((created) => this.equipmentReservationsSubject.next([...this.equipmentReservationsSubject.value, created])),
      );

    const request$ = this.checkBackendConflict(undefined, reservation.equipmentId, reservation.startDate, reservation.endDate, requestedQuantity).pipe(
      switchMap((hasConflict) => (hasConflict ? of(null) : createRequest$)),
    );

    return this.withFallback(request$, () => {
      const equipment = this.equipmentSubject.value.find((item) => item.id === reservation.equipmentId);
      if (!equipment || equipment.status === 'MAINTENANCE' || equipment.status === 'RETIRED') {
        return of(null);
      }
      const requestedQuantity = reservation.quantityRequested && reservation.quantityRequested > 0
        ? reservation.quantityRequested
        : 1;
      const totalQuantity = equipment.totalQuantity ?? 1;
      const availableQuantity = equipment.availableQuantity ?? totalQuantity;
      if (availableQuantity < requestedQuantity) {
        return of(null);
      }

      const created: EquipmentReservation = {
        ...reservation,
        quantityRequested: requestedQuantity,
        id: this.generateId(),
        status: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.equipmentReservationsSubject.next([...this.equipmentReservationsSubject.value, created]);
      return of(created);
    });
  }

  approveEquipmentReservation(id: string, approvedBy: string, decisionComment = ''): Observable<EquipmentReservation | null> {
    return this.securityValidateEquipmentReservation(id, true, decisionComment, () => {
      const reservation = this.equipmentReservationsSubject.value.find((item) => item.id === id) ?? null;
      if (!reservation) {
        return of(null);
      }

      reservation.status = 'APPROVED';
      reservation.approvedBy = approvedBy;
      reservation.approvalDate = new Date();
      reservation.rejectionReason = undefined;
      reservation.updatedAt = new Date();
      this.equipmentReservationsSubject.next([...this.equipmentReservationsSubject.value]);
      return of(reservation);
    });
  }

  rejectEquipmentReservation(id: string, approvedBy: string, decisionComment = ''): Observable<EquipmentReservation | null> {
    return this.securityValidateEquipmentReservation(id, false, decisionComment, () => {
      const reservation = this.equipmentReservationsSubject.value.find((item) => item.id === id) ?? null;
      if (!reservation) {
        return of(null);
      }

      reservation.status = 'CANCELLED';
      reservation.approvedBy = approvedBy;
      reservation.updatedAt = new Date();
      reservation.approvalDate = new Date();
      reservation.rejectionReason = decisionComment || 'Refus';
      this.equipmentReservationsSubject.next([...this.equipmentReservationsSubject.value]);
      return of(reservation);
    });
  }

  pickupEquipment(id: string): Observable<EquipmentReservation | null> {
    return this.unsupportedOperation(
      'Retrait equipement non persiste desactive: aucun endpoint backend ne sauvegarde cet etat.',
    );
  }

  returnEquipment(id: string): Observable<EquipmentReservation | null> {
    return this.unsupportedOperation(
      'Retour equipement non persiste desactive: aucun endpoint backend ne sauvegarde cet etat.',
    );
  }

  private fetchReservations(options: ReservationQueryOptions = {}): Observable<ApiPageResponse<BackendReservationResponse>> {
    let params = new URLSearchParams();
    params.set('page', String(options.page ?? 0));
    params.set('size', String(options.size ?? 500));
    params.set('sort', options.sort || 'createdAt,desc');
    if (options.eventId) {
      params.set('eventId', options.eventId);
    }
    if (options.status) {
      params.set('status', options.status);
    }
    if (options.requesterUsername?.trim()) {
      params.set('requesterUsername', options.requesterUsername.trim());
    }
    if (options.roomId) {
      params.set('roomId', options.roomId);
    }
    if (options.equipmentId) {
      params.set('equipmentId', options.equipmentId);
    }
    if (options.eventMode) {
      params.set('eventMode', options.eventMode);
    }
    if (options.search?.trim()) {
      params.set('search', options.search.trim());
    }

    return this.http
      .get<ApiPageResponse<BackendReservationResponse>>(buildApiUrl('/api/v1/reservations'), {
        params: Object.fromEntries(params.entries()),
      })
      .pipe(map((response) => response));
  }

  private securityValidateReservation(
    id: string,
    approved: boolean,
    decisionComment: string,
    fallbackFactory: () => Observable<RoomReservation | null>,
  ): Observable<RoomReservation | null> {
    const requestBody: BackendSecurityValidationRequest = {
      approved,
      decisionComment: decisionComment.trim() || undefined,
    };

    const request$ = this.http
      .put<BackendReservationResponse>(buildApiUrl(`/api/v1/reservations/${id}/security-validation`), requestBody)
      .pipe(
        map((response) => this.mapRoomReservation(response)),
        tap((updated) => this.replaceRoomReservation(updated)),
      );

    return this.withFallback(request$, fallbackFactory);
  }

  private securityValidateEquipmentReservation(
    id: string,
    approved: boolean,
    decisionComment: string,
    fallbackFactory: () => Observable<EquipmentReservation | null>,
  ): Observable<EquipmentReservation | null> {
    const requestBody: BackendSecurityValidationRequest = {
      approved,
      decisionComment: decisionComment.trim() || undefined,
    };

    const request$ = this.http
      .put<BackendReservationResponse>(buildApiUrl(`/api/v1/reservations/${id}/security-validation`), requestBody)
      .pipe(
        map((response) => this.mapEquipmentReservation(response)),
        tap((updated) => this.replaceEquipmentReservation(updated)),
      );

    return this.withFallback(request$, fallbackFactory);
  }

  private mapRoom(response: BackendRoomResponse): Room {
    const status = response.status ?? (response.active ? 'DISPONIBLE' : 'INACTIVE');
    return {
      id: response.id,
      name: response.name,
      description: response.description || `Salle ${response.name} - ${response.location}`,
      capacity: response.capacity,
      location: response.location,
      imageUrl: response.imageUrl || '',
      status,
      amenities: [],
      isActive: response.active,
      createdAt: this.toDate(response.createdAt),
    };
  }

  private mapEquipment(response: BackendEquipmentResponse): Equipment {
    const category = this.inferEquipmentCategory(response.type || response.name, response.description || '');
    const status = this.toFrontendEquipmentStatus(response.status, response.active);
    const totalQuantity = response.totalQuantity && response.totalQuantity > 0 ? response.totalQuantity : 1;
    const availableQuantity = response.availableQuantity != null
      ? Math.max(0, Math.min(response.availableQuantity, totalQuantity))
      : totalQuantity;

    return {
      id: response.id,
      name: response.name,
      description: response.description || '',
      category,
      type: response.type || response.name,
      serialNumber: response.serialNumber,
      status,
      totalQuantity,
      availableQuantity,
      isActive: response.active,
      location: response.location || 'Stock central',
      createdAt: this.toDate(response.createdAt),
    };
  }

  private mapRoomReservation(response: BackendReservationResponse): RoomReservation {
    const roomId = response.roomId ?? '';
    const roomName = this.roomsSubject.value.find((room) => room.id === roomId)?.name || 'Salle';
    const approvalDate = response.securityCheckedAt ? this.toDate(response.securityCheckedAt) : undefined;
    const approvedBy = response.securityCheckedBy || undefined;
    const rejectionReason = response.rejectionReason || undefined;

    return {
      id: response.id,
      referenceCode: response.referenceCode || undefined,
      businessVersion: response.businessVersion ?? 1,
      eventId: response.eventId || undefined,
      roomId,
      roomName,
      userId: response.requesterUsername,
      userName: response.requesterUsername,
      title: response.purpose || 'Reservation de salle',
      purpose: response.purpose || '',
      startDate: this.toDate(response.startAt),
      endDate: this.toDate(response.endAt),
      attendeeCount: 1,
      status: this.toRoomReservationStatus(response.status),
      approvedBy,
      approvalDate,
      rejectionReason,
      createdAt: this.toDate(response.createdAt),
      updatedAt: this.toDate(response.updatedAt),
    };
  }

  private mapEquipmentReservation(response: BackendReservationResponse): EquipmentReservation {
    const equipmentId = response.equipmentId ?? '';
    const equipmentName = this.equipmentSubject.value.find((item) => item.id === equipmentId)?.name || 'Equipement';
    const approvalDate = response.securityCheckedAt ? this.toDate(response.securityCheckedAt) : undefined;
    const approvedBy = response.securityCheckedBy || undefined;
    const rejectionReason = response.rejectionReason || undefined;

    return {
      id: response.id,
      referenceCode: response.referenceCode || undefined,
      businessVersion: response.businessVersion ?? 1,
      eventId: response.eventId || undefined,
      equipmentId,
      equipmentName,
      quantityRequested: response.quantityRequested ?? 1,
      userId: response.requesterUsername,
      userName: response.requesterUsername,
      purpose: response.purpose || '',
      startDate: this.toDate(response.startAt),
      endDate: this.toDate(response.endAt),
      status: this.toEquipmentReservationStatus(response.status),
      approvedBy,
      approvalDate,
      rejectionReason,
      createdAt: this.toDate(response.createdAt),
      updatedAt: this.toDate(response.updatedAt),
    };
  }

  private toRoomReservationStatus(status: BackendReservationStatus): RoomReservation['status'] {
    if (status === 'APPROVED') {
      return 'APPROVED';
    }
    if (status === 'REJECTED') {
      return 'REJECTED';
    }
    return 'PENDING';
  }

  private toEquipmentReservationStatus(status: BackendReservationStatus): EquipmentReservation['status'] {
    if (status === 'APPROVED') {
      return 'APPROVED';
    }
    if (status === 'REJECTED') {
      return 'CANCELLED';
    }
    return 'PENDING';
  }

  private inferEquipmentCategory(name: string, description: string): Equipment['category'] {
    const text = `${name} ${description}`.toLowerCase();
    if (text.includes('projector') || text.includes('projecteur')) {
      return 'PROJECTOR';
    }
    if (text.includes('laptop') || text.includes('ordinateur')) {
      return 'LAPTOP';
    }
    if (text.includes('camera') || text.includes('cam')) {
      return 'CAMERA';
    }
    if (text.includes('micro')) {
      return 'MICROPHONE';
    }
    if (text.includes('screen') || text.includes('ecran')) {
      return 'SCREEN';
    }
    return 'OTHER';
  }

  private toFrontendEquipmentStatus(
    status: BackendEquipmentResponse['status'],
    active: boolean,
  ): Equipment['status'] {
    if (!active) {
      return 'RETIRED';
    }
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

  private toBackendEquipmentStatus(
    status: Equipment['status'],
    active: boolean,
  ): 'DISPONIBLE' | 'OCCUPE' | 'MAINTENANCE' | 'INACTIVE' {
    if (!active) {
      return 'INACTIVE';
    }
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

  private replaceRoom(updated: Room): void {
    const rooms = this.roomsSubject.value.map((room) => (room.id === updated.id ? updated : room));
    this.roomsSubject.next(rooms);
  }

  private replaceEquipment(updated: Equipment): void {
    const equipment = this.equipmentSubject.value.map((item) => (item.id === updated.id ? updated : item));
    this.equipmentSubject.next(equipment);
  }

  private replaceRoomReservation(updated: RoomReservation): void {
    const reservations = this.roomReservationsSubject.value;
    const index = reservations.findIndex((reservation) => reservation.id === updated.id);
    if (index < 0) {
      this.roomReservationsSubject.next([...reservations, updated]);
      return;
    }

    reservations[index] = updated;
    this.roomReservationsSubject.next([...reservations]);
  }

  private replaceEquipmentReservation(updated: EquipmentReservation): void {
    const reservations = this.equipmentReservationsSubject.value;
    const index = reservations.findIndex((reservation) => reservation.id === updated.id);
    if (index < 0) {
      this.equipmentReservationsSubject.next([...reservations, updated]);
      return;
    }

    reservations[index] = updated;
    this.equipmentReservationsSubject.next([...reservations]);
  }

  private checkRoomConflicts(roomId: string, startDate: Date, endDate: Date): RoomReservation[] {
    return this.roomReservationsSubject.value.filter((reservation) =>
      reservation.roomId === roomId &&
      (reservation.status === 'APPROVED' || reservation.status === 'PENDING') &&
      !(endDate <= reservation.startDate || startDate >= reservation.endDate),
    );
  }

  private checkBackendConflict(
    roomId: string | undefined,
    equipmentId: string | undefined,
    startAt: Date,
    endAt: Date,
    quantityRequested = 1,
  ): Observable<boolean> {
    if (!this.shouldUseBackendRequests() || !this.canCheckConflictsFromBackend()) {
      return of(false);
    }

    const params: Record<string, string> = {
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString(),
    };

    if (roomId) {
      params['roomId'] = roomId;
    }
    if (equipmentId) {
      params['equipmentId'] = equipmentId;
      params['quantityRequested'] = String(Math.max(1, quantityRequested));
    }

    return this.http
      .get<BackendConflictCheckResponse>(buildApiUrl('/api/v1/reservations/conflicts'), { params })
      .pipe(
        map((response) => !!response.conflict),
        catchError((error) => throwError(() => error)),
      );
  }

  private canReadRoomInventoryFromBackend(): boolean {
    return true;
  }

  private canReadEquipmentInventoryFromBackend(): boolean {
    return true;
  }

  private canCheckConflictsFromBackend(): boolean {
    return true;
  }

  private shouldUseBackendRequests(): boolean {
    return true;
  }

  private timeToString(date: Date): string {
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }

  private calculateAvailableSlots(occupiedSlots: { startTime: string; endTime: string }[]): { startTime: string; endTime: string }[] {
    const slots: Array<{ startTime: string; endTime: string }> = [];

    if (!occupiedSlots.some((slot) => slot.startTime < '12:00' && slot.endTime > '09:00')) {
      slots.push({ startTime: '09:00', endTime: '12:00' });
    }
    if (!occupiedSlots.some((slot) => slot.startTime < '17:00' && slot.endTime > '14:00')) {
      slots.push({ startTime: '14:00', endTime: '17:00' });
    }

    return slots;
  }

  private toDate(value?: string): Date {
    if (!value) {
      return new Date();
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
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

  downloadLatestOfficialDocument(reservationId: string): Observable<boolean> {
    return this.http
      .get(buildApiUrl(`/api/v1/reservations/${reservationId}/documents/latest/download`), {
        observe: 'response',
        responseType: 'blob',
      })
      .pipe(
        map((response) => {
          const blob = response.body;
          if (!blob) {
            throw new Error('Document PDF indisponible.');
          }

          const filename = this.resolveFileName(
            response.headers.get('content-disposition'),
            `reservation-${reservationId}.pdf`,
          );
          this.triggerFileDownload(blob, filename);
          return true;
        }),
      );
  }

  private resolveFileName(contentDisposition: string | null, fallback: string): string {
    if (!contentDisposition) {
      return fallback;
    }

    const quotedMatch = /filename=\"([^\"]+)\"/i.exec(contentDisposition);
    if (quotedMatch?.[1]) {
      return quotedMatch[1];
    }

    const simpleMatch = /filename=([^;]+)/i.exec(contentDisposition);
    if (simpleMatch?.[1]) {
      return simpleMatch[1].trim();
    }

    return fallback;
  }

  private triggerFileDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }
}
