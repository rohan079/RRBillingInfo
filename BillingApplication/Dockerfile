# syntax=docker/dockerfile:1
#
# Azure DevOps variable group: BillingVarGroup (web service — no secrets in image)
# API is reached via nginx proxy /api -> api:8080 (see nginx.conf).
# For split deployments, rebuild with build-arg API_PROXY_HOST if needed.

# --- Build Angular (production) ---
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

COPY . .
RUN npm run build -- --configuration=production

# --- Serve static assets (minimal runtime) ---
FROM nginx:1.27-alpine

LABEL org.opencontainers.image.title="billing-web" \
      com.billing.azure.var-group="BillingVarGroup"

RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/BillingApplication/browser /usr/share/nginx/html

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
