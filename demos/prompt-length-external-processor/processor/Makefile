APP_NAME=processor
DOCKER_IMAGE=processor:latest

.PHONY: build test docker clean help

# Default target
all: test build

# Help target
help:
	@echo "Available targets:"
	@echo "  build          - Build the processor binary"
	@echo "  test           - Run unit tests"
	@echo "  docker         - Build Docker image"
	@echo "  clean          - Clean build artifacts"
	@echo "  help           - Show this help message"

# Build the processor binary
build:
	@echo "🔨 Building $(APP_NAME)..."
	go build -o $(APP_NAME) ./cmd/processor
	@echo "✅ Build completed: $(APP_NAME)"

# Run tests with coverage
test:
	@echo "🧪 Running tests..."
	go test -v -race -cover ./...
	@echo "✅ Tests completed"

# Build Docker image
docker:
	@echo "🐳 Building Docker image: $(DOCKER_IMAGE)"
	docker build -t $(DOCKER_IMAGE) .
	@echo "✅ Docker image built: $(DOCKER_IMAGE)"

# Clean build artifacts
clean:
	@echo "🧹 Cleaning build artifacts..."
	rm -f $(APP_NAME)
	@echo "✅ Clean completed" 