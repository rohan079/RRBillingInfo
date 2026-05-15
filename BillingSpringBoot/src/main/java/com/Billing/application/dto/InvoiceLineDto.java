package com.Billing.application.dto;

import java.math.BigDecimal;

public record InvoiceLineDto(
		String barcode,
		String label,
		int qty,
		BigDecimal unitPrice,
		BigDecimal lineTotal
) {
}
