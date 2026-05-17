# syntax=docker/dockerfile:1

# --- deps stage ---
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# --- build stage (for any transpilation later) ---
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY src ./src

# --- production stage ---
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/src ./src
COPY package.json ./
EXPOSE 3000
CMD ["node", "--require", "./src/tracing.js", "src/app.js"]
