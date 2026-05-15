package com.Billing.application.dto;

import java.math.BigDecimal;

public record InventoryItemResponse(
		long id,
		String barcode,
		int quantity,
		BigDecimal actualPrice,
		BigDecimal marginPrice
) {
}
