# syntax=docker/dockerfile:1
FROM golang:1.23-alpine AS builder

# Install git and ca-certificates for Go modules
RUN apk add --no-cache git ca-certificates

WORKDIR /app

# Copy go mod files first for better layer caching
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build with optimizations and error handling
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o processor ./cmd/processor

FROM alpine:3.18

# Add ca-certificates for HTTPS requests and create non-root user
RUN apk --no-cache add ca-certificates && \
    addgroup -S appgroup && \
    adduser -S appuser -G appgroup

WORKDIR /app

# Copy binary and change ownership
COPY --from=builder --chown=appuser:appgroup /app/processor .

# Switch to non-root user
USER appuser

# Expose the gRPC port
EXPOSE 50051

# Health check by checking if process is running
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD pgrep processor || exit 1

ENTRYPOINT ["/app/processor"] 