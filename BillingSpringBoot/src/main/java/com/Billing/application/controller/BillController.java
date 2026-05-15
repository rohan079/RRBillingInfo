package com.Billing.application.controller;

import com.Billing.application.dto.CreateInvoiceRequest;
import com.Billing.application.dto.InvoiceResponse;
import com.Billing.application.service.InvoiceService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Finished bills: {@code POST} persists one row in {@code bills} plus lines in
 * {@code bill_lines}, and decrements {@code inventory_items} (same rules as
 * {@link InvoiceController}). Use this API from the POS when the user taps Finish.
 */
@RestController
@RequestMapping("/api/bills")
public class BillController {

	private final InvoiceService invoiceService;

	public BillController(InvoiceService invoiceService) {
		this.invoiceService = invoiceService;
	}

	/** Finish bill — store totals and lines, reduce stock by barcode. */
	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	public InvoiceResponse finishBill(@Valid @RequestBody CreateInvoiceRequest body) {
		return invoiceService.create(body);
	}

	@GetMapping
	public List<InvoiceResponse> listFinishedBills() {
		return invoiceService.listAll();
	}

	@GetMapping("/{id}")
	public InvoiceResponse getBill(@PathVariable String id) {
		return invoiceService.getById(id);
	}

	@DeleteMapping("/{id}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void deleteBill(@PathVariable String id) {
		invoiceService.deleteById(id);
	}
}
