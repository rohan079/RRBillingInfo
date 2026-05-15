package com.Billing.application.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record CreateInventoryItemRequest(
		@NotBlank @Size(max = 256) String barcode,
		@NotNull @Min(0) Integer quantity,
		@NotNull @DecimalMin("0") BigDecimal actualPrice,
		@NotNull @DecimalMin("0") BigDecimal marginPrice
) {
}
