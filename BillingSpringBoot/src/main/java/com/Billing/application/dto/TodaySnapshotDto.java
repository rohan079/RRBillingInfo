package com.Billing.application.dto;

public record TodaySnapshotDto(String dateIso, String dateLabel, long sales, long profit) {
}
