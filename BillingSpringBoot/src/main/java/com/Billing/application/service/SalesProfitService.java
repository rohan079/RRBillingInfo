package com.Billing.application.service;

import com.Billing.application.dto.DailySalesProfitPointDto;
import com.Billing.application.dto.DailySalesProfitSeriesDto;
import com.Billing.application.dto.SalesProfitSummaryDto;
import com.Billing.application.repository.InvoiceRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
public class SalesProfitService {

	private static final ZoneId REPORT_ZONE = ZoneId.of("Asia/Kolkata");
	private static final int MAX_RANGE_DAYS = 366;

	private final InvoiceRepository invoiceRepository;
	private final BigDecimal profitMargin;

	public SalesProfitService(
			InvoiceRepository invoiceRepository,
			@Value("${app.dashboard.profit-margin:0.22}") BigDecimal profitMargin) {
		this.invoiceRepository = invoiceRepository;
		this.profitMargin = profitMargin;
	}

	/**
	 * Inclusive calendar-day range in {@link #REPORT_ZONE}: sales = sum of invoice {@code total},
	 * profit = {@code round(sales * profitMargin)} (same rule as dashboard).
	 */
	public SalesProfitSummaryDto summary(LocalDate fromInclusive, LocalDate toInclusive) {
		validateRange(fromInclusive, toInclusive);
		ZonedDateTime start = fromInclusive.atStartOfDay(REPORT_ZONE);
		ZonedDateTime endExclusive = toInclusive.plusDays(1).atStartOfDay(REPORT_ZONE);
		BigDecimal salesBd =
				invoiceRepository.sumTotalBetween(start.toInstant(), endExclusive.toInstant());
		long sales = toRupeeLong(salesBd);
		long profit = profitFromSales(sales);
		return new SalesProfitSummaryDto(
				fromInclusive.toString(),
				toInclusive.toString(),
				REPORT_ZONE.getId(),
				sales,
				profit,
				profitMargin);
	}

	/** One row per calendar day (inclusive), including days with zero sales. */
	public DailySalesProfitSeriesDto dailySeries(LocalDate fromInclusive, LocalDate toInclusive) {
		validateRange(fromInclusive, toInclusive);
		List<DailySalesProfitPointDto> days = new ArrayList<>();
		for (LocalDate d = fromInclusive; !d.isAfter(toInclusive); d = d.plusDays(1)) {
			ZonedDateTime start = d.atStartOfDay(REPORT_ZONE);
			ZonedDateTime end = d.plusDays(1).atStartOfDay(REPORT_ZONE);
			BigDecimal salesBd = invoiceRepository.sumTotalBetween(start.toInstant(), end.toInstant());
			long sales = toRupeeLong(salesBd);
			long profit = profitFromSales(sales);
			days.add(new DailySalesProfitPointDto(d.toString(), sales, profit));
		}
		return new DailySalesProfitSeriesDto(
				fromInclusive.toString(), toInclusive.toString(), REPORT_ZONE.getId(), days);
	}

	private void validateRange(LocalDate from, LocalDate to) {
		if (from == null || to == null) {
			throw new IllegalArgumentException("from and to are required (yyyy-MM-dd)");
		}
		if (from.isAfter(to)) {
			throw new IllegalArgumentException("from must be on or before to");
		}
		long span = to.toEpochDay() - from.toEpochDay() + 1;
		if (span > MAX_RANGE_DAYS) {
			throw new IllegalArgumentException("Range too large (max " + MAX_RANGE_DAYS + " days)");
		}
	}

	private long profitFromSales(long salesRupee) {
		return toRupeeLong(
				BigDecimal.valueOf(salesRupee).multiply(profitMargin).setScale(0, RoundingMode.HALF_UP));
	}

	private static long toRupeeLong(BigDecimal amount) {
		return amount.setScale(0, RoundingMode.HALF_UP).longValue();
	}
}
