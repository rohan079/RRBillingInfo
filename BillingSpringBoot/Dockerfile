# syntax=docker/dockerfile:1
#
# Render runtime env (Dashboard → Environment):
#   PORT                         (set automatically by Render)
#   DATABASE_URL                 (from linked Postgres — auto-converted to JDBC)
#   OR SPRING_DATASOURCE_URL / SPRING_DATASOURCE_USERNAME / SPRING_DATASOURCE_PASSWORD
#   APP_CORS_ALLOWED_ORIGINS     (your Angular URL, comma-separated if multiple)
#
# Azure DevOps BillingVarGroup uses the same SPRING_DATASOURCE_* names.
# Local compose: docker/billing-var-group.env

# --- Build fat JAR and split into Spring Boot layers ---
FROM maven:3.9.9-eclipse-temurin-17-alpine AS build
WORKDIR /build

COPY pom.xml .
RUN mvn -B -DskipTests dependency:go-offline

COPY src src
RUN mvn -B -DskipTests package \
    && cp target/demo-0.0.1-SNAPSHOT.jar application.jar \
    && java -Djarmode=tools -jar application.jar extract --layers --destination target/extracted

# --- Runtime: merge layers, then launch with -jar ---
FROM eclipse-temurin:17-jre-alpine AS runtime
WORKDIR /app

LABEL org.opencontainers.image.title="billing-api" \
      com.billing.azure.var-group="BillingVarGroup"

RUN addgroup -S spring && adduser -S spring -G spring

COPY --from=build /build/target/extracted/dependencies/ ./
COPY --from=build /build/target/extracted/spring-boot-loader/ ./
COPY --from=build /build/target/extracted/snapshot-dependencies/ ./
COPY --from=build /build/target/extracted/application/ ./

RUN chown -R spring:spring /app
USER spring:spring

ENV JAVA_TOOL_OPTIONS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0"
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "application.jar"]
