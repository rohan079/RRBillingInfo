package com.Billing.application.controller;

import com.Billing.application.dto.DashboardStatsDto;
import com.Billing.application.dto.MonthlyPointDto;
import com.Billing.application.dto.TodaySnapshotDto;
import com.Billing.application.service.DashboardService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

	private final DashboardService dashboardService;

	public DashboardController(DashboardService dashboardService) {
		this.dashboardService = dashboardService;
	}

	@GetMapping("/stats")
	public DashboardStatsDto stats() {
		return dashboardService.getSnapshot(Instant.now());
	}

	@GetMapping("/today")
	public TodaySnapshotDto today(
			@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
		return dashboardService.getToday(date);
	}

	@GetMapping("/monthly-range")
	public List<MonthlyPointDto> monthlyRange(
			@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
			@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
		return dashboardService.getMonthlyRange(from, to);
	}
}
