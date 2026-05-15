package com.Billing.application.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

/**
 * Create many inventory rows with auto-generated unique barcodes
 * ({@code prefix-batchId-index}).
 */
public record BulkGenerateInventoryRequest(
		@NotNull @Min(1) @Max(10_000) Integer count,
		@Size(max = 40) String prefix,
		@NotNull @Min(0) Integer quantity,
		@NotNull @DecimalMin("0") BigDecimal actualPrice,
		@NotNull @DecimalMin("0") BigDecimal marginPrice
) {
}
