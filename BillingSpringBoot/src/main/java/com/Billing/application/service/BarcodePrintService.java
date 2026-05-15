package com.Billing.application.service;

import com.Billing.application.dto.BarcodeLabelDto;
import com.Billing.application.dto.PrinterSendResultDto;
import com.Billing.application.entity.InventoryItem;
import com.Billing.application.repository.InventoryItemRepository;
import com.google.zxing.BarcodeFormat;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.oned.Code128Writer;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.math.BigDecimal;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Optional;

@Service
public class BarcodePrintService {

	private static final int LABEL_WIDTH_PX = 400;
	private static final int LABEL_HEIGHT_PX = 160;

	private final InventoryItemRepository inventoryItemRepository;
	private final String defaultPrinterHost;
	private final int defaultPrinterPort;

	public BarcodePrintService(
			InventoryItemRepository inventoryItemRepository,
			@Value("${app.barcode-printer.default-host:}") String defaultPrinterHost,
			@Value("${app.barcode-printer.default-port:9100}") int defaultPrinterPort) {
		this.inventoryItemRepository = inventoryItemRepository;
		this.defaultPrinterHost = defaultPrinterHost == null ? "" : defaultPrinterHost.trim();
		this.defaultPrinterPort = defaultPrinterPort;
	}

	public List<BarcodeLabelDto> generateLabels(List<String> barcodes, int copiesPerBarcode) {
		int copies = Math.max(1, Math.min(copiesPerBarcode, 99));
		List<BarcodeLabelDto> out = new ArrayList<>();
		for (String raw : barcodes) {
			String barcode = normalizeBarcode(raw);
			Optional<InventoryItem> inv = inventoryItemRepository.findByBarcode(barcode);
			String caption = inv.map(i -> "₹" + i.getMarginPrice().stripTrailingZeros().toPlainString())
					.orElse("");
			BigDecimal price = inv.map(InventoryItem::getMarginPrice).orElse(null);
			String imageDataUrl = renderCode128PngDataUrl(barcode);
			for (int c = 0; c < copies; c++) {
				out.add(new BarcodeLabelDto(barcode, caption, price, imageDataUrl));
			}
		}
		return out;
	}

	public PrinterSendResultDto sendToNetworkPrinter(
			List<String> barcodes, int copiesPerBarcode, String printerHost, Integer printerPort) {
		String host =
				printerHost != null && !printerHost.isBlank() ? printerHost.trim() : defaultPrinterHost;
		if (host.isBlank()) {
			throw new ResponseStatusException(
					HttpStatus.BAD_REQUEST, "Printer IP/host is required (set in UI or app.barcode-printer.default-host)");
		}
		int port = printerPort != null ? printerPort : defaultPrinterPort;
		int copies = Math.max(1, Math.min(copiesPerBarcode, 99));

		StringBuilder zpl = new StringBuilder();
		for (String raw : barcodes) {
			String barcode = normalizeBarcode(raw);
			for (int c = 0; c < copies; c++) {
				zpl.append(buildZplLabel(barcode));
			}
		}

		try {
			byte[] payload = zpl.toString().getBytes(StandardCharsets.UTF_8);
			try (Socket socket = new Socket()) {
				socket.connect(new InetSocketAddress(host, port), 8_000);
				socket.setSoTimeout(8_000);
				OutputStream os = socket.getOutputStream();
				os.write(payload);
				os.flush();
			}
			int labelCount = barcodes.size() * copies;
			return new PrinterSendResultDto(
					true,
					"Sent " + labelCount + " label(s) to printer",
					labelCount,
					host + ":" + port);
		} catch (IOException ex) {
			throw new ResponseStatusException(
					HttpStatus.BAD_GATEWAY,
					"Could not reach printer at " + host + ":" + port + " — " + ex.getMessage());
		}
	}

	/** Distinct inventory rows for the print UI picker. */
	public List<BarcodeLabelDto> listPrintableFromInventory() {
		return inventoryItemRepository.findAllByOrderByBarcodeAsc().stream()
				.map(
						i ->
								new BarcodeLabelDto(
										i.getBarcode(),
										"₹" + i.getMarginPrice().stripTrailingZeros().toPlainString(),
										i.getMarginPrice(),
										renderCode128PngDataUrl(i.getBarcode())))
				.toList();
	}

	private static String normalizeBarcode(String barcode) {
		if (barcode == null || barcode.isBlank()) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Barcode is required");
		}
		return barcode.trim();
	}

	private static String renderCode128PngDataUrl(String barcode) {
		try {
			Code128Writer writer = new Code128Writer();
			BitMatrix matrix = writer.encode(barcode, BarcodeFormat.CODE_128, LABEL_WIDTH_PX, LABEL_HEIGHT_PX - 40);
			ByteArrayOutputStream baos = new ByteArrayOutputStream();
			MatrixToImageWriter.writeToStream(matrix, "PNG", baos);
			String b64 = Base64.getEncoder().encodeToString(baos.toByteArray());
			return "data:image/png;base64," + b64;
		} catch (Exception ex) {
			throw new ResponseStatusException(
					HttpStatus.INTERNAL_SERVER_ERROR, "Failed to render barcode: " + barcode);
		}
	}

	/** ZPL for Zebra / TSC-compatible printers (Code 128). */
	private static String buildZplLabel(String barcode) {
		String safe = barcode.replace('^', ' ').replace('~', ' ');
		return """
				^XA
				^FO40,30^BY2^BCN,80,Y,N,N^FD%s^FS
				^FO40,130^A0N,28,28^FD%s^FS
				^XZ
				"""
				.formatted(safe, safe);
	}

}
