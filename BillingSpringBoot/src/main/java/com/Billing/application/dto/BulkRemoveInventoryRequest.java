package com.Billing.application.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record BulkRemoveInventoryRequest(
		@NotNull @Min(1) @Max(10_000) Integer count,
		/** Matches generated barcodes, e.g. {@code AUTO}. Defaults to {@code AUTO} if blank. */
		@Size(max = 40) String prefix,
		/**
		 * If set, only barcodes {@code PREFIX-BATCHMILLIS-#####} are considered (that batch).
		 * If null, any barcode starting with {@code PREFIX-} is considered; rows are removed by
		 * newest id first among matches.
		 */
		Long batchMillis
) {
}
