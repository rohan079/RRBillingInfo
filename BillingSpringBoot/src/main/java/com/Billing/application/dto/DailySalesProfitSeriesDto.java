package com.Billing.application.dto;

import java.util.List;

public record DailySalesProfitSeriesDto(String from, String to, String zone, List<DailySalesProfitPointDto> days) {
}
