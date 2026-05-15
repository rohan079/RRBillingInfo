package com.Billing.application.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record UpdateInventoryItemRequest(
		@NotNull @Min(0) Integer quantity,
		@NotNull @DecimalMin("0") BigDecimal actualPrice,
		@NotNull @DecimalMin("0") BigDecimal marginPrice
) {
}
