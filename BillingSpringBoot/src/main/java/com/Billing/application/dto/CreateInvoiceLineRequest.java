package com.Billing.application.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record CreateInvoiceLineRequest(
		@NotNull @Size(max = 256) String barcode,
		@NotNull @Size(max = 512) String label,
		@Positive int qty,
		@NotNull @DecimalMin("0") BigDecimal unitPrice,
		@NotNull @DecimalMin("0") BigDecimal lineTotal
) {
}
