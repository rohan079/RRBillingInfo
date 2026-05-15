import { Injectable, inject, signal } from '@angular/core';

import { BillApiService } from '../api/bill-api.service';
import type { Invoice } from './invoice.model';
import { httpErrorMessage } from '../api/http-error.util';

const UNDO_SECONDS = 5;

export interface PendingInvoiceDelete {
  invoice: Invoice;
  secondsLeft: number;
}

interface DeleteTimers {
  intervalId: ReturnType<typeof setInterval>;
  timeoutId: ReturnType<typeof setTimeout>;
}

@Injectable({ providedIn: 'root' })
export class InvoiceStoreService {
  private readonly bills = inject(BillApiService);

  private readonly _invoices = signal<Invoice[]>([]);
  readonly invoices = this._invoices.asReadonly();

  readonly listLoadError = signal<string | null>(null);
  readonly listLoading = signal(false);

  /** Invoices hidden from the list until undo window ends or user restores. */
  readonly pendingDeletes = signal<ReadonlyMap<string, PendingInvoiceDelete>>(new Map());

  private readonly deleteTimers = new Map<string, DeleteTimers>();

  loadAll(): void {
    this.listLoading.set(true);
    this.listLoadError.set(null);
    this.bills.list().subscribe({
      next: (rows) => {
        this._invoices.set(rows);
        this.listLoading.set(false);
      },
      error: (err: unknown) => {
        this.listLoadError.set(httpErrorMessage(err));
        this.listLoading.set(false);
      },
    });
  }

  /**
   * Hide invoice immediately; permanent DELETE runs after {@link UNDO_SECONDS} unless
   * {@link undoPendingDelete} is called.
   */
  scheduleRemove(invoice: Invoice): void {
    const id = invoice.id;
    if (this.pendingDeletes().has(id)) {
      return;
    }

    this._invoices.update((list) => list.filter((inv) => inv.id !== id));
    this.setPendingSeconds(id, invoice, UNDO_SECONDS);

    const intervalId = setInterval(() => {
      const current = this.pendingDeletes().get(id);
      if (!current) return;
      const next = current.secondsLeft - 1;
      if (next <= 0) {
        this.updatePendingSeconds(id, invoice, 0);
        return;
      }
      this.updatePendingSeconds(id, invoice, next);
    }, 1000);

    const timeoutId = setTimeout(() => {
      this.clearTimers(id);
      this.commitPendingDelete(id);
    }, UNDO_SECONDS * 1000);

    this.deleteTimers.set(id, { intervalId, timeoutId });
  }

  undoPendingDelete(id: string): void {
    const pending = this.pendingDeletes().get(id);
    if (!pending) return;

    this.clearTimers(id);
    this.removePending(id);
    this._invoices.update((list) => insertInvoiceSorted(list, pending.invoice));
  }

  private commitPendingDelete(id: string): void {
    const pending = this.pendingDeletes().get(id);
    if (!pending) return;

    this.removePending(id);
    this.bills.delete(id).subscribe({
      error: (err: unknown) => {
        this._invoices.update((list) => insertInvoiceSorted(list, pending.invoice));
        this.listLoadError.set(httpErrorMessage(err));
      },
    });
  }

  private setPendingSeconds(id: string, invoice: Invoice, secondsLeft: number): void {
    this.pendingDeletes.update((map) => {
      const next = new Map(map);
      next.set(id, { invoice, secondsLeft });
      return next;
    });
  }

  private updatePendingSeconds(id: string, invoice: Invoice, secondsLeft: number): void {
    this.setPendingSeconds(id, invoice, secondsLeft);
  }

  private removePending(id: string): void {
    this.pendingDeletes.update((map) => {
      const next = new Map(map);
      next.delete(id);
      return next;
    });
  }

  private clearTimers(id: string): void {
    const t = this.deleteTimers.get(id);
    if (t) {
      clearInterval(t.intervalId);
      clearTimeout(t.timeoutId);
      this.deleteTimers.delete(id);
    }
  }
}

function insertInvoiceSorted(list: Invoice[], invoice: Invoice): Invoice[] {
  return [...list, invoice].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}
