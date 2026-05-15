import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { type Observable } from 'rxjs';

import { environment } from '../../environments/environment';

export interface SalesProfitSummaryDto {
  from: string;
  to: string;
  zone: string;
  sales: number;
  profit: number;
  profitMarginApplied: number;
}

export interface DailySalesProfitPointDto {
  dateIso: string;
  sales: number;
  profit: number;
}

export interface DailySalesProfitSeriesDto {
  from: string;
  to: string;
  zone: string;
  days: DailySalesProfitPointDto[];
}

@Injectable({ providedIn: 'root' })
export class SalesProfitApiService {
  private readonly http = inject(HttpClient);
  private readonly root = `${environment.apiBaseUrl}/api/sales-profit`;

  summary(fromIso: string, toIso: string): Observable<SalesProfitSummaryDto> {
    const params = new URLSearchParams({ from: fromIso, to: toIso });
    return this.http.get<SalesProfitSummaryDto>(`${this.root}/summary?${params.toString()}`);
  }

  daily(fromIso: string, toIso: string): Observable<DailySalesProfitSeriesDto> {
    const params = new URLSearchParams({ from: fromIso, to: toIso });
    return this.http.get<DailySalesProfitSeriesDto>(`${this.root}/daily?${params.toString()}`);
  }
}
