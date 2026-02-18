# Stage 1: Build the application
FROM node:20-alpine AS builder

WORKDIR /build

# Copy package files for dependency installation
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies (including dev dependencies for building)
RUN npm ci

# Copy source code
COPY src/ ./src/
COPY bin/ ./bin/

# Build the TypeScript project
RUN npm run build

# Stage 2: Production runtime
FROM node:20-alpine

# Add metadata
LABEL org.opencontainers.image.title="MailGoat"
LABEL org.opencontainers.image.description="Email for AI agents, built by AI agents. CLI-first email provider."
LABEL org.opencontainers.image.url="https://mailgoat.ai"
LABEL org.opencontainers.image.source="https://github.com/mailgoatai/mailgoat"
LABEL org.opencontainers.image.licenses="MIT"

WORKDIR /app

# Copy package files for production dependencies
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev && \
    npm cache clean --force

# Copy built artifacts from builder stage
COPY --from=builder /build/dist ./dist
COPY bin/ ./bin/

# Make the CLI executable globally accessible
RUN ln -s /app/bin/mailgoat.js /usr/local/bin/mailgoat && \
    chmod +x /app/bin/mailgoat.js

# Create a non-root user for security
RUN addgroup -g 1000 mailgoat && \
    adduser -D -u 1000 -G mailgoat mailgoat && \
    chown -R mailgoat:mailgoat /app

USER mailgoat

# Default environment variables (can be overridden)
ENV MAILGOAT_SERVER=""
ENV MAILGOAT_API_KEY=""
ENV MAILGOAT_FROM_ADDRESS=""
ENV MAILGOAT_FROM_NAME=""

# Set the entrypoint to the CLI
ENTRYPOINT ["mailgoat"]

# Default command shows help
CMD ["--help"]
