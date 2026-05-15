/// <reference types="web-bluetooth" />
/// <reference types="w3c-web-serial" />
import { Component, NgZone, OnDestroy, computed, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { BillApiService } from '../api/bill-api.service';
import { InventoryApiService } from '../api/inventory-api.service';
import { httpErrorMessage } from '../api/http-error.util';

export interface BillLine {
  id: string;
  barcode: string;
  label: string;
  qty: number;
  unitPrice: number;
}

/** Nordic UART Service — common on BLE serial barcode scanners. */
const BLE_NUS_SERVICE = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
const BLE_NUS_RX = '6e400003-b5a3-f393-e0a9-e50e24dcca9e';

@Component({
  selector: 'app-home',
  imports: [CurrencyPipe, FormsModule],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home implements OnDestroy {
  private readonly ngZone = inject(NgZone);
  private readonly router = inject(Router);
  private readonly billApi = inject(BillApiService);
  private readonly inventoryApi = inject(InventoryApiService);

  private serialPort?: SerialPort;
  private serialReader?: ReadableStreamDefaultReader<Uint8Array>;
  private serialDecoder = new TextDecoder();

  private bluetoothDevice?: BluetoothDevice;
  private bleRx?: BluetoothRemoteGATTCharacteristic;

  private transportBuffer = '';

  private lastScan = '';
  private lastScanAt = 0;

  protected readonly serialSupported = signal(
    typeof navigator !== 'undefined' && !!navigator.serial,
  );
  protected readonly bluetoothSupported = signal(
    typeof navigator !== 'undefined' && !!navigator.bluetooth,
  );

  protected readonly usbSerialConnected = signal(false);
  protected readonly bluetoothScannerConnected = signal(false);

  /**
   * USB/BT setup dialog: hidden while a transport is connected, or after the
   * user dismisses it (wedge/manual only). Reopens when transports disconnect
   * or via the floating action.
   */
  protected readonly scannerTransportModalDismissed = signal(false);

  protected readonly showScannerTransportModal = computed(
    () =>
      !this.usbSerialConnected() &&
      !this.bluetoothScannerConnected() &&
      !this.scannerTransportModalDismissed(),
  );

  protected readonly showScannerTransportFab = computed(
    () =>
      !this.usbSerialConnected() &&
      !this.bluetoothScannerConnected() &&
      this.scannerTransportModalDismissed(),
  );

  protected readonly serialBaud = signal(9600);

  protected readonly finishBusy = signal(false);
  protected readonly finishError = signal<string | null>(null);

  protected readonly billLines = signal<BillLine[]>([]);
  /** Overall bill discount, 0–100 (% of line subtotal). */
  protected readonly billDiscountPercent = signal(0);

  protected wedgeBuffer = '';
  protected manualBarcode = '';

  private readonly onBleNotification = (ev: Event): void => {
    const ch = ev.target as BluetoothRemoteGATTCharacteristic;
    const v = ch.value;
    if (!v) return;
    const bytes = new Uint8Array(v.buffer, v.byteOffset, v.byteLength);
    const chunk = new TextDecoder().decode(bytes);
    this.ngZone.run(() => this.appendTransportChunk(chunk));
  };

  private readonly onBleGattDisconnected = (): void => {
    this.ngZone.run(() => {
      void this.teardownBleScanner();
    });
  };

  protected dismissScannerTransportModal(): void {
    this.scannerTransportModalDismissed.set(true);
  }

  protected openScannerTransportModal(): void {
    this.scannerTransportModalDismissed.set(false);
  }

  ngOnDestroy(): void {
    void this.disconnectUsbSerial();
    void this.disconnectBleScanner();
  }

  protected async toggleUsbSerial(): Promise<void> {
    if (this.usbSerialConnected()) {
      await this.disconnectUsbSerial();
      return;
    }
    if (!navigator.serial) return;
    try {
      const port = await navigator.serial.requestPort();
      await port.open({ baudRate: this.serialBaud() });
      const reader = port.readable?.getReader();
      if (!reader) {
        await port.close();
        return;
      }
      this.serialDecoder = new TextDecoder();
      this.serialPort = port;
      this.serialReader = reader;
      this.usbSerialConnected.set(true);
      this.transportBuffer = '';
      void this.pumpSerialPort();
    } catch {
      await this.disconnectUsbSerial();
    }
  }

  protected async toggleBleScanner(): Promise<void> {
    if (this.bluetoothScannerConnected()) {
      await this.disconnectBleScanner();
      return;
    }
    if (!navigator.bluetooth) return;
    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [BLE_NUS_SERVICE] }],
      });
      device.addEventListener(
        'gattserverdisconnected',
        this.onBleGattDisconnected,
      );
      const server = await device.gatt?.connect();
      if (!server) throw new Error('No GATT');
      const service = await server.getPrimaryService(BLE_NUS_SERVICE);
      const rx = await service.getCharacteristic(BLE_NUS_RX);
      await rx.startNotifications();
      rx.addEventListener('characteristicvaluechanged', this.onBleNotification);
      this.bluetoothDevice = device;
      this.bleRx = rx;
      this.bluetoothScannerConnected.set(true);
      this.transportBuffer = '';
    } catch {
      await this.disconnectBleScanner();
    }
  }

  private async pumpSerialPort(): Promise<void> {
    const reader = this.serialReader;
    if (!reader) return;
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value && value.byteLength) {
          const chunk = this.serialDecoder.decode(value, { stream: true });
          this.ngZone.run(() => this.appendTransportChunk(chunk));
        }
      }
    } catch {
      /* unplug / cancel */
    } finally {
      await this.disconnectUsbSerial();
    }
  }

  private async disconnectUsbSerial(): Promise<void> {
    if (this.serialReader) {
      try {
        await this.serialReader.cancel();
      } catch {
        /* ignore */
      }
      try {
        await this.serialReader.closed;
      } catch {
        /* ignore */
      }
      try {
        this.serialReader.releaseLock();
      } catch {
        /* ignore */
      }
      this.serialReader = undefined;
    }
    if (this.serialPort) {
      try {
        await this.serialPort.close();
      } catch {
        /* ignore */
      }
      this.serialPort = undefined;
    }
    this.usbSerialConnected.set(false);
    this.scannerTransportModalDismissed.set(false);
  }

  private async disconnectBleScanner(): Promise<void> {
    await this.teardownBleScanner();
  }

  private async teardownBleScanner(): Promise<void> {
    if (this.bleRx) {
      try {
        this.bleRx.removeEventListener(
          'characteristicvaluechanged',
          this.onBleNotification,
        );
        await this.bleRx.stopNotifications();
      } catch {
        /* ignore */
      }
      this.bleRx = undefined;
    }
    if (this.bluetoothDevice) {
      this.bluetoothDevice.removeEventListener(
        'gattserverdisconnected',
        this.onBleGattDisconnected,
      );
      try {
        if (this.bluetoothDevice.gatt?.connected) {
          this.bluetoothDevice.gatt.disconnect();
        }
      } catch {
        /* ignore */
      }
      this.bluetoothDevice = undefined;
    }
    this.bluetoothScannerConnected.set(false);
    this.scannerTransportModalDismissed.set(false);
  }

  protected onWedgeKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter' && event.key !== 'Tab') return;
    const code = this.wedgeBuffer.trim();
    if (!code) {
      if (event.key === 'Enter') event.preventDefault();
      return;
    }
    event.preventDefault();
    this.wedgeBuffer = '';
    this.commitScan(code);
  }

  protected addManualBarcode(): void {
    const code = this.manualBarcode.trim();
    if (!code) return;
    this.manualBarcode = '';
    this.commitScan(code);
  }

  protected incrementQty(id: string): void {
    this.billLines.update((rows) =>
      rows.map((r) => (r.id === id ? { ...r, qty: r.qty + 1 } : r)),
    );
  }

  protected decrementQty(id: string): void {
    this.billLines.update((rows) =>
      rows
        .map((r) => (r.id === id ? { ...r, qty: r.qty - 1 } : r))
        .filter((r) => r.qty > 0),
    );
  }

  protected removeLine(id: string): void {
    this.billLines.update((rows) => rows.filter((r) => r.id !== id));
  }

  protected clearBill(): void {
    this.billLines.set([]);
    this.billDiscountPercent.set(0);
    this.finishError.set(null);
  }

  /** Save bill via API (inventory decremented server-side), then open Invoices. */
  protected finishBill(): void {
    const lines = this.billLines();
    if (lines.length === 0) return;

    const subtotal = this.billSubtotal();
    const discountPercent = this.billDiscountPercent();
    const discountAmount = this.billDiscountAmount();
    const total = this.billGrandTotal();

    this.finishBusy.set(true);
    this.finishError.set(null);

    this.billApi
      .finishBill({
        id: `INV-${Date.now()}`,
        createdAt: new Date().toISOString(),
        lines: lines.map((l) => ({
          barcode: l.barcode,
          label: l.label,
          qty: l.qty,
          unitPrice: l.unitPrice,
          lineTotal: this.lineTotal(l),
        })),
        subtotal,
        discountPercent,
        discountAmount,
        total,
      })
      .subscribe({
        next: () => {
          this.ngZone.run(() => {
            this.finishBusy.set(false);
            this.clearBill();
            void this.router.navigateByUrl('/invoices');
          });
        },
        error: (err: unknown) => {
          this.ngZone.run(() => {
            this.finishBusy.set(false);
            this.finishError.set(httpErrorMessage(err));
          });
        },
      });
  }

  protected lineTotal(line: BillLine): number {
    return line.qty * line.unitPrice;
  }

  protected billSubtotal(): number {
    return this.billLines().reduce((s, l) => s + this.lineTotal(l), 0);
  }

  protected setBillDiscountPercent(value: number | string): void {
    const raw = typeof value === 'string' ? Number.parseFloat(value) : value;
    if (!Number.isFinite(raw) || raw <= 0) {
      this.billDiscountPercent.set(0);
      return;
    }
    this.billDiscountPercent.set(Math.min(100, Math.max(0, Math.round(raw))));
  }

  /** Rounded rupee discount from current subtotal and percent. */
  protected billDiscountAmount(): number {
    const sub = this.billSubtotal();
    const p = this.billDiscountPercent();
    if (sub <= 0 || p <= 0) return 0;
    return Math.round((sub * p) / 100);
  }

  protected billGrandTotal(): number {
    return Math.max(0, this.billSubtotal() - this.billDiscountAmount());
  }

  private appendTransportChunk(chunk: string): void {
    this.transportBuffer += chunk;
    let idx: number;
    while ((idx = this.transportBuffer.search(/[\r\n]/)) >= 0) {
      const line = this.transportBuffer.slice(0, idx).trim();
      this.transportBuffer = this.transportBuffer.slice(idx + 1);
      if (line) this.commitScan(line);
    }
  }

  private commitScan(barcode: string): void {
    const now = Date.now();
    if (barcode === this.lastScan && now - this.lastScanAt < 400) return;
    this.lastScan = barcode;
    this.lastScanAt = now;
    this.addBarcodeToBill(barcode);
  }

  private addBarcodeToBill(barcode: string): void {
    this.inventoryApi.getByBarcode(barcode).subscribe({
      next: (item) => {
        const unitPrice = Math.round(Number(item.marginPrice));
        const label = `Item ${item.barcode.slice(0, 12)}`;
        this.ngZone.run(() => {
          this.mergeOrAddLine(barcode, unitPrice, label);
        });
      },
      error: () => {
        const unitPrice = this.dummyUnitPrice(barcode);
        const label = `Item ${barcode.slice(0, 12)}`;
        this.ngZone.run(() => {
          this.mergeOrAddLine(barcode, unitPrice, label);
        });
      },
    });
  }

  private mergeOrAddLine(barcode: string, unitPrice: number, label: string): void {
    this.billLines.update((rows) => {
      const existing = rows.find((r) => r.barcode === barcode);
      if (existing) {
        return rows.map((r) =>
          r.barcode === barcode ? { ...r, qty: r.qty + 1 } : r,
        );
      }
      const line: BillLine = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        barcode,
        label,
        qty: 1,
        unitPrice,
      };
      return [...rows, line];
    });
  }

  private dummyUnitPrice(barcode: string): number {
    let h = 0;
    for (let i = 0; i < barcode.length; i++) {
      h = (h * 31 + barcode.charCodeAt(i)) >>> 0;
    }
    return 49 + (h % 450);
  }
}
