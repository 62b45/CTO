# Multi-stage build for frontend and backend

# Stage 1: Build shared packages and backend
FROM node:18-alpine AS backend-builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@8.6.0

# Copy package files
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages ./packages
COPY apps/backend ./apps/backend

# Install all dependencies (including devDependencies)
RUN pnpm install --frozen-lockfile

# Build backend
RUN pnpm --filter backend build

# Generate Prisma client
RUN pnpm --filter backend db:generate

# Create a stripped node_modules for production (only production dependencies)
RUN pnpm install --frozen-lockfile --prod --no-optional


# Stage 2: Build frontend
FROM node:18-alpine AS frontend-builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@8.6.0

# Accept build argument for API URL
ARG VITE_API_URL=http://localhost:3001

# Copy package files
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages ./packages
COPY apps/frontend ./apps/frontend

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build frontend with API URL
RUN VITE_API_URL=$VITE_API_URL pnpm --filter frontend build


# Stage 3: Production backend runtime
FROM node:18-alpine AS backend-runtime

WORKDIR /app

# Install pnpm and dumb-init
RUN npm install -g pnpm@8.6.0 && \
    apk add --no-cache dumb-init

# Create data directory for SQLite persistence
RUN mkdir -p /app/data

# Copy all package files
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages ./packages
COPY apps/backend ./apps/backend

# Install dependencies (need full node_modules for prisma/seed tools)
RUN pnpm install --frozen-lockfile

# Copy built backend and Prisma client from builder
COPY --from=backend-builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=backend-builder /app/apps/backend/prisma ./apps/backend/prisma

# Expose backend port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3001/health || exit 1

# Create entrypoint script to initialize database and start server
RUN cat > /entrypoint.sh << 'EOF'
#!/bin/sh
set -e

echo "Initializing database..."
if [ ! -f /app/data/dev.db ]; then
  echo "Running database migrations and seed..."
  pnpm --filter backend db:push --skip-generate
  pnpm --filter backend db:seed
  echo "✓ Database initialized"
else
  echo "Database already exists, skipping initialization"
fi

echo "Starting backend service..."
exec node apps/backend/dist/index.js
EOF

chmod +x /entrypoint.sh

# Start backend using entrypoint script
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["/entrypoint.sh"]


# Stage 4: Production frontend runtime (nginx)
FROM nginx:alpine AS frontend-runtime

# Copy nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Copy built frontend from builder
COPY --from=frontend-builder /app/apps/frontend/dist /usr/share/nginx/html

# Expose frontend port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/health || exit 1
