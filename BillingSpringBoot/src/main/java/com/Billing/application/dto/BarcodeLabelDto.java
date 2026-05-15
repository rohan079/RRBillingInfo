package com.Billing.application.dto;

import java.math.BigDecimal;

/** One printable barcode label (image for browser preview + metadata). */
public record BarcodeLabelDto(
		String barcode,
		String caption,
		BigDecimal marginPrice,
		/** PNG as data URL: data:image/png;base64,... */
		String imageDataUrl
) {
}
