package com.Billing.application.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

public record SendToPrinterRequest(
		@NotEmpty List<@Size(max = 256) String> barcodes,
		@Min(1) @Max(99) int copiesPerBarcode,
		@Size(max = 253) String printerHost,
		@Min(1) @Max(65535) Integer printerPort
) {
}
