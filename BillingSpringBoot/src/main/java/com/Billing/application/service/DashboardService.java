package com.Billing.application.service;

import com.Billing.application.dto.DashboardStatsDto;
import com.Billing.application.dto.LastMonthSummaryDto;
import com.Billing.application.dto.MonthlyPointDto;
import com.Billing.application.dto.TodaySnapshotDto;
import com.Billing.application.repository.InvoiceRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Service
public class DashboardService {

	private static final ZoneId REPORT_ZONE = ZoneId.of("Asia/Kolkata");
	private static final Locale REPORT_LOCALE = Locale.forLanguageTag("en-IN");
	private static final DateTimeFormatter MONTH_SHORT =
			DateTimeFormatter.ofPattern("MMM yyyy", REPORT_LOCALE);
	private static final DateTimeFormatter MONTH_LONG =
			DateTimeFormatter.ofPattern("MMMM yyyy", REPORT_LOCALE);
	private static final DateTimeFormatter TODAY_LABEL =
			DateTimeFormatter.ofPattern("EEEE, d MMMM yyyy", REPORT_LOCALE);

	private final InvoiceRepository invoiceRepository;
	private final BigDecimal profitMargin;

	public DashboardService(
			InvoiceRepository invoiceRepository,
			@Value("${app.dashboard.profit-margin:0.22}") BigDecimal profitMargin) {
		this.invoiceRepository = invoiceRepository;
		this.profitMargin = profitMargin;
	}

	public DashboardStatsDto getSnapshot(Instant reference) {
		YearMonth currentYm = YearMonth.from(reference.atZone(REPORT_ZONE));

		YearMonth lastMonthYm = currentYm.minusMonths(1);
		LastMonthSummaryDto lastMonth = toLastMonthSummary(lastMonthYm);

		List<MonthlyPointDto> last3 = new ArrayList<>();
		for (int i = 3; i >= 1; i--) {
			last3.add(toMonthlyPoint(currentYm.minusMonths(i)));
		}

		List<MonthlyPointDto> last6 = new ArrayList<>();
		for (int i = 5; i >= 0; i--) {
			last6.add(toMonthlyPoint(currentYm.minusMonths(i)));
		}

		return new DashboardStatsDto(lastMonth, last3, last6);
	}

	public TodaySnapshotDto getToday(LocalDate date) {
		LocalDate d = date != null ? date : LocalDate.now(REPORT_ZONE);
		ZonedDateTime start = d.atStartOfDay(REPORT_ZONE);
		ZonedDateTime end = d.plusDays(1).atStartOfDay(REPORT_ZONE);
		BigDecimal sales = invoiceRepository.sumTotalBetween(start.toInstant(), end.toInstant());
		long salesLong = toRupeeLong(sales);
		long profitLong = profitFromSales(salesLong);
		String dateIso = d.toString();
		String dateLabel = d.format(TODAY_LABEL);
		return new TodaySnapshotDto(dateIso, dateLabel, salesLong, profitLong);
	}

	/**
	 * Inclusive calendar-month range (same idea as the Angular custom range helper).
	 */
	public List<MonthlyPointDto> getMonthlyRange(LocalDate fromInclusive, LocalDate toInclusive) {
		if (fromInclusive == null || toInclusive == null) {
			throw new IllegalArgumentException("from and to are required");
		}
		if (fromInclusive.isAfter(toInclusive)) {
			throw new IllegalArgumentException("from must be on or before to");
		}
		YearMonth start = YearMonth.from(fromInclusive);
		YearMonth end = YearMonth.from(toInclusive);
		List<MonthlyPointDto> out = new ArrayList<>();
		for (YearMonth ym = start; !ym.isAfter(end); ym = ym.plusMonths(1)) {
			out.add(toMonthlyPoint(ym));
		}
		return out;
	}

	private LastMonthSummaryDto toLastMonthSummary(YearMonth ym) {
		MonthlyPointDto p = toMonthlyPoint(ym);
		String periodLabel = ym.atDay(1).format(MONTH_LONG);
		return new LastMonthSummaryDto(periodLabel, p.sales(), p.profit());
	}

	private MonthlyPointDto toMonthlyPoint(YearMonth ym) {
		ZonedDateTime start = ym.atDay(1).atStartOfDay(REPORT_ZONE);
		ZonedDateTime end = ym.plusMonths(1).atDay(1).atStartOfDay(REPORT_ZONE);
		BigDecimal sales = invoiceRepository.sumTotalBetween(start.toInstant(), end.toInstant());
		long salesLong = toRupeeLong(sales);
		long profitLong = profitFromSales(salesLong);
		String label = ym.atDay(1).format(MONTH_SHORT);
		return new MonthlyPointDto(label, salesLong, profitLong);
	}

	private long profitFromSales(long salesRupee) {
		return toRupeeLong(
				BigDecimal.valueOf(salesRupee).multiply(profitMargin).setScale(0, RoundingMode.HALF_UP));
	}

	private static long toRupeeLong(BigDecimal amount) {
		return amount.setScale(0, RoundingMode.HALF_UP).longValue();
	}
}
