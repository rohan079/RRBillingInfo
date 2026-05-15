import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, type Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import type { Invoice } from '../invoices/invoice.model';

/** POST body matches Spring {@code CreateInvoiceRequest}. */
export interface FinishBillRequest {
  id?: string;
  createdAt?: string;
  lines: {
    barcode: string;
    label: string;
    qty: number;
    unitPrice: number;
    lineTotal: number;
  }[];
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  total: number;
}

/** Raw JSON from API (BigDecimal → number). */
interface InvoiceApiDto {
  id: string;
  createdAt: string;
  lines: {
    barcode: string;
    label: string;
    qty: number;
    unitPrice: number;
    lineTotal: number;
  }[];
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  total: number;
}

function normalizeInvoice(raw: InvoiceApiDto): Invoice {
  return {
    id: raw.id,
    createdAt:
      typeof raw.createdAt === 'string'
        ? raw.createdAt
        : new Date(raw.createdAt as unknown as string).toISOString(),
    lines: (raw.lines ?? []).map((l) => ({
      barcode: l.barcode,
      label: l.label,
      qty: Number(l.qty),
      unitPrice: Number(l.unitPrice),
      lineTotal: Number(l.lineTotal),
    })),
    subtotal: Number(raw.subtotal),
    discountPercent: Number(raw.discountPercent),
    discountAmount: Number(raw.discountAmount),
    total: Number(raw.total),
  };
}

@Injectable({ providedIn: 'root' })
export class BillApiService {
  private readonly http = inject(HttpClient);
  private readonly root = `${environment.apiBaseUrl}/api/bills`;

  list(): Observable<Invoice[]> {
    return this.http
      .get<InvoiceApiDto[]>(this.root)
      .pipe(map((rows) => rows.map(normalizeInvoice)));
  }

  finishBill(body: FinishBillRequest): Observable<Invoice> {
    return this.http
      .post<InvoiceApiDto>(this.root, {
        ...body,
        discountPercent: body.discountPercent,
      })
      .pipe(map(normalizeInvoice));
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.root}/${encodeURIComponent(id)}`);
  }
}
