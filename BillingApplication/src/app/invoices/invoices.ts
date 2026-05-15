import { CurrencyPipe, DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import type { Invoice } from './invoice.model';
import { InvoiceStoreService } from './invoice-store.service';

interface DaySection {
  dateKey: string;
  dateLabel: string;
  invoices: Invoice[];
}

interface WeekSection {
  weekKey: string;
  weekLabel: string;
  days: DaySection[];
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function startOfWeekMonday(d: Date): Date {
  const c = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = c.getDay();
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  c.setDate(c.getDate() + mondayOffset);
  return c;
}

function addDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function formatShortDate(d: Date): string {
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function buildWeekSections(invoices: Invoice[]): WeekSection[] {
  const sorted = [...invoices].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const weekMap = new Map<string, { monday: Date; sunday: Date; dayMap: Map<string, Invoice[]> }>();

  for (const inv of sorted) {
    const created = new Date(inv.createdAt);
    const monday = startOfWeekMonday(created);
    const sunday = addDays(monday, 6);
    const weekKey = localDateKey(monday);

    let bucket = weekMap.get(weekKey);
    if (!bucket) {
      bucket = { monday, sunday, dayMap: new Map() };
      weekMap.set(weekKey, bucket);
    }

    const dk = localDateKey(created);
    const arr = bucket.dayMap.get(dk) ?? [];
    arr.push(inv);
    bucket.dayMap.set(dk, arr);
  }

  const weeks: WeekSection[] = [];
  const weekKeysSorted = [...weekMap.keys()].sort((a, b) => (a < b ? 1 : a > b ? -1 : 0));

  for (const wk of weekKeysSorted) {
    const { monday, sunday, dayMap } = weekMap.get(wk)!;
    const weekLabel = `${formatShortDate(monday)} – ${formatShortDate(sunday)}`;

    const dayKeysSorted = [...dayMap.keys()].sort((a, b) => (a < b ? 1 : a > b ? -1 : 0));
    const days: DaySection[] = dayKeysSorted.map((dateKey) => {
      const first = dayMap.get(dateKey)![0];
      const d = new Date(first.createdAt);
      const dateLabel = d.toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
      return { dateKey, dateLabel, invoices: dayMap.get(dateKey)! };
    });

    weeks.push({ weekKey: wk, weekLabel, days });
  }

  return weeks;
}

@Component({
  selector: 'app-invoices',
  standalone: true,
  imports: [CurrencyPipe, DatePipe],
  templateUrl: './invoices.html',
  styleUrl: './invoices.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Invoices implements OnInit {
  protected readonly store = inject(InvoiceStoreService);

  /** Invoice shown in the delete confirmation dialog. */
  protected readonly deleteConfirmTarget = signal<Invoice | null>(null);

  protected readonly pendingDeleteList = computed(() =>
    [...this.store.pendingDeletes().values()],
  );

  ngOnInit(): void {
    this.store.loadAll();
  }

  protected readonly grouped = computed(() => buildWeekSections(this.store.invoices()));

  protected readonly expandedIds = signal<ReadonlySet<string>>(new Set<string>());

  protected toggleExpand(id: string): void {
    this.expandedIds.update((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  protected openDeleteConfirm(inv: Invoice, event: Event): void {
    event.stopPropagation();
    this.deleteConfirmTarget.set(inv);
  }

  protected cancelDeleteConfirm(): void {
    this.deleteConfirmTarget.set(null);
  }

  protected confirmDelete(): void {
    const inv = this.deleteConfirmTarget();
    if (!inv) return;
    this.deleteConfirmTarget.set(null);
    this.expandedIds.update((prev) => {
      const next = new Set(prev);
      next.delete(inv.id);
      return next;
    });
    this.store.scheduleRemove(inv);
  }

  protected undoDelete(id: string): void {
    this.store.undoPendingDelete(id);
  }

  protected panelId(invoiceId: string): string {
    return `inv-panel-${invoiceId.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  }
}
