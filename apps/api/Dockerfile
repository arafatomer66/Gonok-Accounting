# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY libs/shared-types/package.json ./libs/shared-types/
COPY apps/api/package.json ./apps/api/
RUN npm ci --legacy-peer-deps

COPY . .
RUN npx nx build @org/api

# Stage 2: Production dependencies only
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
COPY libs/shared-types/package.json ./libs/shared-types/
COPY apps/api/package.json ./apps/api/
RUN npm ci --legacy-peer-deps --omit=dev

# Stage 3: Run
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/package.json ./
EXPOSE 3333
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q --spider http://localhost:3333/api/health || exit 1
CMD ["node", "dist/main.js"]
