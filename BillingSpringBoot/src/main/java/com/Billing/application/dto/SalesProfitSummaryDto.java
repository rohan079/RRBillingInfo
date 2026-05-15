package com.Billing.application.dto;

import java.math.BigDecimal;

/**
 * Total sales (sum of invoice totals) and derived profit for a date range in the report zone.
 */
public record SalesProfitSummaryDto(
		String from,
		String to,
		String zone,
		long sales,
		long profit,
		BigDecimal profitMarginApplied
) {
}
