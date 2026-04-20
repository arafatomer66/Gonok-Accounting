# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

# Copy all package.json files for workspace resolution
COPY package*.json ./
COPY libs/shared-types/package.json ./libs/shared-types/
COPY apps/api/package.json ./apps/api/
RUN npm ci --legacy-peer-deps

# Copy source and build
COPY . .
RUN npx nx build @org/api

# Stage 2: Production
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
EXPOSE 3333
CMD ["node", "dist/main.js"]
