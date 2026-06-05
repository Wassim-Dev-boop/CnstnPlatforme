import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiPageResponse, buildApiUrl, extractPageContent } from '../config/backend-api.config';
import {
  ItIntervention,
  ItInterventionPriority,
  ItInterventionTransition,
} from '../models';

@Injectable({
  providedIn: 'root'
})
export class ItInterventionService {
  constructor(private http: HttpClient) {}

  create(payload: {
    title: string;
    description: string;
    equipmentId: string;
    priority: ItInterventionPriority;
  }): Observable<ItIntervention> {
    return this.http.post<ItIntervention>(
      buildApiUrl('/api/v1/interventions/it'),
      payload
    ).pipe(map((item) => this.mapIntervention(item)));
  }

  listMine(page = 0, size = 10): Observable<ApiPageResponse<ItIntervention>> {
    return this.fetchPage(buildApiUrl('/api/v1/interventions/it/mine'), page, size);
  }

  listManager(page = 0, size = 10): Observable<ApiPageResponse<ItIntervention>> {
    return this.fetchPage(buildApiUrl('/api/v1/interventions/it/manager'), page, size);
  }

  listDsn(page = 0, size = 10): Observable<ApiPageResponse<ItIntervention>> {
    return this.fetchPage(buildApiUrl('/api/v1/interventions/it/dsn'), page, size);
  }

  listProcessing(page = 0, size = 10): Observable<ApiPageResponse<ItIntervention>> {
    return this.fetchPage(buildApiUrl('/api/v1/interventions/it/processing'), page, size);
  }

  listAll(page = 0, size = 10): Observable<ApiPageResponse<ItIntervention>> {
    return this.fetchPage(buildApiUrl('/api/v1/interventions/it/all'), page, size);
  }

  getById(id: string): Observable<ItIntervention> {
    return this.http.get<ItIntervention>(buildApiUrl(`/api/v1/interventions/it/${id}`))
      .pipe(map((item) => this.mapIntervention(item)));
  }

  getHistory(id: string): Observable<ItInterventionTransition[]> {
    return this.http.get<ItInterventionTransition[]>(
      buildApiUrl(`/api/v1/interventions/it/${id}/history`)
    ).pipe(map((items) => (Array.isArray(items) ? items : []).map((item) => ({
      ...item,
      createdAt: this.toDate(item.createdAt) ?? new Date(),
    }))));
  }

  managerDecision(id: string, approved: boolean, note?: string): Observable<ItIntervention> {
    return this.http.post<ItIntervention>(
      buildApiUrl(`/api/v1/interventions/it/${id}/manager-decision`),
      { approved, note }
    ).pipe(map((item) => this.mapIntervention(item)));
  }

  dsnDecision(id: string, approved: boolean, note?: string): Observable<ItIntervention> {
    return this.http.post<ItIntervention>(
      buildApiUrl(`/api/v1/interventions/it/${id}/dsn-decision`),
      { approved, note }
    ).pipe(map((item) => this.mapIntervention(item)));
  }

  takeInCharge(id: string, note?: string): Observable<ItIntervention> {
    return this.http.post<ItIntervention>(
      buildApiUrl(`/api/v1/interventions/it/${id}/take`),
      { note }
    ).pipe(map((item) => this.mapIntervention(item)));
  }

  markInProgress(id: string, note?: string): Observable<ItIntervention> {
    return this.http.post<ItIntervention>(
      buildApiUrl(`/api/v1/interventions/it/${id}/start`),
      { note }
    ).pipe(map((item) => this.mapIntervention(item)));
  }

  resolve(id: string, note: string, equipmentState?: string): Observable<ItIntervention> {
    return this.http.post<ItIntervention>(
      buildApiUrl(`/api/v1/interventions/it/${id}/resolve`),
      { note, equipmentState }
    ).pipe(map((item) => this.mapIntervention(item)));
  }

  close(id: string, note?: string): Observable<ItIntervention> {
    return this.http.post<ItIntervention>(
      buildApiUrl(`/api/v1/interventions/it/${id}/close`),
      { note }
    ).pipe(map((item) => this.mapIntervention(item)));
  }

  private fetchPage(url: string, page: number, size: number): Observable<ApiPageResponse<ItIntervention>> {
    const params = new HttpParams()
      .set('page', String(page))
      .set('size', String(size))
      .set('sort', 'createdAt,desc');

    return this.http.get<ApiPageResponse<ItIntervention>>(url, { params }).pipe(
      map((response) => {
        const content = extractPageContent(response).map((item) => this.mapIntervention(item));
        return {
          content,
          page: response.page ?? page,
          size: response.size ?? size,
          totalElements: response.totalElements ?? content.length,
          totalPages: response.totalPages ?? 0,
        };
      })
    );
  }

  private mapIntervention(item: ItIntervention): ItIntervention {
    return {
      ...item,
      equipmentAssignedAt: this.toDate(item.equipmentAssignedAt),
      managerApprovedAt: this.toDate(item.managerApprovedAt),
      dsnApprovedAt: this.toDate(item.dsnApprovedAt),
      itProcessingStartedAt: this.toDate(item.itProcessingStartedAt),
      createdAt: this.toDate(item.createdAt) ?? new Date(),
      updatedAt: this.toDate(item.updatedAt) ?? new Date(),
    };
  }

  private toDate(value: unknown): Date | undefined {
    if (!value) {
      return undefined;
    }
    const parsed = new Date(String(value));
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }
}
