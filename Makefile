.PHONY: all run run-backend run-frontend build build-backend build-frontend clean install \
	e2e e2e-install e2e-ui e2e-headed e2e-debug e2e-report e2e-codegen e2e-chromium e2e-firefox e2e-webkit

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

# === E2E Testing Targets ===

# Install E2E dependencies
e2e-install:
	@echo "Installing E2E dependencies..."
	@cd e2e && npm install
	@cd e2e && npx playwright install

# Run E2E tests (requires services running)
e2e:
	@echo "Running E2E tests..."
	@cd e2e && npm test

# Run E2E tests with Playwright UI
e2e-ui:
	@echo "Opening Playwright UI..."
	@cd e2e && npm run test:ui

# Run E2E tests in headed mode (for debugging)
e2e-headed:
	@echo "Running E2E tests in headed mode..."
	@cd e2e && npm run test:headed

# Run E2E tests in debug mode
e2e-debug:
	@echo "Running E2E tests in debug mode..."
	@cd e2e && npm run test:debug

# Run E2E tests for specific browsers
e2e-chromium:
	@cd e2e && npm run test:chromium

e2e-firefox:
	@cd e2e && npm run test:firefox

e2e-webkit:
	@cd e2e && npm run test:webkit

# Show E2E test report
e2e-report:
	@cd e2e && npm run report

# Generate E2E test code with codegen
e2e-codegen:
	@echo "Starting Playwright codegen..."
	@cd e2e && npm run codegen
