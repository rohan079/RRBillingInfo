package com.Billing.application.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigDecimal;

/**
 * Stock line: one row per barcode. {@code actualPrice} is cost/base; {@code marginPrice} is the
 * selling price (price after margin), distinct from actual.
 */
@Entity
@Table(name = "inventory_items")
public class InventoryItem {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(nullable = false, unique = true, length = 256)
	private String barcode;

	@Column(nullable = false)
	private int quantity;

	@Column(nullable = false, precision = 19, scale = 2)
	private BigDecimal actualPrice;

	@Column(nullable = false, precision = 19, scale = 2)
	private BigDecimal marginPrice;

	public Long getId() {
		return id;
	}

	public void setId(Long id) {
		this.id = id;
	}

	public String getBarcode() {
		return barcode;
	}

	public void setBarcode(String barcode) {
		this.barcode = barcode;
	}

	public int getQuantity() {
		return quantity;
	}

	public void setQuantity(int quantity) {
		this.quantity = quantity;
	}

	public BigDecimal getActualPrice() {
		return actualPrice;
	}

	public void setActualPrice(BigDecimal actualPrice) {
		this.actualPrice = actualPrice;
	}

	public BigDecimal getMarginPrice() {
		return marginPrice;
	}

	public void setMarginPrice(BigDecimal marginPrice) {
		this.marginPrice = marginPrice;
	}
}
