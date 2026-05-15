package com.Billing.application;

import com.Billing.application.config.RenderDatabaseEnvironmentPostProcessor;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class DemoApplication {

	public static void main(String[] args) {
		SpringApplication application = new SpringApplication(DemoApplication.class);
		application.addEnvironmentPostProcessors(new RenderDatabaseEnvironmentPostProcessor());
		application.run(args);
	}

}
