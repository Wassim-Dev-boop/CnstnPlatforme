import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiPageResponse, buildApiUrl, extractPageContent } from '../config/backend-api.config';
import {
  ItAssignableEmployee,
  ItEquipment,
  ItEquipmentAssignment,
  ItEquipmentCategory,
  ItEquipmentState,
} from '../models';

interface EquipmentQueryOptions {
  page?: number;
  size?: number;
  search?: string;
  categoryId?: string;
  state?: ItEquipmentState;
  assignmentStatus?: 'NOT_ASSIGNED' | 'ASSIGNED';
}

@Injectable({
  providedIn: 'root'
})
export class ItEquipmentService {
  constructor(private http: HttpClient) {}

  listEquipments(options: EquipmentQueryOptions = {}): Observable<ApiPageResponse<ItEquipment>> {
    const page = options.page ?? 0;
    const size = options.size ?? 10;

    let params = new HttpParams()
      .set('page', String(page))
      .set('size', String(size))
      .set('sort', 'updatedAt,desc');

    if (options.search?.trim()) {
      return this.http.get<ApiPageResponse<ItEquipment>>(
        buildApiUrl('/api/v1/it-equipment/search'),
        { params: params.set('query', options.search.trim()) }
      ).pipe(map((response) => this.mapEquipmentPage(response, page, size)));
    }

    if (options.categoryId) {
      return this.http.get<ApiPageResponse<ItEquipment>>(
        buildApiUrl(`/api/v1/it-equipment/filter/category/${options.categoryId}`),
        { params }
      ).pipe(map((response) => this.mapEquipmentPage(response, page, size)));
    }

    if (options.state) {
      return this.http.get<ApiPageResponse<ItEquipment>>(
        buildApiUrl(`/api/v1/it-equipment/filter/state/${options.state}`),
        { params }
      ).pipe(map((response) => this.mapEquipmentPage(response, page, size)));
    }

    if (options.assignmentStatus) {
      return this.http.get<ApiPageResponse<ItEquipment>>(
        buildApiUrl(`/api/v1/it-equipment/filter/assignment-status/${options.assignmentStatus}`),
        { params }
      ).pipe(map((response) => this.mapEquipmentPage(response, page, size)));
    }

    return this.http.get<ApiPageResponse<ItEquipment>>(
      buildApiUrl('/api/v1/it-equipment'),
      { params }
    ).pipe(map((response) => this.mapEquipmentPage(response, page, size)));
  }

  getEquipmentById(id: string): Observable<ItEquipment> {
    return this.http.get<ItEquipment>(buildApiUrl(`/api/v1/it-equipment/${id}`))
      .pipe(map((item) => this.mapEquipment(item)));
  }

  createEquipment(payload: {
    name: string;
    serialNumber: string;
    categoryId: string;
    brand?: string;
    model?: string;
    state: ItEquipmentState;
    description?: string;
  }): Observable<ItEquipment> {
    return this.http.post<ItEquipment>(buildApiUrl('/api/v1/it-equipment'), payload)
      .pipe(map((item) => this.mapEquipment(item)));
  }

  updateEquipment(
    id: string,
    payload: {
      name?: string;
      serialNumber?: string;
      categoryId?: string;
      brand?: string;
      model?: string;
      state?: ItEquipmentState;
      description?: string;
    }
  ): Observable<ItEquipment> {
    return this.http.put<ItEquipment>(buildApiUrl(`/api/v1/it-equipment/${id}`), payload)
      .pipe(map((item) => this.mapEquipment(item)));
  }

  archiveEquipment(id: string): Observable<void> {
    return this.http.delete<void>(buildApiUrl(`/api/v1/it-equipment/${id}/archive`));
  }

  updateEquipmentState(id: string, state: ItEquipmentState): Observable<ItEquipment> {
    return this.http.patch<ItEquipment>(
      buildApiUrl(`/api/v1/it-equipment/${id}/state`),
      { state }
    ).pipe(map((item) => this.mapEquipment(item)));
  }

