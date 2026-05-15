import { CurrencyPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  BarcodePrintApiService,
  type BarcodeLabelDto,
} from '../api/barcode-print-api.service';
import { httpErrorMessage } from '../api/http-error.util';

const PRINTER_HOST_KEY = 'billing.printer.host';
const PRINTER_PORT_KEY = 'billing.printer.port';

@Component({
  selector: 'app-barcode-print',
  standalone: true,
  imports: [CurrencyPipe, FormsModule],
  templateUrl: './barcode-print.html',
  styleUrl: './barcode-print.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BarcodePrint implements OnInit {
  private readonly api = inject(BarcodePrintApiService);

  protected readonly inventory = signal<BarcodeLabelDto[]>([]);
  protected readonly selected = signal<Set<string>>(new Set());
  protected readonly previewLabels = signal<BarcodeLabelDto[]>([]);

  protected readonly loading = signal(false);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly success = signal<string | null>(null);

  protected copiesPerBarcode = 1;
  protected manualBarcode = '';
  protected printerHost = '';
  protected printerPort = 9100;

  ngOnInit(): void {
    this.printerHost = localStorage.getItem(PRINTER_HOST_KEY) ?? '';
    const port = Number(localStorage.getItem(PRINTER_PORT_KEY));
    this.printerPort = Number.isFinite(port) && port > 0 ? port : 9100;
    this.loadInventory();
  }

  protected loadInventory(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.inventoryLabels().subscribe({
      next: (rows) => {
        this.inventory.set(rows);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.error.set(httpErrorMessage(err));
        this.loading.set(false);
      },
    });
  }

  protected toggleSelect(barcode: string): void {
    this.selected.update((set) => {
      const next = new Set(set);
      if (next.has(barcode)) next.delete(barcode);
      else next.add(barcode);
      return next;
    });
  }

  protected selectAll(): void {
    this.selected.set(new Set(this.inventory().map((i) => i.barcode)));
  }

  protected clearSelection(): void {
    this.selected.set(new Set());
  }

  protected addManualToSelection(): void {
    const bc = this.manualBarcode.trim();
    if (!bc) return;
    this.selected.update((set) => new Set(set).add(bc));
    this.manualBarcode = '';
  }

  protected generatePreview(): void {
    const barcodes = [...this.selected()];
    if (barcodes.length === 0) {
      this.error.set('Select at least one barcode.');
      return;
    }
    this.runGenerate(barcodes);
  }

  protected printBrowser(): void {
    const labels = this.previewLabels();
    if (labels.length === 0) {
      this.error.set('Generate preview first.');
      return;
    }
    const html = this.buildPrintHtml(labels);
    const w = window.open('', '_blank', 'width=800,height=600');
    if (!w) {
      this.error.set('Allow pop-ups to print labels.');
      return;
    }
    w.document.write(html);
    w.document.close();
    w.onload = () => {
      w.focus();
      w.print();
    };
  }

  protected sendToNetworkPrinter(): void {
    const barcodes = [...this.selected()];
    if (barcodes.length === 0) {
      this.error.set('Select at least one barcode.');
      return;
    }
    const host = this.printerHost.trim();
    if (!host) {
      this.error.set('Enter printer IP address (Zebra/TSC on your network).');
      return;
    }
    localStorage.setItem(PRINTER_HOST_KEY, host);
    localStorage.setItem(PRINTER_PORT_KEY, String(this.printerPort));

    this.error.set(null);
    this.success.set(null);
    this.busy.set(true);
    this.api
      .sendToPrinter({
        barcodes,
        copiesPerBarcode: Math.max(1, Math.floor(Number(this.copiesPerBarcode)) || 1),
        printerHost: host,
        printerPort: this.printerPort,
      })
      .subscribe({
        next: (res) => {
          this.busy.set(false);
          this.success.set(`${res.message} (${res.printerAddress})`);
        },
        error: (err: unknown) => {
          this.busy.set(false);
          this.error.set(httpErrorMessage(err));
        },
      });
  }

  protected isSelected(barcode: string): boolean {
    return this.selected().has(barcode);
  }

  private runGenerate(barcodes: string[]): void {
    this.error.set(null);
    this.success.set(null);
    this.busy.set(true);
    this.api
      .generate({
        barcodes,
        copiesPerBarcode: Math.max(1, Math.floor(Number(this.copiesPerBarcode)) || 1),
      })
      .subscribe({
        next: (labels) => {
          this.previewLabels.set(labels);
          this.busy.set(false);
          this.success.set(`Generated ${labels.length} label(s).`);
        },
        error: (err: unknown) => {
          this.busy.set(false);
          this.error.set(httpErrorMessage(err));
        },
      });
  }

  private buildPrintHtml(labels: BarcodeLabelDto[]): string {
    const cards = labels
      .map(
        (l) => `
      <div class="label">
        <img src="${l.imageDataUrl}" alt="${l.barcode}" />
        <p class="bc">${l.barcode}</p>
        ${l.caption ? `<p class="cap">${l.caption}</p>` : ''}
      </div>`,
      )
      .join('');
    return `<!DOCTYPE html><html><head><title>Barcode labels</title>
      <style>
        @page { size: 50mm 30mm; margin: 2mm; }
        body { margin: 0; font-family: system-ui, sans-serif; }
        .label { page-break-after: always; text-align: center; padding: 4px; }
        .label:last-child { page-break-after: auto; }
        img { max-width: 46mm; height: auto; }
        .bc { font-size: 10px; margin: 4px 0 0; font-family: monospace; }
        .cap { font-size: 11px; margin: 2px 0 0; font-weight: 600; }
      </style></head><body>${cards}</body></html>`;
  }
}
