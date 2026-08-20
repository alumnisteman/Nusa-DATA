FROM node:18-slim

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY apps/api/package*.json ./
COPY tsconfig.json ./
COPY prisma ./prisma/

# Install ALL dependencies (including devDeps like prisma CLI) so prisma generate works
RUN npm install

COPY apps/api/ .

# Generate Prisma client (requires prisma CLI from devDependencies)
RUN npx prisma generate

# Remove devDependencies to keep image lean for production
RUN npm prune --production

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/health', (r) =>{process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "index.js"]
