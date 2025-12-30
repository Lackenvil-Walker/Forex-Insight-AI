# Forex Edge Dockerfile
# Multi-stage build for production deployment

# ==========================================
# Stage 1: Build
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first (better layer caching)
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build the application (bundles server to dist/index.cjs, client to dist/public)
RUN npm run build

# Verify build output exists
RUN ls -la dist/ && test -f dist/index.cjs

# ==========================================
# Stage 2: Production
# ==========================================
FROM node:20-alpine AS production

WORKDIR /app

# Install PostgreSQL client for database initialization
RUN apk add --no-cache postgresql-client

# Install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy built files from builder stage
# dist/index.cjs = bundled server
# dist/public = built client assets
COPY --from=builder /app/dist ./dist

# Copy database init script for automatic table creation
COPY --from=builder /app/scripts/init-db.sql ./scripts/init-db.sql

# Copy entrypoint script for environment validation
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Expose application port
EXPOSE 5000

# Set environment
ENV NODE_ENV=production
ENV PORT=5000

# Required environment variables (must be provided at runtime):
# - DATABASE_URL: PostgreSQL connection string
# - SESSION_SECRET: Random secret for sessions (min 32 chars)
# - At least one AI key: GROQ_API_KEY, CUSTOM_OPENAI_API_KEY, or GEMINI_API_KEY

# Optional environment variables:
# - RESEND_API_KEY: For email notifications
# - PAYSTACK_SECRET_KEY: For payment processing (ZAR)
# - ADMIN_EMAILS: Comma-separated admin email addresses

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/health || exit 1

# Validate environment then start
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "dist/index.cjs"]
