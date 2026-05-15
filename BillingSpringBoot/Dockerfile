# syntax=docker/dockerfile:1

# --- Build fat JAR and split into Spring Boot layers ---
FROM maven:3.9.9-eclipse-temurin-17-alpine AS build
WORKDIR /build

COPY pom.xml .
RUN mvn -B -DskipTests dependency:go-offline

COPY src src
ARG JAR_FILE=target/demo-0.0.1-SNAPSHOT.jar
RUN mvn -B -DskipTests package \
    && java -Djarmode=tools -jar ${JAR_FILE} extract --layers --destination target/extracted

# --- Runtime: JRE only + layered classpath (smaller than shipping the full fat JAR) ---
FROM eclipse-temurin:17-jre-alpine AS runtime
WORKDIR /app

RUN addgroup -S spring && adduser -S spring -G spring
USER spring:spring

COPY --from=build --chown=spring:spring /build/target/extracted/dependencies/ ./
COPY --from=build --chown=spring:spring /build/target/extracted/spring-boot-loader/ ./
COPY --from=build --chown=spring:spring /build/target/extracted/snapshot-dependencies/ ./
COPY --from=build --chown=spring:spring /build/target/extracted/application/ ./

ENV JAVA_TOOL_OPTIONS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0"
EXPOSE 8080
ENTRYPOINT ["java", "org.springframework.boot.loader.launch.JarLauncher"]
