package com.Billing.application.dto;

import java.util.List;

public record DashboardStatsDto(
		LastMonthSummaryDto lastMonth,
		List<MonthlyPointDto> last3Months,
		List<MonthlyPointDto> last6Months
) {
}
