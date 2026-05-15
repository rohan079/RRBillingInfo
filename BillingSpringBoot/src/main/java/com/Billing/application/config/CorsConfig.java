package com.Billing.application.config;

import java.util.Arrays;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.util.StringUtils;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class CorsConfig implements WebMvcConfigurer {

	@Value("${app.cors.allowed-origins:http://localhost:4200}")
	private String allowedOrigins;

	/** Wildcard host patterns, e.g. https://*.vercel.app for Vercel previews + production. */
	@Value("${app.cors.allowed-origin-patterns:https://*.vercel.app}")
	private String allowedOriginPatterns;

	@Override
	public void addCorsMappings(CorsRegistry registry) {
		var mapping = registry
				.addMapping("/api/**")
				.allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
				.allowedHeaders("*")
				.maxAge(3600);

		String[] origins = splitCsv(allowedOrigins);
		if (origins.length > 0) {
			mapping.allowedOrigins(origins);
		}

		String[] patterns = splitCsv(allowedOriginPatterns);
		if (patterns.length > 0) {
			mapping.allowedOriginPatterns(patterns);
		}
	}

	private static String[] splitCsv(String value) {
		if (!StringUtils.hasText(value)) {
			return new String[0];
		}
		return Arrays.stream(value.split(","))
				.map(String::trim)
				.filter(StringUtils::hasText)
				.toArray(String[]::new);
	}
}
