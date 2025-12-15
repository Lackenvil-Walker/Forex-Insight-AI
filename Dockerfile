# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Install only production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist

# Copy entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Expose port
EXPOSE 5000

# Set default environment variables
ENV NODE_ENV=production
ENV PORT=5000

# Required environment variables (must be provided at runtime)
# DATABASE_URL - PostgreSQL connection string
# SESSION_SECRET - Random secret for session encryption (min 32 chars)
# GROQ_API_KEY - Groq API key for AI analysis (or CUSTOM_OPENAI_API_KEY)

# Optional environment variables
# RESEND_API_KEY - For email functionality
# PAYSTACK_SECRET_KEY - For payment processing
# ADMIN_EMAILS - Comma-separated list of admin emails

# Use entrypoint to validate environment variables
ENTRYPOINT ["docker-entrypoint.sh"]

# Start the application
CMD ["node", "dist/index.cjs"]