  getCategories(): Observable<ItEquipmentCategory[]> {
    return this.http.get<ItEquipmentCategory[]>(buildApiUrl('/api/v1/it-equipment/categories'))
      .pipe(
        map((items) => (Array.isArray(items) ? items : []).map((item) => ({
          ...item,
          createdAt: this.toDate(item.createdAt) ?? new Date(),
          updatedAt: this.toDate(item.updatedAt) ?? new Date(),
        })))
      );
  }

  getMyEquipments(): Observable<ItEquipment[]> {
    return this.http.get<ItEquipment[]>(buildApiUrl('/api/v1/it-equipment/my'))
      .pipe(map((items) => (Array.isArray(items) ? items : []).map((item) => this.mapEquipment(item))));
  }

  getAssignableEmployees(): Observable<ItAssignableEmployee[]> {
    return this.http.get<ItAssignableEmployee[]>(
      buildApiUrl('/api/v1/it-equipment/assignments/assignable-employees')
    ).pipe(map((items) => Array.isArray(items) ? items : []));
  }

  assignEquipment(equipmentId: string, employeeId: string): Observable<ItEquipmentAssignment> {
    return this.http.post<ItEquipmentAssignment>(
      buildApiUrl('/api/v1/it-equipment/assignments'),
      { equipmentId, employeeId }
    ).pipe(map((item) => this.mapAssignment(item)));
  }

  returnEquipment(assignmentId: string): Observable<ItEquipmentAssignment> {
    return this.http.post<ItEquipmentAssignment>(
      buildApiUrl(`/api/v1/it-equipment/assignments/${assignmentId}/return`),
      {}
    ).pipe(map((item) => this.mapAssignment(item)));
  }

  listAssignments(page = 0, size = 10): Observable<ApiPageResponse<ItEquipmentAssignment>> {
    const params = new HttpParams()
      .set('page', String(page))
      .set('size', String(size))
      .set('sort', 'assignedAt,desc');
    return this.http.get<ApiPageResponse<ItEquipmentAssignment>>(
      buildApiUrl('/api/v1/it-equipment/assignments'),
      { params }
    ).pipe(map((response) => this.mapAssignmentPage(response, page, size)));
  }

  getEquipmentAssignmentHistory(equipmentId: string): Observable<ItEquipmentAssignment[]> {
    return this.http.get<ItEquipmentAssignment[]>(
      buildApiUrl(`/api/v1/it-equipment/assignments/equipment/${equipmentId}/history`)
    ).pipe(map((items) => (Array.isArray(items) ? items : []).map((item) => this.mapAssignment(item))));
  }

  private mapEquipmentPage(
    response: ApiPageResponse<ItEquipment>,
    fallbackPage: number,
    fallbackSize: number
  ): ApiPageResponse<ItEquipment> {
    const content = extractPageContent(response).map((item) => this.mapEquipment(item));
    return {
      content,
      page: response.page ?? fallbackPage,
      size: response.size ?? fallbackSize,
      totalElements: response.totalElements ?? content.length,
      totalPages: response.totalPages ?? 0,
    };
  }

  private mapAssignmentPage(
    response: ApiPageResponse<ItEquipmentAssignment>,
    fallbackPage: number,
    fallbackSize: number
  ): ApiPageResponse<ItEquipmentAssignment> {
    const content = extractPageContent(response).map((item) => this.mapAssignment(item));
    return {
      content,
      page: response.page ?? fallbackPage,
      size: response.size ?? fallbackSize,
      totalElements: response.totalElements ?? content.length,
      totalPages: response.totalPages ?? 0,
    };
  }

  private mapEquipment(item: ItEquipment): ItEquipment {
    return {
      ...item,
      assignedAt: this.toDate(item.assignedAt),
      createdAt: this.toDate(item.createdAt) ?? new Date(),
      updatedAt: this.toDate(item.updatedAt) ?? new Date(),
    };
  }

  private mapAssignment(item: ItEquipmentAssignment): ItEquipmentAssignment {
    return {
      ...item,
      assignedAt: this.toDate(item.assignedAt) ?? new Date(),
      returnedAt: this.toDate(item.returnedAt),
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
