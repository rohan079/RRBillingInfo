export interface InvoiceLineSnapshot {
  barcode: string;
  label: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
}

export interface Invoice {
  id: string;
  /** ISO 8601 timestamp (UTC string from `toISOString()`). */
  createdAt: string;
  lines: InvoiceLineSnapshot[];
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  total: number;
}
