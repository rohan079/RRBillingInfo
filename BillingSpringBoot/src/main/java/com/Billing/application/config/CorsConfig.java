package com.Billing.application.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class CorsConfig implements WebMvcConfigurer {

	/** Comma-separated list, e.g. http://localhost:4200,https://your-app.onrender.com */
	@Value("${app.cors.allowed-origins:http://localhost:4200}")
	private String allowedOrigins;

	@Override
	public void addCorsMappings(CorsRegistry registry) {
		String[] origins = allowedOrigins.split(",");
		for (int i = 0; i < origins.length; i++) {
			origins[i] = origins[i].trim();
		}

		registry
				.addMapping("/api/**")
				.allowedOrigins(origins)
				.allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
				.allowedHeaders("*");
	}
}
