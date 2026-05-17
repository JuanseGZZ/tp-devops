# syntax=docker/dockerfile:1

# --- build stage (could run bundler here later) ---
FROM node:20-alpine AS build
WORKDIR /app
COPY . .

# --- production stage: serve static files with nginx ---
FROM nginx:alpine AS production
COPY --from=build /app /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf.template
EXPOSE 80
# envsubst reemplaza solo ${BACKEND_URL} — las variables de nginx ($host, etc.) quedan intactas
CMD ["/bin/sh", "-c", "envsubst '${BACKEND_URL}' < /etc/nginx/nginx.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]
