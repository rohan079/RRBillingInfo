package com.Billing.application.controller;

import com.Billing.application.dto.DailySalesProfitSeriesDto;
import com.Billing.application.dto.SalesProfitSummaryDto;
import com.Billing.application.service.SalesProfitService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/sales-profit")
public class SalesProfitController {

	private final SalesProfitService salesProfitService;

	public SalesProfitController(SalesProfitService salesProfitService) {
		this.salesProfitService = salesProfitService;
	}

	/**
	 * Total sales and profit for an inclusive date range (Asia/Kolkata calendar days).
	 * Sales = sum of invoice totals; profit = sales × {@code app.dashboard.profit-margin}.
	 */
	@GetMapping("/summary")
	public SalesProfitSummaryDto summary(
			@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
			@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
		return salesProfitService.summary(from, to);
	}

	/** Per-day sales and profit for the same rules as {@link #summary}. */
	@GetMapping("/daily")
	public DailySalesProfitSeriesDto daily(
			@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
			@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
		return salesProfitService.dailySeries(from, to);
	}
}
