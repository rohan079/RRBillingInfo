package com.Billing.application.config;

import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;

/**
 * When deployed on Render with a linked Postgres database, {@code DATABASE_URL} is set
 * automatically. Map it to Spring datasource properties if {@code SPRING_DATASOURCE_URL} is not set.
 */
public class RenderDatabaseEnvironmentPostProcessor implements EnvironmentPostProcessor {

	private static final String RENDER_SOURCE = "renderDatabase";

	@Override
	public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
		if (hasText(environment.getProperty("SPRING_DATASOURCE_URL"))) {
			return;
		}

		String databaseUrl = environment.getProperty("DATABASE_URL");
		if (!hasText(databaseUrl)) {
			return;
		}

		Map<String, Object> properties = new HashMap<>();
		applyPostgresUrl(databaseUrl, properties);
		environment.getPropertySources().addFirst(new MapPropertySource(RENDER_SOURCE, properties));
	}

	private static void applyPostgresUrl(String databaseUrl, Map<String, Object> properties) {
		String normalized = databaseUrl.startsWith("postgres://")
				? "postgresql://" + databaseUrl.substring("postgres://".length())
				: databaseUrl;

		if (!normalized.startsWith("postgresql://")) {
			return;
		}

		URI uri = URI.create(normalized);
		String userInfo = uri.getUserInfo();
		String host = uri.getHost();
		int port = uri.getPort() > 0 ? uri.getPort() : 5432;
		String database = uri.getPath() != null && uri.getPath().length() > 1
				? uri.getPath().substring(1)
				: "postgres";

		String jdbcUrl = "jdbc:postgresql://" + host + ":" + port + "/" + database + "?sslmode=require";
		properties.put("spring.datasource.url", jdbcUrl);

		if (userInfo != null && !userInfo.isBlank()) {
			String[] parts = userInfo.split(":", 2);
			properties.put("spring.datasource.username", decode(parts[0]));
			if (parts.length > 1) {
				properties.put("spring.datasource.password", decode(parts[1]));
			}
		}
	}

	private static String decode(String value) {
		return URLDecoder.decode(value, StandardCharsets.UTF_8);
	}

	private static boolean hasText(String value) {
		return value != null && !value.isBlank();
	}
}
