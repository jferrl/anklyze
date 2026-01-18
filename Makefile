.PHONY: all run run-backend run-frontend build build-backend build-frontend clean install

# Default target - run both backend and frontend
all: run

# Run both backend and frontend concurrently
run:
	@echo "Starting backend and frontend..."
	@make -j2 run-backend run-frontend

# Run backend only (with hot reload using air)
run-backend:
	@echo "Starting backend on http://localhost:8080 (hot reload enabled)"
	@cd backend && air

# Run frontend only
run-frontend:
	@echo "Starting frontend on http://localhost:5173"
	@cd frontend && npm run dev

# Build both
build: build-backend build-frontend

# Build backend
build-backend:
	@echo "Building backend..."
	@cd backend && go build -o bin/server cmd/server/main.go

# Build frontend
build-frontend:
	@echo "Building frontend..."
	@cd frontend && npm run build

# Install dependencies
install:
	@echo "Installing backend dependencies..."
	@cd backend && go mod download
	@echo "Installing frontend dependencies..."
	@cd frontend && npm install

# Clean build artifacts
clean:
	@echo "Cleaning..."
	@rm -rf backend/bin
	@rm -rf frontend/dist

# Run tests
test: test-backend test-frontend

test-backend:
	@echo "Running backend tests..."
	@cd backend && go test ./...

test-frontend:
	@echo "Running frontend build check..."
	@cd frontend && npm run build
