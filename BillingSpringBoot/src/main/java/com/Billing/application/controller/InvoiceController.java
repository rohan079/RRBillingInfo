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

@RestController
@RequestMapping("/api/invoices")
public class InvoiceController {

	private final InvoiceService invoiceService;

	public InvoiceController(InvoiceService invoiceService) {
		this.invoiceService = invoiceService;
	}

	@GetMapping
	public List<InvoiceResponse> list() {
		return invoiceService.listAll();
	}

	@GetMapping("/{id}")
	public InvoiceResponse get(@PathVariable String id) {
		return invoiceService.getById(id);
	}

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	public InvoiceResponse create(@Valid @RequestBody CreateInvoiceRequest body) {
		return invoiceService.create(body);
	}

	@DeleteMapping("/{id}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void delete(@PathVariable String id) {
		invoiceService.deleteById(id);
	}
}
