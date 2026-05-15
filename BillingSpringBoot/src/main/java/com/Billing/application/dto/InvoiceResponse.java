package com.Billing.application.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record InvoiceResponse(
		String id,
		Instant createdAt,
		List<InvoiceLineDto> lines,
		BigDecimal subtotal,
		BigDecimal discountPercent,
		BigDecimal discountAmount,
		BigDecimal total
) {
}
