# Builder stage
FROM node:18-slim AS builder

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package manifests and prisma schema
COPY apps/api/package*.json ./
COPY prisma ./prisma/

# Install all dependencies (including dev for prisma CLI)
# chmod ensures prisma binary is executable
RUN npm install --unsafe-perm \
    && chmod -R 755 node_modules/.bin \
    && npx prisma generate

# Copy application source code
COPY apps/api/ .

# Prune dev dependencies for lean production image
RUN npm prune --production

# Final stage
FROM node:18-slim

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy built application from builder stage
COPY --from=builder /app .

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "index.js"]
