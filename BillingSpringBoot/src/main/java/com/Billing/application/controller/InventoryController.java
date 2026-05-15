package com.Billing.application.controller;

import com.Billing.application.dto.BulkGenerateInventoryRequest;
import com.Billing.application.dto.BulkRemoveInventoryRequest;
import com.Billing.application.dto.BulkRemoveInventoryResponse;
import com.Billing.application.dto.CreateInventoryItemRequest;
import com.Billing.application.dto.InventoryItemResponse;
import com.Billing.application.dto.UpdateInventoryItemRequest;
import com.Billing.application.service.InventoryService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/inventory")
public class InventoryController {

	private final InventoryService inventoryService;

	public InventoryController(InventoryService inventoryService) {
		this.inventoryService = inventoryService;
	}

	@GetMapping
	public List<InventoryItemResponse> list() {
		return inventoryService.listAll();
	}

	@GetMapping("/{id}")
	public InventoryItemResponse getById(@PathVariable long id) {
		return inventoryService.getById(id);
	}

	/** Full product row for a barcode (details live under this key). */
	@GetMapping("/by-barcode/{barcode}")
	public InventoryItemResponse getByBarcode(@PathVariable String barcode) {
		return inventoryService.getByBarcode(barcode);
	}

	@PostMapping("/bulk-generate")
	@ResponseStatus(HttpStatus.CREATED)
	public List<InventoryItemResponse> bulkGenerate(@Valid @RequestBody BulkGenerateInventoryRequest body) {
		return inventoryService.bulkGenerate(body);
	}

	@PostMapping("/bulk-remove")
	public BulkRemoveInventoryResponse bulkRemove(@Valid @RequestBody BulkRemoveInventoryRequest body) {
		return inventoryService.bulkRemove(body);
	}

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	public InventoryItemResponse create(@Valid @RequestBody CreateInventoryItemRequest body) {
		return inventoryService.create(body);
	}

	@PutMapping("/by-barcode/{barcode}")
	public InventoryItemResponse updateByBarcode(
			@PathVariable String barcode, @Valid @RequestBody UpdateInventoryItemRequest body) {
		return inventoryService.updateByBarcode(barcode, body);
	}

	@DeleteMapping("/{id}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void deleteById(@PathVariable long id) {
		inventoryService.deleteById(id);
	}

	@DeleteMapping("/by-barcode/{barcode}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void deleteByBarcode(@PathVariable String barcode) {
		inventoryService.deleteByBarcode(barcode);
	}
}
