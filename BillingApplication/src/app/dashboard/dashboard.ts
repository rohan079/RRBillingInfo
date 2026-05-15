import {
  AfterViewInit,
  Component,
  ElementRef,
  Injector,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
  signal,
  afterNextRender,
} from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Title,
  Tooltip,
  Legend,
  Filler,
  BarController,
  BarElement,
} from 'chart.js';
import {
  DashboardStatsService,
  type DashboardStats,
  type MonthlyPoint,
  type TodaySnapshot,
} from './dashboard-stats.service';
import { httpErrorMessage } from '../api/http-error.util';

Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Title,
  Tooltip,
  Legend,
  Filler,
  BarController,
  BarElement,
);

export type DashboardTab = '1m' | '3m' | '6m' | 'today' | 'custom';

const EMPTY_DASHBOARD: DashboardStats = {
  lastMonth: { periodLabel: '…', sales: 0, profit: 0 },
  last3Months: [],
  last6Months: [],
};

@Component({
  selector: 'app-dashboard',
  imports: [CurrencyPipe],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements AfterViewInit, OnDestroy, OnInit {
  private readonly statsService = inject(DashboardStatsService);
  private readonly injector = inject(Injector);

  protected readonly stats = signal<DashboardStats>(EMPTY_DASHBOARD);
  protected readonly dashboardError = signal<string | null>(null);
  protected readonly activeTab = signal<DashboardTab>('1m');

  /** Custom range inputs (yyyy-mm-dd) */
  protected readonly customFrom = signal(this.defaultCustomIso().from);
  protected readonly customTo = signal(this.defaultCustomIso().to);
  /** Custom tab series — loaded from API (initial + Apply). */
  protected readonly customPoints = signal<MonthlyPoint[]>([]);
  protected readonly customError = signal<string | null>(null);

  /** Today tab KPIs — refreshed when the tab is opened. */
  protected readonly todaySnapshot = signal<TodaySnapshot>({
    dateIso: '',
    dateLabel: 'Loading…',
    sales: 0,
    profit: 0,
  });

  @ViewChild('trendChart') private trendChartRef?: ElementRef<HTMLCanvasElement>;

  private trendChart?: Chart;

  ngOnInit(): void {
    this.statsService.getStats().subscribe({
      next: (s) => {
        this.stats.set(s);
        this.dashboardError.set(null);
        this.scheduleChartBuild();
      },
      error: () => {
        this.dashboardError.set('Could not load dashboard stats from the API.');
        this.scheduleChartBuild();
      },
    });
    this.statsService
      .getMonthlyRange(this.customFrom(), this.customTo())
      .subscribe({
        next: (pts) => {
          this.customPoints.set(pts);
          this.scheduleChartBuild();
        },
        error: () => {},
      });
    this.statsService.getToday().subscribe({
      next: (t) => this.todaySnapshot.set(t),
      error: () => {},
    });
  }

  ngAfterViewInit(): void {
    this.scheduleChartBuild();
  }

  ngOnDestroy(): void {
    this.trendChart?.destroy();
  }

  protected selectTab(tab: DashboardTab): void {
    if (tab === 'today') {
      this.statsService.getToday().subscribe({
        next: (t) => {
          this.todaySnapshot.set(t);
          this.scheduleChartBuild();
        },
        error: () => {},
      });
    }
    this.activeTab.set(tab);
    this.scheduleChartBuild();
  }

  protected onCustomFromInput(value: string): void {
    this.customFrom.set(value);
  }

  protected onCustomToInput(value: string): void {
    this.customTo.set(value);
  }

  protected applyCustomRange(): void {
    const from = this.parseIsoDate(this.customFrom());
    const to = this.parseIsoDate(this.customTo());
    if (!from || !to) {
      this.customError.set('Select both start and end dates.');
      return;
    }
    if (from > to) {
      this.customError.set(
        'Start date must be on or before the end date.',
      );
      return;
    }
    this.customError.set(null);
    this.statsService.getMonthlyRange(this.customFrom(), this.customTo()).subscribe({
      next: (pts) => {
        this.customPoints.set(pts);
        this.scheduleChartBuild();
      },
      error: (err: unknown) => {
        this.customError.set(httpErrorMessage(err));
      },
    });
  }

  private scheduleChartBuild(): void {
    this.trendChart?.destroy();
    this.trendChart = undefined;
    afterNextRender(
      () => this.buildChartForActiveTab(),
      { injector: this.injector },
    );
  }

  private buildChartForActiveTab(): void {
    const canvas = this.trendChartRef?.nativeElement;
    if (!canvas) return;

    const tab = this.activeTab();
    this.trendChart?.destroy();

    if (tab === '1m') {
      const m = this.stats().lastMonth;
      this.trendChart = this.buildBarCompareChart(
        canvas,
        m.periodLabel,
        m.sales,
        m.profit,
      );
      return;
    }

    if (tab === 'today') {
      const t = this.todaySnapshot();
      this.trendChart = this.buildBarCompareChart(
        canvas,
        t.dateLabel,
        t.sales,
        t.profit,
      );
      return;
    }

    if (tab === 'custom') {
      const pts = this.customPoints();
      if (pts.length === 0) return;
      if (pts.length === 1) {
        const p = pts[0]!;
        this.trendChart = this.buildBarCompareChart(
          canvas,
          p.label,
          p.sales,
          p.profit,
        );
      } else {
        const from = this.customFrom();
        const to = this.customTo();
        this.trendChart = this.buildLineChart(
          canvas,
          pts,
          `Custom range (${from} → ${to})`,
        );
      }
      return;
    }

    const points = tab === '3m' ? this.stats().last3Months : this.stats().last6Months;
    if (points.length === 0) {
      return;
    }
    const title = tab === '3m' ? 'Last 3 months' : 'Last 6 months';
    this.trendChart = this.buildLineChart(canvas, points, title);
  }

  private buildBarCompareChart(
    canvas: HTMLCanvasElement,
    periodLabel: string,
    sales: number,
    profit: number,
  ): Chart {
    const fmt = (n: number) =>
      '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 });

    return new Chart(canvas, {
      type: 'bar',
      data: {
        labels: ['Sales', 'Profit'],
        datasets: [
          {
            label: periodLabel,
            data: [sales, profit],
            backgroundColor: ['rgba(30, 64, 175, 0.75)', 'rgba(15, 118, 110, 0.75)'],
            borderColor: ['#1e40af', '#0f766e'],
            borderWidth: 1,
            borderRadius: 6,
            maxBarThickness: 72,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: `${periodLabel} — Sales vs profit`,
            font: { size: 15, weight: 600, family: 'Open Sans' },
            color: '#0f172a',
            padding: { bottom: 8 },
          },
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const v = ctx.parsed.y;
                if (v == null) return '';
                return `${ctx.label}: ${fmt(v)}`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { family: 'Open Sans', size: 12 } },
          },
          y: {
            title: {
              display: true,
              text: 'Amount (₹)',
              font: { family: 'Open Sans', size: 11 },
            },
            ticks: {
              font: { family: 'Open Sans', size: 10 },
              callback: (value) =>
                typeof value === 'number'
                  ? '₹' + (value / 1000).toFixed(0) + 'k'
                  : '',
            },
            grid: { color: 'rgba(148, 163, 184, 0.25)' },
          },
        },
      },
    });
  }

  private buildLineChart(
    canvas: HTMLCanvasElement,
    points: MonthlyPoint[],
    title: string,
  ): Chart {
    const labels = points.map((p) => p.label);
    const sales = points.map((p) => p.sales);
    const profit = points.map((p) => p.profit);
    const fmt = (n: number) =>
      '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 });

    return new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Sales',
            data: sales,
            yAxisID: 'y',
            borderColor: '#1e40af',
            backgroundColor: 'rgba(30, 64, 175, 0.12)',
            fill: true,
            tension: 0.35,
            pointRadius: 4,
            pointHoverRadius: 6,
          },
          {
            label: 'Profit',
            data: profit,
            yAxisID: 'y1',
            borderColor: '#0f766e',
            backgroundColor: 'rgba(15, 118, 110, 0.08)',
            fill: true,
            tension: 0.35,
            pointRadius: 4,
            pointHoverRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          title: {
            display: true,
            text: title,
            font: { size: 15, weight: 600, family: 'Open Sans' },
            color: '#0f172a',
            padding: { bottom: 8 },
          },
          legend: {
            position: 'bottom',
            labels: {
              font: { family: 'Open Sans', size: 12 },
              usePointStyle: true,
              padding: 16,
            },
          },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const v = ctx.parsed.y;
                if (v == null) return '';
                const prefix =
                  ctx.dataset.label === 'Sales' ? 'Sales' : 'Profit';
                return `${prefix}: ${fmt(v)}`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { family: 'Open Sans', size: 11 } },
          },
          y: {
            type: 'linear',
            position: 'left',
            title: {
              display: true,
              text: 'Sales (₹)',
              font: { family: 'Open Sans', size: 11 },
            },
            ticks: {
              font: { family: 'Open Sans', size: 10 },
              callback: (value) =>
                typeof value === 'number'
                  ? '₹' + (value / 1000).toFixed(0) + 'k'
                  : '',
            },
            grid: { color: 'rgba(148, 163, 184, 0.25)' },
          },
          y1: {
            type: 'linear',
            position: 'right',
            title: {
              display: true,
              text: 'Profit (₹)',
              font: { family: 'Open Sans', size: 11 },
            },
            ticks: {
              font: { family: 'Open Sans', size: 10 },
              callback: (value) =>
                typeof value === 'number'
                  ? '₹' + (value / 1000).toFixed(0) + 'k'
                  : '',
            },
            grid: { drawOnChartArea: false },
          },
        },
      },
    });
  }

  private defaultCustomIso(): { from: string; to: string } {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    return { from: this.toIsoDate(start), to: this.toIsoDate(end) };
  }

  private toIsoDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  /** Parse yyyy-mm-dd as local calendar date (no UTC shift). */
  private parseIsoDate(iso: string): Date | null {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
    if (!m) return null;
    const y = Number(m[1]);
    const mo = Number(m[2]) - 1;
    const d = Number(m[3]);
    const dt = new Date(y, mo, d);
    if (
      dt.getFullYear() !== y ||
      dt.getMonth() !== mo ||
      dt.getDate() !== d
    ) {
      return null;
    }
    return dt;
  }
}
