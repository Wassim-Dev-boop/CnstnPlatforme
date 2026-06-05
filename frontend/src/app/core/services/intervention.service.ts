import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, catchError, map, of, tap, throwError } from 'rxjs';
import { ApiPageResponse, buildApiUrl, extractPageContent } from '../config/backend-api.config';
import {
  Intervention,
  InterventionAssignment,
  InterventionStatus,
  InterventionPriority,
  InterventionFilter,
} from '../models';

type BackendInterventionStatus = 'REQUESTED' | 'IN_PROGRESS' | 'COMPLETED' | 'VALIDATED' | 'REJECTED';

interface BackendInterventionResponse {
  id: string;
  title: string;
  description?: string;
  type?: Intervention['type'];
  priority?: InterventionPriority;
  location?: string;
  requestedBy: string;
  assignedTo?: string;
  status: BackendInterventionStatus;
  validationNote?: string;
  validatedBy?: string;
  resolution?: string;
  satisfactionRating?: number;
  resolvedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface BackendInterventionCreateRequest {
  title: string;
  description: string;
  type?: Intervention['type'];
  priority?: InterventionPriority;
  location?: string;
}

interface BackendInterventionStatusRequest {
  status: BackendInterventionStatus;
  assignedTo?: string;
  resolution?: string;
  satisfactionRating?: number;
}

interface BackendInterventionValidationRequest {
  approved: boolean;
  note?: string;
}

interface GetInterventionsOptions {
  mine?: boolean;
  page?: number;
  size?: number;
  sort?: string;
  search?: string;
  status?: InterventionStatus;
  assignedTo?: string;
}

export interface InterventionPageState {
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

@Injectable({
  providedIn: 'root'
})
export class InterventionService {
  private interventionsSubject = new BehaviorSubject<Intervention[]>([]);
  public interventions$ = this.interventionsSubject.asObservable();
  private interventionPageStateSubject = new BehaviorSubject<InterventionPageState>({
    page: 0,
    size: 200,
    totalElements: 0,
    totalPages: 0,
  });
  public interventionPageState$ = this.interventionPageStateSubject.asObservable();

  constructor(private http: HttpClient) {}

  getInterventions(options: GetInterventionsOptions = {}): Observable<Intervention[]> {
    let params = new HttpParams();
    const requestedPage = options.page ?? 0;
    const requestedSize = options.size ?? 200;
    const requestedSort = options.sort ?? 'createdAt,desc';

    params = params.set('page', String(requestedPage));
    params = params.set('size', String(requestedSize));
    params = params.set('sort', requestedSort);
    if (typeof options.mine === 'boolean') {
      params = params.set('mine', String(options.mine));
    }
    if (options.search?.trim()) {
      params = params.set('search', options.search.trim());
    }
    if (options.status) {
      const backendStatus = this.toBackendStatus(options.status);
      if (backendStatus) {
        params = params.set('status', backendStatus);
      }
    }
    if (options.assignedTo?.trim()) {
      params = params.set('assignedTo', options.assignedTo.trim());
    }

    const request$ = this.http
      .get<ApiPageResponse<BackendInterventionResponse>>(buildApiUrl('/api/v1/interventions'), { params })
      .pipe(
        map((response) => {
          this.interventionPageStateSubject.next({
            page: response.page ?? requestedPage,
            size: response.size ?? requestedSize,
            totalElements: response.totalElements ?? 0,
            totalPages: response.totalPages ?? 0,
          });
          return extractPageContent(response).map((item) => this.mapIntervention(item));
        }),
        tap((interventions) => this.interventionsSubject.next(interventions)),
      );

    return this.withFallback(request$, () => of(this.interventionsSubject.value));
  }

  getInterventionById(id: string): Observable<Intervention | undefined> {
    const request$ = this.http
      .get<BackendInterventionResponse>(buildApiUrl(`/api/v1/interventions/${id}`))
      .pipe(map((response) => this.mapIntervention(response)));

    return this.withFallback(request$, () => of(this.interventionsSubject.value.find((item) => item.id === id)));
  }

