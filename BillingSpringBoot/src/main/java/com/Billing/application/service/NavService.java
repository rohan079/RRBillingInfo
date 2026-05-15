package com.Billing.application.service;

import com.Billing.application.dto.NavLinkDto;
import com.Billing.application.dto.NavShellDto;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class NavService {

	private final String displayName;

	public NavService(@Value("${app.display-name}") String displayName) {
		this.displayName = displayName;
	}

	public NavShellDto getShell() {
		return new NavShellDto(
				displayName,
				List.of(
						new NavLinkDto("/home", "Home", true),
						new NavLinkDto("/dashboard", "Dashboard", true),
						new NavLinkDto("/invoices", "Invoices", true),
						new NavLinkDto("/barcode-print", "Barcode print", true),
						new NavLinkDto("/products", "Products", true)));
	}
}
