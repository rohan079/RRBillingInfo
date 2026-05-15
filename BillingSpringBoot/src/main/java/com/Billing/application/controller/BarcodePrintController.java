package com.Billing.application.controller;

import com.Billing.application.dto.BarcodeLabelDto;
import com.Billing.application.dto.GenerateBarcodeLabelsRequest;
import com.Billing.application.dto.PrinterSendResultDto;
import com.Billing.application.dto.SendToPrinterRequest;
import com.Billing.application.service.BarcodePrintService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/barcode-print")
public class BarcodePrintController {

	private final BarcodePrintService barcodePrintService;

	public BarcodePrintController(BarcodePrintService barcodePrintService) {
		this.barcodePrintService = barcodePrintService;
	}

	/** Inventory barcodes with preview images for the print UI. */
	@GetMapping("/inventory-labels")
	public List<BarcodeLabelDto> inventoryLabels() {
		return barcodePrintService.listPrintableFromInventory();
	}

	/** Build label images (PNG data URLs) for browser print preview. */
	@PostMapping("/generate")
	public List<BarcodeLabelDto> generate(@Valid @RequestBody GenerateBarcodeLabelsRequest body) {
		return barcodePrintService.generateLabels(body.barcodes(), body.copiesPerBarcode());
	}

	/**
	 * Send ZPL to a network barcode printer (raw TCP, usually port 9100). Printer must be on the
	 * same network as the Spring Boot server.
	 */
	@PostMapping("/send-to-printer")
	public PrinterSendResultDto sendToPrinter(@Valid @RequestBody SendToPrinterRequest body) {
		return barcodePrintService.sendToNetworkPrinter(
				body.barcodes(), body.copiesPerBarcode(), body.printerHost(), body.printerPort());
	}
}