  searchInterventions(filter: InterventionFilter): Observable<Intervention[]> {
    let results = [...this.interventionsSubject.value];

    if (filter.searchTerm) {
      const term = filter.searchTerm.toLowerCase();
      results = results.filter((intervention) =>
        intervention.title.toLowerCase().includes(term) ||
        intervention.description.toLowerCase().includes(term),
      );
    }

    if (filter.status) {
      results = results.filter((intervention) => intervention.status === filter.status);
    }

    if (filter.priority) {
      results = results.filter((intervention) => intervention.priority === filter.priority);
    }

    if (filter.technicianId && filter.technicianId !== '') {
      results = results.filter((intervention) => intervention.assignment?.technicianId === filter.technicianId);
    }

    if (filter.requesterId) {
      results = results.filter((intervention) => intervention.requesterId === filter.requesterId);
    }

    if (filter.startDate && filter.endDate) {
      results = results.filter((intervention) => intervention.createdAt >= filter.startDate! && intervention.createdAt <= filter.endDate!);
    }

    return of(results);
  }

  createIntervention(intervention: Omit<Intervention, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Observable<Intervention> {
    const payload: BackendInterventionCreateRequest = {
      title: intervention.title,
      description: intervention.description,
      type: intervention.type,
      priority: intervention.priority,
      location: intervention.location,
    };

    const request$ = this.http
      .post<BackendInterventionResponse>(buildApiUrl('/api/v1/interventions'), payload)
      .pipe(
        map((response) => this.mapIntervention(response, intervention)),
        tap((created) => this.interventionsSubject.next([...this.interventionsSubject.value, created])),
      );

    return this.withFallback(request$, () => {
      const created: Intervention = {
        ...intervention,
        id: this.generateId(),
        status: InterventionStatus.OPEN,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.interventionsSubject.next([...this.interventionsSubject.value, created]);
      return of(created);
    });
  }

  updateIntervention(id: string, updates: Partial<Intervention>): Observable<Intervention | null> {
    const current = this.interventionsSubject.value.find((item) => item.id === id);
    const requestedStatus = updates.status;

    if (requestedStatus && requestedStatus !== current?.status) {
      if (requestedStatus === InterventionStatus.CLOSED) {
        const payload: BackendInterventionValidationRequest = {
          approved: true,
          note: updates.notes || 'Validated from frontend',
        };

        const request$ = this.http
          .put<BackendInterventionResponse>(buildApiUrl(`/api/v1/interventions/${id}/validate`), payload)
          .pipe(
            map((response) => this.mapIntervention(response)),
            tap((updated) => this.replaceIntervention({ ...updated, ...updates, updatedAt: new Date() })),
          );

        return this.withFallback(request$, () => of(null));
      }

      const backendStatus = this.toBackendStatus(requestedStatus);
      if (backendStatus) {
        const payload: BackendInterventionStatusRequest = {
          status: backendStatus,
          assignedTo: updates.assignment?.technicianName ?? current?.assignment?.technicianName,
        };

        const request$ = this.http
          .put<BackendInterventionResponse>(buildApiUrl(`/api/v1/interventions/${id}/status`), payload)
          .pipe(
            map((response) => this.mapIntervention(response)),
            tap((updated) => this.replaceIntervention({ ...updated, ...updates, updatedAt: new Date() })),
          );

        return this.withFallback(request$, () => of(null));
      }
    }

    if (!current && (!updates.title || !updates.description)) {
      return of(null);
    }

    const payload: BackendInterventionCreateRequest = {
      title: updates.title ?? current?.title ?? '',
      description: updates.description ?? current?.description ?? '',
      type: updates.type ?? current?.type,
      priority: updates.priority ?? current?.priority,
      location: updates.location ?? current?.location,
    };

    const request$ = this.http
      .put<BackendInterventionResponse>(buildApiUrl(`/api/v1/interventions/${id}`), payload)
      .pipe(
        map((response) => this.mapIntervention(response, current ?? updates)),
        tap((updated) => this.replaceIntervention(updated)),
      );

    return this.withFallback(request$, () => of(null));
  }

  assignIntervention(interventionId: string, technicianId: string, technicianName: string): Observable<Intervention | null> {
    const payload: BackendInterventionStatusRequest = {
      status: 'REQUESTED',
      assignedTo: technicianName,
    };

    const request$ = this.http
      .put<BackendInterventionResponse>(buildApiUrl(`/api/v1/interventions/${interventionId}/status`), payload)
      .pipe(
        map((response) => this.mapIntervention(response)),
        tap((updated) => this.replaceIntervention(updated)),
      );

    return this.withFallback(request$, () => {
      const intervention = this.interventionsSubject.value.find((item) => item.id === interventionId);
      if (!intervention) {
        return of(null);
      }

      const assignment: InterventionAssignment = {
        id: this.generateId(),
        interventionId,
        technicianId,
        technicianName,
        assignedAt: new Date(),
      };

      intervention.assignment = assignment;
      intervention.status = InterventionStatus.ASSIGNED;
      intervention.updatedAt = new Date();
      this.interventionsSubject.next([...this.interventionsSubject.value]);
      return of(intervention);
    });
  }

  updateAssignment(interventionId: string, updates: Partial<InterventionAssignment>): Observable<InterventionAssignment | null> {
    const intervention = this.interventionsSubject.value.find((item) => item.id === interventionId);
    if (!intervention || !intervention.assignment) {
      return of(null);
    }

    if (updates.startedAt) {
      const payload: BackendInterventionStatusRequest = {
        status: 'IN_PROGRESS',
        assignedTo: intervention.assignment.technicianName,
      };

      const request$ = this.http
        .put<BackendInterventionResponse>(buildApiUrl(`/api/v1/interventions/${interventionId}/status`), payload)
        .pipe(
          map((response) => this.mapIntervention(response)),
          tap((updated) => this.replaceIntervention(updated)),
          map((updated) => updated.assignment ?? null),
        );

      return this.withFallback(request$, () => {
        intervention.assignment = { ...intervention.assignment!, ...updates };
        intervention.status = InterventionStatus.IN_PROGRESS;
        intervention.updatedAt = new Date();
        this.interventionsSubject.next([...this.interventionsSubject.value]);
        return of(intervention.assignment);
      });
    }

    intervention.assignment = { ...intervention.assignment, ...updates };
    intervention.updatedAt = new Date();
    this.interventionsSubject.next([...this.interventionsSubject.value]);
    return of(intervention.assignment);
  }

  completeIntervention(interventionId: string, resolution: string, satisfactionRating?: number): Observable<Intervention | null> {
    const intervention = this.interventionsSubject.value.find((item) => item.id === interventionId);
    if (!intervention) {
      return of(null);
    }

    const payload: BackendInterventionStatusRequest = {
      status: 'COMPLETED',
      assignedTo: intervention.assignment?.technicianName,
      resolution,
      satisfactionRating,
    };

    const request$ = this.http
      .put<BackendInterventionResponse>(buildApiUrl(`/api/v1/interventions/${interventionId}/status`), payload)
      .pipe(
        map((response) => this.mapIntervention(response)),
        tap((updated) => {
          this.replaceIntervention(updated);
        }),
      );

    return this.withFallback(request$, () => {
      intervention.status = InterventionStatus.RESOLVED;
      intervention.resolution = resolution;
      intervention.satisfactionRating = satisfactionRating;
      intervention.resolutionDate = new Date();
      intervention.updatedAt = new Date();
      if (intervention.assignment) {
        intervention.assignment.completedAt = new Date();
      }
      this.interventionsSubject.next([...this.interventionsSubject.value]);
      return of(intervention);
    });
  }

  closeIntervention(interventionId: string): Observable<Intervention | null> {
    const payload: BackendInterventionValidationRequest = {
      approved: true,
      note: 'Validated from frontend',
    };

    const request$ = this.http
      .put<BackendInterventionResponse>(buildApiUrl(`/api/v1/interventions/${interventionId}/validate`), payload)
      .pipe(
        map((response) => this.mapIntervention(response)),
        tap((updated) => this.replaceIntervention(updated)),
      );

    return this.withFallback(request$, () => {
      const intervention = this.interventionsSubject.value.find((item) => item.id === interventionId);
      if (!intervention) {
        return of(null);
      }

      intervention.status = InterventionStatus.CLOSED;
      intervention.updatedAt = new Date();
      this.interventionsSubject.next([...this.interventionsSubject.value]);
      return of(intervention);
    });
  }

  deleteIntervention(id: string): Observable<boolean> {
    return this.http.delete<void>(buildApiUrl(`/api/v1/interventions/${id}`)).pipe(
      tap(() => this.interventionsSubject.next(this.interventionsSubject.value.filter((item) => item.id !== id))),
      map(() => true),
    );
  }

  getInterventionsByStatus(status: InterventionStatus): Observable<Intervention[]> {
    return of(this.interventionsSubject.value.filter((item) => item.status === status));
  }

  getInterventionsByPriority(priority: InterventionPriority): Observable<Intervention[]> {
    return of(this.interventionsSubject.value.filter((item) => item.priority === priority));
  }

  getInterventionsByTechnician(technicianId: string): Observable<Intervention[]> {
    return of(this.interventionsSubject.value.filter((item) => item.assignment?.technicianId === technicianId));
  }

  getAverageResolutionTime(): Observable<number> {
    const resolved = this.interventionsSubject.value.filter(
      (item) => item.status === InterventionStatus.RESOLVED && item.resolutionDate,
    );

    if (resolved.length === 0) {
      return of(0);
    }

    const totalTime = resolved.reduce((sum, item) => {
      const timeDiff = item.resolutionDate!.getTime() - item.createdAt.getTime();
      return sum + timeDiff;
    }, 0);

    const averageMs = totalTime / resolved.length;
    const averageDays = averageMs / (1000 * 60 * 60 * 24);
    return of(Math.round(averageDays * 100) / 100);
  }

  private mapIntervention(
    response: BackendInterventionResponse,
    source?: Partial<Intervention>,
  ): Intervention {
    const fallbackDate = this.toDate(response.createdAt);
    const assignment = response.assignedTo
      ? {
          id: `assign-${response.id}`,
          interventionId: response.id,
          technicianId: response.assignedTo.toLowerCase().replace(/\s+/g, '-'),
          technicianName: response.assignedTo,
          assignedAt: this.toDate(response.updatedAt, fallbackDate),
          startedAt: response.status === 'IN_PROGRESS' ? this.toDate(response.updatedAt, fallbackDate) : undefined,
          completedAt: response.status === 'COMPLETED' || response.status === 'VALIDATED'
            ? this.toDate(response.updatedAt, fallbackDate)
            : undefined,
        }
      : undefined;

    return {
      id: response.id,
      title: response.title,
      description: response.description || '',
      type: response.type ?? source?.type ?? 'SUPPORT',
      priority: response.priority ?? source?.priority ?? InterventionPriority.MEDIUM,
      status: this.mapStatus(response.status, !!response.assignedTo),
      requesterId: response.requestedBy,
      requesterName: response.requestedBy,
      requesterEmail: source?.requesterEmail ?? `${response.requestedBy}@company.local`,
      location: response.location ?? source?.location ?? 'Lieu a preciser',
      assignment,
      createdAt: this.toDate(response.createdAt),
      updatedAt: this.toDate(response.updatedAt, fallbackDate),
      resolution: response.resolution || response.validationNote || source?.resolution,
      resolutionDate: response.resolvedAt
        ? this.toDate(response.resolvedAt, fallbackDate)
        : response.status === 'COMPLETED' || response.status === 'VALIDATED'
        ? this.toDate(response.updatedAt, fallbackDate)
        : source?.resolutionDate,
      notes: response.validationNote || source?.notes,
      satisfactionRating: response.satisfactionRating ?? source?.satisfactionRating,
    };
  }

  private mapStatus(status: BackendInterventionStatus, hasAssignment: boolean): InterventionStatus {
    if (status === 'REQUESTED') {
      return hasAssignment ? InterventionStatus.ASSIGNED : InterventionStatus.OPEN;
    }
    if (status === 'IN_PROGRESS') {
      return InterventionStatus.IN_PROGRESS;
    }
    if (status === 'COMPLETED') {
      return InterventionStatus.RESOLVED;
    }
    if (status === 'VALIDATED') {
      return InterventionStatus.CLOSED;
    }
    return InterventionStatus.CLOSED;
  }

  private toBackendStatus(status: InterventionStatus): BackendInterventionStatus | null {
    if (status === InterventionStatus.OPEN || status === InterventionStatus.ASSIGNED) {
      return 'REQUESTED';
    }
    if (status === InterventionStatus.IN_PROGRESS) {
      return 'IN_PROGRESS';
    }
    if (status === InterventionStatus.RESOLVED) {
      return 'COMPLETED';
    }
    if (status === InterventionStatus.CLOSED) {
      return 'VALIDATED';
    }
    return null;
  }

  private replaceIntervention(updated: Intervention): void {
    const interventions = this.interventionsSubject.value;
    const index = interventions.findIndex((item) => item.id === updated.id);
    if (index < 0) {
      this.interventionsSubject.next([...interventions, updated]);
      return;
    }

    interventions[index] = { ...interventions[index], ...updated };
    this.interventionsSubject.next([...interventions]);
  }

  private toDate(value?: string, fallback = new Date()): Date {
    if (!value) {
      return fallback;
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? fallback : parsed;
  }

  private withFallback<T>(request$: Observable<T>, fallbackFactory: () => Observable<T>): Observable<T> {
    return request$.pipe(
      catchError((error) => throwError(() => error)),
    );
  }

  private generateId(): string {
    return Math.random().toString(36).slice(2, 11);
  }
}
