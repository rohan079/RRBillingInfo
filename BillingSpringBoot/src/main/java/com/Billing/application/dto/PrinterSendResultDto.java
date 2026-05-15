package com.Billing.application.dto;

public record PrinterSendResultDto(boolean success, String message, int labelsSent, String printerAddress) {
}
