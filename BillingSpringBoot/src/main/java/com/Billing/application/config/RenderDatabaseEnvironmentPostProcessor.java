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
 * Maps Render Postgres {@code DATABASE_URL} (postgresql://…) to Spring JDBC settings.
 * Registered from {@link com.Billing.application.DemoApplication#main} and via META-INF.
 */
public class RenderDatabaseEnvironmentPostProcessor implements EnvironmentPostProcessor {

	private static final String RENDER_SOURCE = "renderDatabase";

	@Override
	public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
		if (hasText(environment.getProperty("SPRING_DATASOURCE_URL"))) {
			return;
		}

		String databaseUrl = firstNonBlank(
				environment.getProperty("DATABASE_URL"),
				environment.getProperty("DATABASE_INTERNAL_URL"),
				environment.getProperty("POSTGRES_URL"));

		if (!hasText(databaseUrl)) {
			warnIfRenderWithoutDatabase(environment);
			return;
		}

		Map<String, Object> properties = new HashMap<>();
		if (!applyPostgresUrl(databaseUrl, properties)) {
			System.err.println("[renderDatabase] Could not parse DATABASE_URL; set SPRING_DATASOURCE_URL manually.");
			return;
		}

		environment.getPropertySources().addFirst(new MapPropertySource(RENDER_SOURCE, properties));
		System.out.println("[renderDatabase] Using JDBC URL host from DATABASE_URL (Render Postgres)");
	}

	private static void warnIfRenderWithoutDatabase(ConfigurableEnvironment environment) {
		if (!hasText(environment.getProperty("RENDER"))) {
			return;
		}
		System.err.println(
				"[renderDatabase] RENDER is set but DATABASE_URL is missing. "
						+ "In Render: Web Service → Environment → Link database, "
						+ "or set SPRING_DATASOURCE_URL / SPRING_DATASOURCE_USERNAME / SPRING_DATASOURCE_PASSWORD.");
	}

	private static boolean applyPostgresUrl(String databaseUrl, Map<String, Object> properties) {
		String normalized = databaseUrl.startsWith("postgres://")
				? "postgresql://" + databaseUrl.substring("postgres://".length())
				: databaseUrl;

		if (!normalized.startsWith("postgresql://")) {
			return false;
		}

		// java.net.URI does not parse host for the postgresql scheme; use http for parsing.
		URI uri = URI.create(normalized.replaceFirst("^postgresql://", "http://"));
		String userInfo = uri.getUserInfo();
		String host = uri.getHost();
		if (!hasText(host)) {
			return false;
		}

		int port = uri.getPort() > 0 ? uri.getPort() : 5432;
		String database = uri.getPath() != null && uri.getPath().length() > 1
				? uri.getPath().substring(1)
				: "postgres";

		String jdbcUrl = "jdbc:postgresql://" + host + ":" + port + "/" + database + "?sslmode=require";
		properties.put("spring.datasource.url", jdbcUrl);
		properties.put("SPRING_DATASOURCE_URL", jdbcUrl);

		if (userInfo != null && !userInfo.isBlank()) {
			String[] parts = userInfo.split(":", 2);
			String username = decode(parts[0]);
			properties.put("spring.datasource.username", username);
			properties.put("SPRING_DATASOURCE_USERNAME", username);
			if (parts.length > 1) {
				String password = decode(parts[1]);
				properties.put("spring.datasource.password", password);
				properties.put("SPRING_DATASOURCE_PASSWORD", password);
			}
		}

		properties.put("spring.jpa.database-platform", "org.hibernate.dialect.PostgreSQLDialect");
		return true;
	}

	private static String firstNonBlank(String... values) {
		for (String value : values) {
			if (hasText(value)) {
				return value;
			}
		}
		return null;
	}

	private static String decode(String value) {
		return URLDecoder.decode(value, StandardCharsets.UTF_8);
	}

	private static boolean hasText(String value) {
		return value != null && !value.isBlank();
	}
}
