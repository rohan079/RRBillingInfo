package com.Billing.application.entity;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Entity
@Table(name = "bills")
public class Invoice {

	@Id
	@Column(length = 128, nullable = false)
	private String id;

	@Column(nullable = false)
	private Instant createdAt;

	@Column(nullable = false, precision = 19, scale = 2)
	private BigDecimal subtotal;

	@Column(nullable = false, precision = 5, scale = 2)
	private BigDecimal discountPercent;

	@Column(nullable = false, precision = 19, scale = 2)
	private BigDecimal discountAmount;

	@Column(nullable = false, precision = 19, scale = 2)
	private BigDecimal total;

	@OneToMany(mappedBy = "invoice", cascade = CascadeType.ALL, orphanRemoval = true)
	private List<InvoiceLine> lines = new ArrayList<>();

	public String getId() {
		return id;
	}

	public void setId(String id) {
		this.id = id;
	}

	public Instant getCreatedAt() {
		return createdAt;
	}

	public void setCreatedAt(Instant createdAt) {
		this.createdAt = createdAt;
	}

	public BigDecimal getSubtotal() {
		return subtotal;
	}

	public void setSubtotal(BigDecimal subtotal) {
		this.subtotal = subtotal;
	}

	public BigDecimal getDiscountPercent() {
		return discountPercent;
	}

	public void setDiscountPercent(BigDecimal discountPercent) {
		this.discountPercent = discountPercent;
	}

	public BigDecimal getDiscountAmount() {
		return discountAmount;
	}

	public void setDiscountAmount(BigDecimal discountAmount) {
		this.discountAmount = discountAmount;
	}

	public BigDecimal getTotal() {
		return total;
	}

	public void setTotal(BigDecimal total) {
		this.total = total;
	}

	public List<InvoiceLine> getLines() {
		return Collections.unmodifiableList(lines);
	}

	public void clearLines() {
		for (InvoiceLine line : new ArrayList<>(lines)) {
			line.setInvoice(null);
		}
		lines.clear();
	}

	public void addLine(InvoiceLine line) {
		line.setInvoice(this);
		lines.add(line);
	}
}
