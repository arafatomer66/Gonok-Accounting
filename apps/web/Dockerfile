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
RUN npx nx build shared-types && npx nx build web

# Stage 2: Serve with nginx
FROM nginx:alpine
COPY --from=builder /app/dist/apps/web/browser /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
