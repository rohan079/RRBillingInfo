package com.Billing.application.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.HashMap;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.boot.SpringApplication;
import org.springframework.core.env.MapPropertySource;
import org.springframework.mock.env.MockEnvironment;

class RenderDatabaseEnvironmentPostProcessorTest {

	@Test
	void mapsRenderDatabaseUrlToJdbc() {
		MockEnvironment env = new MockEnvironment();
		env.setProperty("DATABASE_URL",
				"postgresql://rrbillingdb_user:secret@dpg-example-a.oregon-postgres.render.com/rrbillingdb");

		new RenderDatabaseEnvironmentPostProcessor().postProcessEnvironment(env, new SpringApplication());

		assertThat(env.getProperty("spring.datasource.url"))
				.isEqualTo("jdbc:postgresql://dpg-example-a.oregon-postgres.render.com:5432/rrbillingdb?sslmode=require");
		assertThat(env.getProperty("spring.datasource.username")).isEqualTo("rrbillingdb_user");
		assertThat(env.getProperty("spring.datasource.password")).isEqualTo("secret");
	}

	@Test
	void doesNotOverrideExplicitSpringDatasourceUrl() {
		MockEnvironment env = new MockEnvironment();
		env.setProperty("SPRING_DATASOURCE_URL", "jdbc:postgresql://custom:5432/db?sslmode=require");
		env.setProperty("DATABASE_URL", "postgresql://ignored:ignored@ignored/ignored");

		new RenderDatabaseEnvironmentPostProcessor().postProcessEnvironment(env, new SpringApplication());

		assertThat(env.getProperty("spring.datasource.url")).isNull();
	}
}
