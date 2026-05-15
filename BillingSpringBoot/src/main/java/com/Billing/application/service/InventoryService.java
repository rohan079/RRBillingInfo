package com.Billing.application.service;

import com.Billing.application.dto.BulkGenerateInventoryRequest;
import com.Billing.application.dto.BulkRemoveInventoryRequest;
import com.Billing.application.dto.BulkRemoveInventoryResponse;
import com.Billing.application.dto.CreateInventoryItemRequest;
import com.Billing.application.dto.InventoryItemResponse;
import com.Billing.application.dto.UpdateInventoryItemRequest;
import com.Billing.application.entity.InventoryItem;
import com.Billing.application.repository.InventoryItemRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;

@Service
public class InventoryService {

	private final InventoryItemRepository inventoryItemRepository;

	public InventoryService(InventoryItemRepository inventoryItemRepository) {
		this.inventoryItemRepository = inventoryItemRepository;
	}

	@Transactional(readOnly = true)
	public List<InventoryItemResponse> listAll() {
		return inventoryItemRepository.findAllByOrderByBarcodeAsc().stream().map(this::toResponse).toList();
	}

	@Transactional(readOnly = true)
	public InventoryItemResponse getById(long id) {
		return inventoryItemRepository
				.findById(id)
				.map(this::toResponse)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Inventory item not found"));
	}

	/** Product details keyed by barcode (one row per barcode). */
	@Transactional(readOnly = true)
	public InventoryItemResponse getByBarcode(String barcode) {
		String key = normalizeBarcode(barcode);
		return inventoryItemRepository
				.findByBarcode(key)
				.map(this::toResponse)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No inventory for barcode"));
	}

	@Transactional
	public InventoryItemResponse create(CreateInventoryItemRequest request) {
		String barcode = normalizeBarcode(request.barcode());
		if (inventoryItemRepository.existsByBarcode(barcode)) {
			throw new ResponseStatusException(HttpStatus.CONFLICT, "Barcode already exists");
		}
		InventoryItem row = new InventoryItem();
		row.setBarcode(barcode);
		row.setQuantity(request.quantity());
		row.setActualPrice(request.actualPrice());
		row.setMarginPrice(request.marginPrice());
		return toResponse(inventoryItemRepository.save(row));
	}

	/**
	 * Creates {@code count} rows with unique barcodes {@code PREFIX-batchMillis-index} (index
	 * zero-padded to 5 digits). Retries barcode if an extremely rare collision occurs.
	 */
	@Transactional
	public List<InventoryItemResponse> bulkGenerate(BulkGenerateInventoryRequest request) {
		String p =
				request.prefix() == null || request.prefix().isBlank()
						? "AUTO"
						: normalizeBarcode(request.prefix()).replaceAll("\\s+", "-");
		if (p.length() > 40) {
			p = p.substring(0, 40);
		}
		long batch = System.currentTimeMillis();
		List<InventoryItemResponse> created = new ArrayList<>();
		for (int i = 1; i <= request.count(); i++) {
			String barcode = buildAutoBarcode(p, batch, i);
			int guard = 0;
			while (inventoryItemRepository.existsByBarcode(barcode) && guard++ < 50) {
				batch++;
				barcode = buildAutoBarcode(p, batch, i);
			}
			if (inventoryItemRepository.existsByBarcode(barcode)) {
				throw new ResponseStatusException(
						HttpStatus.CONFLICT, "Could not allocate unique barcode after retries");
			}
			InventoryItem row = new InventoryItem();
			row.setBarcode(barcode);
			row.setQuantity(request.quantity());
			row.setActualPrice(request.actualPrice());
			row.setMarginPrice(request.marginPrice());
			created.add(toResponse(inventoryItemRepository.save(row)));
		}
		return created;
	}

	private static String buildAutoBarcode(String prefix, long batchMillis, int index) {
		return prefix + "-" + batchMillis + "-" + String.format("%05d", index);
	}

	/**
	 * Removes up to {@code count} rows:
	 * <ul>
	 *   <li>If {@code batchMillis} is set: only barcodes {@code PREFIX-BATCHMILLIS-#####}, highest
	 *       suffix first (removes the "last" numbers in that batch).
	 *   <li>If {@code batchMillis} is null: any barcode starting with {@code PREFIX-}, newest by
	 *       database id first (handy right after a bulk generate when you only enter a count).
	 * </ul>
	 */
	@Transactional
	public BulkRemoveInventoryResponse bulkRemove(BulkRemoveInventoryRequest request) {
		String p =
				request.prefix() == null || request.prefix().isBlank()
						? "AUTO"
						: normalizeBarcode(request.prefix()).replaceAll("\\s+", "-");
		if (p.length() > 40) {
			p = p.substring(0, 40);
		}
		Pageable page = PageRequest.of(0, request.count());
		List<InventoryItem> rows;
		if (request.batchMillis() != null) {
			String start = p + "-" + request.batchMillis() + "-";
			rows = inventoryItemRepository.findByBarcodeStartingWithOrderByBarcodeDesc(start, page);
		} else {
			String start = p + "-";
			rows = inventoryItemRepository.findByBarcodeStartingWithOrderByIdDesc(start, page);
		}
		if (rows.isEmpty()) {
			return new BulkRemoveInventoryResponse(0);
		}
		inventoryItemRepository.deleteAllInBatch(rows);
		return new BulkRemoveInventoryResponse(rows.size());
	}

	@Transactional
	public InventoryItemResponse updateByBarcode(String barcode, UpdateInventoryItemRequest request) {
		String key = normalizeBarcode(barcode);
		InventoryItem row =
				inventoryItemRepository
						.findByBarcode(key)
						.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No inventory for barcode"));
		row.setQuantity(request.quantity());
		row.setActualPrice(request.actualPrice());
		row.setMarginPrice(request.marginPrice());
		return toResponse(inventoryItemRepository.save(row));
	}

	@Transactional
	public void deleteById(long id) {
		if (!inventoryItemRepository.existsById(id)) {
			throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Inventory item not found");
		}
		inventoryItemRepository.deleteById(id);
	}

	@Transactional
	public void deleteByBarcode(String barcode) {
		String key = normalizeBarcode(barcode);
		if (!inventoryItemRepository.existsByBarcode(key)) {
			throw new ResponseStatusException(HttpStatus.NOT_FOUND, "No inventory for barcode");
		}
		inventoryItemRepository.deleteByBarcode(key);
	}

	private static String normalizeBarcode(String barcode) {
		if (barcode == null) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Barcode is required");
		}
		return barcode.trim();
	}

	private InventoryItemResponse toResponse(InventoryItem e) {
		return new InventoryItemResponse(
				e.getId(), e.getBarcode(), e.getQuantity(), e.getActualPrice(), e.getMarginPrice());
	}
}
