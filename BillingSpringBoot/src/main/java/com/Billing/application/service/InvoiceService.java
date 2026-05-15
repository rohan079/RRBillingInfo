package com.Billing.application.service;

import com.Billing.application.dto.CreateInvoiceLineRequest;
import com.Billing.application.dto.CreateInvoiceRequest;
import com.Billing.application.dto.InvoiceLineDto;
import com.Billing.application.dto.InvoiceResponse;
import com.Billing.application.entity.InventoryItem;
import com.Billing.application.entity.Invoice;
import com.Billing.application.entity.InvoiceLine;
import com.Billing.application.repository.InventoryItemRepository;
import com.Billing.application.repository.InvoiceRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class InvoiceService {

	private final InvoiceRepository invoiceRepository;
	private final InventoryItemRepository inventoryItemRepository;

	public InvoiceService(
			InvoiceRepository invoiceRepository, InventoryItemRepository inventoryItemRepository) {
		this.invoiceRepository = invoiceRepository;
		this.inventoryItemRepository = inventoryItemRepository;
	}

	@Transactional(readOnly = true)
	public List<InvoiceResponse> listAll() {
		return invoiceRepository.findAllWithLinesOrderedByCreatedAtDesc().stream()
				.map(this::toResponse)
				.toList();
	}

	@Transactional(readOnly = true)
	public InvoiceResponse getById(String id) {
		return invoiceRepository
				.findByIdWithLines(id)
				.map(this::toResponse)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Invoice not found"));
	}

	/**
	 * Persists the invoice and decrements inventory quantity for each line barcode (same key as
	 * inventory API). Fails the whole operation if any barcode is missing or stock is insufficient.
	 */
	@Transactional
	public InvoiceResponse create(CreateInvoiceRequest request) {
		String id =
				request.id() != null && !request.id().isBlank()
						? request.id().trim()
						: "INV-" + Instant.now().toEpochMilli();
		if (invoiceRepository.existsById(id)) {
			throw new ResponseStatusException(HttpStatus.CONFLICT, "Invoice id already exists");
		}

		Map<String, Integer> sellByBarcode = aggregateQuantitiesByBarcode(request.lines());
		Map<String, InventoryItem> lockedRows = lockAndValidateStock(sellByBarcode);

		Invoice invoice = new Invoice();
		invoice.setId(id);
		invoice.setCreatedAt(request.createdAt() != null ? request.createdAt() : Instant.now());
		invoice.setSubtotal(request.subtotal());
		invoice.setDiscountPercent(request.discountPercent());
		invoice.setDiscountAmount(request.discountAmount());
		invoice.setTotal(request.total());

		for (CreateInvoiceLineRequest lineReq : request.lines()) {
			InvoiceLine line = new InvoiceLine();
			line.setBarcode(lineReq.barcode().trim());
			line.setLabel(lineReq.label());
			line.setQty(lineReq.qty());
			line.setUnitPrice(lineReq.unitPrice());
			line.setLineTotal(lineReq.lineTotal());
			invoice.addLine(line);
		}

		Invoice saved = invoiceRepository.save(invoice);
		applyStockDeductions(sellByBarcode, lockedRows);
		return toResponse(saved);
	}

	@Transactional
	public void deleteById(String id) {
		Invoice inv =
				invoiceRepository
						.findByIdWithLines(id)
						.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Invoice not found"));
		Map<String, Integer> restoreByBarcode = new LinkedHashMap<>();
		for (InvoiceLine line : inv.getLines()) {
			String bc = trimBarcode(line.getBarcode());
			restoreByBarcode.merge(bc, line.getQty(), Integer::sum);
		}
		restoreStock(restoreByBarcode);
		invoiceRepository.delete(inv);
	}

	private Map<String, Integer> aggregateQuantitiesByBarcode(List<CreateInvoiceLineRequest> lines) {
		Map<String, Integer> out = new LinkedHashMap<>();
		for (CreateInvoiceLineRequest line : lines) {
			String bc = trimBarcode(line.barcode());
			out.merge(bc, line.qty(), Integer::sum);
		}
		return out;
	}

	/** Lock rows in stable order, validate stock, return managed rows for deduction after invoice save. */
	private Map<String, InventoryItem> lockAndValidateStock(Map<String, Integer> sellByBarcode) {
		List<String> sorted = new ArrayList<>(sellByBarcode.keySet());
		sorted.sort(String::compareTo);
		Map<String, InventoryItem> locked = new LinkedHashMap<>();
		for (String barcode : sorted) {
			int need = sellByBarcode.get(barcode);
			InventoryItem row =
					inventoryItemRepository
							.findByBarcodeForUpdate(barcode)
							.orElseThrow(
									() ->
											new ResponseStatusException(
													HttpStatus.BAD_REQUEST,
													"No inventory row for barcode: " + barcode));
			if (row.getQuantity() < need) {
				throw new ResponseStatusException(
						HttpStatus.BAD_REQUEST,
						"Insufficient stock for barcode "
								+ barcode
								+ " (have "
								+ row.getQuantity()
								+ ", need "
								+ need
								+ ")");
			}
			locked.put(barcode, row);
		}
		return locked;
	}

	private void applyStockDeductions(Map<String, Integer> sellByBarcode, Map<String, InventoryItem> lockedRows) {
		for (Map.Entry<String, Integer> e : sellByBarcode.entrySet()) {
			String barcode = e.getKey();
			int need = e.getValue();
			InventoryItem row = lockedRows.get(barcode);
			if (row == null) {
				throw new ResponseStatusException(
						HttpStatus.INTERNAL_SERVER_ERROR, "Internal stock mapping error for: " + barcode);
			}
			row.setQuantity(row.getQuantity() - need);
			inventoryItemRepository.save(row);
		}
	}

	private void restoreStock(Map<String, Integer> restoreByBarcode) {
		if (restoreByBarcode.isEmpty()) {
			return;
		}
		List<String> sorted = new ArrayList<>(restoreByBarcode.keySet());
		sorted.sort(String::compareTo);
		for (String barcode : sorted) {
			int add = restoreByBarcode.get(barcode);
			Optional<InventoryItem> opt = inventoryItemRepository.findByBarcodeForUpdate(barcode);
			if (opt.isPresent()) {
				InventoryItem row = opt.get();
				row.setQuantity(row.getQuantity() + add);
				inventoryItemRepository.save(row);
			}
		}
	}

	private static String trimBarcode(String barcode) {
		if (barcode == null) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Line barcode is required");
		}
		return barcode.trim();
	}

	private InvoiceResponse toResponse(Invoice invoice) {
		List<InvoiceLineDto> lineDtos =
				invoice.getLines().stream()
						.map(
								l ->
										new InvoiceLineDto(
												l.getBarcode(),
												l.getLabel(),
												l.getQty(),
												l.getUnitPrice(),
												l.getLineTotal()))
						.toList();
		return new InvoiceResponse(
				invoice.getId(),
				invoice.getCreatedAt(),
				lineDtos,
				invoice.getSubtotal(),
				invoice.getDiscountPercent(),
				invoice.getDiscountAmount(),
				invoice.getTotal());
	}
}
