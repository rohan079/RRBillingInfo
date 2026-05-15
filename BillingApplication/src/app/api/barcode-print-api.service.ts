import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';

import { environment } from '../../environments/environment';

export interface BarcodeLabelDto {
  barcode: string;
  caption: string;
  marginPrice: number | null;
  imageDataUrl: string;
}

export interface GenerateBarcodeLabelsRequest {
  barcodes: string[];
  copiesPerBarcode: number;
}

export interface SendToPrinterRequest {
  barcodes: string[];
  copiesPerBarcode: number;
  printerHost?: string;
  printerPort?: number;
}

export interface PrinterSendResultDto {
  success: boolean;
  message: string;
  labelsSent: number;
  printerAddress: string;
}

@Injectable({ providedIn: 'root' })
export class BarcodePrintApiService {
  private readonly http = inject(HttpClient);
  private readonly root = `${environment.apiBaseUrl}/api/barcode-print`;

  inventoryLabels(): Observable<BarcodeLabelDto[]> {
    return this.http.get<BarcodeLabelDto[]>(`${this.root}/inventory-labels`);
  }

  generate(body: GenerateBarcodeLabelsRequest): Observable<BarcodeLabelDto[]> {
    return this.http.post<BarcodeLabelDto[]>(`${this.root}/generate`, body);
  }

  sendToPrinter(body: SendToPrinterRequest): Observable<PrinterSendResultDto> {
    return this.http.post<PrinterSendResultDto>(`${this.root}/send-to-printer`, body);
  }
}
