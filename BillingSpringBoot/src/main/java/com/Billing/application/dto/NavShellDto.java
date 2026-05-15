package com.Billing.application.dto;

import java.util.List;

public record NavShellDto(String appName, List<NavLinkDto> links) {
}
