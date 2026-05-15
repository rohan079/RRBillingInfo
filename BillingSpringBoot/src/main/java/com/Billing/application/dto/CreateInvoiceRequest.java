package com.Billing.application.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record CreateInvoiceRequest(
		@Size(max = 128) String id,
		Instant createdAt,
		@NotEmpty List<@Valid CreateInvoiceLineRequest> lines,
		@NotNull @DecimalMin("0") BigDecimal subtotal,
		@NotNull @DecimalMin("0") @DecimalMax("100") BigDecimal discountPercent,
		@NotNull @DecimalMin("0") BigDecimal discountAmount,
		@NotNull @DecimalMin("0") BigDecimal total
) {
}
