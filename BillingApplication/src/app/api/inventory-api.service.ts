import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, type Observable } from 'rxjs';

import { environment } from '../../environments/environment';

export interface InventoryItemDto {
  id: number;
  barcode: string;
  quantity: number;
  actualPrice: number;
  marginPrice: number;
}

export interface CreateInventoryItemRequest {
  barcode: string;
  quantity: number;
  actualPrice: number;
  marginPrice: number;
}

export interface BulkGenerateInventoryRequest {
  count: number;
  prefix?: string;
  quantity: number;
  actualPrice: number;
  marginPrice: number;
}

export interface BulkRemoveInventoryRequest {
  count: number;
  prefix?: string;
  /** If set, only that generated batch (middle segment of {@code PREFIX-millis-index}). */
  batchMillis?: number | null;
}

export interface BulkRemoveInventoryResponse {
  removed: number;
}

@Injectable({ providedIn: 'root' })
export class InventoryApiService {
  private readonly http = inject(HttpClient);
  private readonly root = `${environment.apiBaseUrl}/api/inventory`;

  list(): Observable<InventoryItemDto[]> {
    return this.http.get<InventoryItemDto[]>(this.root).pipe(
      map((rows) => rows.map((row) => this.mapItem(row))),
    );
  }

  getByBarcode(barcode: string): Observable<InventoryItemDto> {
    return this.http
      .get<InventoryItemDto>(`${this.root}/by-barcode/${encodeURIComponent(barcode)}`)
      .pipe(map((row) => this.mapItem(row)));
  }

  create(body: CreateInventoryItemRequest): Observable<InventoryItemDto> {
    return this.http.post<InventoryItemDto>(this.root, body).pipe(map((row) => this.mapItem(row)));
  }

  bulkGenerate(body: BulkGenerateInventoryRequest): Observable<InventoryItemDto[]> {
    return this.http
      .post<InventoryItemDto[]>(`${this.root}/bulk-generate`, body)
      .pipe(map((rows) => rows.map((row) => this.mapItem(row))));
  }

  bulkRemove(body: BulkRemoveInventoryRequest): Observable<BulkRemoveInventoryResponse> {
    return this.http.post<BulkRemoveInventoryResponse>(`${this.root}/bulk-remove`, body);
  }

  deleteById(id: number): Observable<void> {
    return this.http.delete<void>(`${this.root}/${id}`);
  }

  private mapItem(row: InventoryItemDto): InventoryItemDto {
    return {
      ...row,
      id: Number(row.id),
      quantity: Number(row.quantity),
      actualPrice: Number(row.actualPrice),
      marginPrice: Number(row.marginPrice),
    };
  }
}
