import { CurrencyPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { httpErrorMessage } from '../api/http-error.util';
import {
  InventoryApiService,
  type InventoryItemDto,
} from '../api/inventory-api.service';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CurrencyPipe, FormsModule],
  templateUrl: './products.html',
  styleUrl: './products.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Products implements OnInit {
  private readonly inventory = inject(InventoryApiService);

  protected readonly items = signal<InventoryItemDto[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly success = signal<string | null>(null);

  /** Manual add */
  protected newBarcode = '';
  protected newQty = 0;
  protected newActual = 0;
  protected newMargin = 0;

  /** Bulk auto barcodes */
  protected bulkCount = 50;
  protected bulkPrefix = 'AUTO';
  protected bulkQty = 0;
  protected bulkActual = 0;
  protected bulkMargin = 0;
  protected bulkBusy = signal(false);

  /** Bulk remove by count (and optional batch id from barcode). */
  protected removeCount = 40;
  protected removePrefix = 'AUTO';
  protected removeBatchId = '';
  protected removeBusy = signal(false);

  ngOnInit(): void {
    this.refresh();
  }

  protected refresh(): void {
    this.loading.set(true);
    this.error.set(null);
    this.inventory.list().subscribe({
      next: (rows) => {
        this.items.set(rows);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.error.set(httpErrorMessage(err));
        this.loading.set(false);
      },
    });
  }

  protected addProduct(): void {
    const barcode = this.newBarcode.trim();
    if (!barcode) {
      this.error.set('Enter a barcode for manual add.');
      return;
    }
    this.error.set(null);
    this.success.set(null);
    this.inventory
      .create({
        barcode,
        quantity: Math.max(0, Math.floor(Number(this.newQty)) || 0),
        actualPrice: Number(this.newActual) || 0,
        marginPrice: Number(this.newMargin) || 0,
      })
      .subscribe({
        next: () => {
          this.newBarcode = '';
          this.newQty = 0;
          this.newActual = 0;
          this.newMargin = 0;
          this.success.set('Product added.');
          this.refresh();
        },
        error: (err: unknown) => {
          this.error.set(httpErrorMessage(err));
        },
      });
  }

  protected generateBarcodes(): void {
    const count = Math.floor(Number(this.bulkCount));
    if (!Number.isFinite(count) || count < 1) {
      this.error.set('Enter how many barcodes to generate (e.g. 50).');
      return;
    }
    if (count > 10_000) {
      this.error.set('Maximum 10,000 per request.');
      return;
    }
    this.error.set(null);
    this.success.set(null);
    this.bulkBusy.set(true);
    this.inventory
      .bulkGenerate({
        count,
        prefix: this.bulkPrefix?.trim() || undefined,
        quantity: Math.max(0, Math.floor(Number(this.bulkQty)) || 0),
        actualPrice: Number(this.bulkActual) || 0,
        marginPrice: Number(this.bulkMargin) || 0,
      })
      .subscribe({
        next: (created) => {
          this.bulkBusy.set(false);
          this.success.set(`Created ${created.length} products with new barcodes.`);
          this.refresh();
        },
        error: (err: unknown) => {
          this.bulkBusy.set(false);
          this.error.set(httpErrorMessage(err));
        },
      });
  }

  protected removeBarcodes(): void {
    const count = Math.floor(Number(this.removeCount));
    if (!Number.isFinite(count) || count < 1) {
      this.error.set('Enter how many barcodes to remove (e.g. 40).');
      return;
    }
    if (count > 10_000) {
      this.error.set('Maximum 10,000 per request.');
      return;
    }
    let batchMillis: number | undefined;
    const batchRaw = this.removeBatchId.trim();
    if (batchRaw) {
      const n = Number(batchRaw);
      if (!Number.isFinite(n) || n <= 0) {
        this.error.set('Batch id must be the number after the prefix (e.g. 1730000000000).');
        return;
      }
      batchMillis = Math.trunc(n);
    }
    this.error.set(null);
    this.success.set(null);
    this.removeBusy.set(true);
    const body: {
      count: number;
      prefix?: string;
      batchMillis?: number;
    } = {
      count,
      prefix: this.removePrefix?.trim() || undefined,
    };
    if (batchMillis !== undefined) {
      body.batchMillis = batchMillis;
    }
    this.inventory.bulkRemove(body).subscribe({
      next: (res) => {
        this.removeBusy.set(false);
        this.success.set(`Removed ${res.removed} product(s).`);
        this.refresh();
      },
      error: (err: unknown) => {
        this.removeBusy.set(false);
        this.error.set(httpErrorMessage(err));
      },
    });
  }

  protected removeProduct(id: number): void {
    this.error.set(null);
    this.success.set(null);
    this.inventory.deleteById(id).subscribe({
      next: () => {
        this.success.set('Product removed.');
        this.refresh();
      },
      error: (err: unknown) => {
        this.error.set(httpErrorMessage(err));
      },
    });
  }

  protected dismissMessages(): void {
    this.error.set(null);
    this.success.set(null);
  }
}
