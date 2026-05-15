import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { type Observable } from 'rxjs';

import { environment } from '../../environments/environment';

/** Monthly point for charts — from GET /api/dashboard/monthly-range */
export interface MonthlyPoint {
  label: string;
  sales: number;
  profit: number;
}

export interface TodaySnapshot {
  dateIso: string;
  dateLabel: string;
  sales: number;
  profit: number;
}

export interface LastMonthSummary {
  periodLabel: string;
  sales: number;
  profit: number;
}

export interface DashboardStats {
  lastMonth: LastMonthSummary;
  last3Months: MonthlyPoint[];
  last6Months: MonthlyPoint[];
}

@Injectable({ providedIn: 'root' })
export class DashboardStatsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/api/dashboard`;

  getStats(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(`${this.base}/stats`);
  }

  getToday(dateIso?: string): Observable<TodaySnapshot> {
    const q = dateIso ? `?date=${encodeURIComponent(dateIso)}` : '';
    return this.http.get<TodaySnapshot>(`${this.base}/today${q}`);
  }

  getMonthlyRange(fromIso: string, toIso: string): Observable<MonthlyPoint[]> {
    const params = new URLSearchParams({
      from: fromIso,
      to: toIso,
    });
    return this.http.get<MonthlyPoint[]>(`${this.base}/monthly-range?${params.toString()}`);
  }
}
