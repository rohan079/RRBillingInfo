package com.Billing.application.controller;

import com.Billing.application.dto.NavShellDto;
import com.Billing.application.service.NavService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/nav")
public class NavController {

	private final NavService navService;

	public NavController(NavService navService) {
		this.navService = navService;
	}

	@GetMapping("/shell")
	public NavShellDto shell() {
		return navService.getShell();
	}
}
