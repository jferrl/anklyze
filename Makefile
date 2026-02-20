.PHONY: all run run-backend run-frontend build build-backend build-frontend clean install \
	e2e e2e-install e2e-ui e2e-headed e2e-debug e2e-report e2e-codegen e2e-chromium e2e-firefox e2e-webkit \
	e2e-classification deps tidy db-start db-stop run-with-db db-shell db-audit swagger

# Default target - run both backend and frontend
all: run

# Run both backend and frontend concurrently
run:
	@echo "Starting backend and frontend..."
	@make -j2 run-backend run-frontend

# Run backend only (with hot reload using air)
run-backend:
	@echo "Starting backend on http://localhost:8080 (hot reload enabled)"
	@air

# Run frontend only
run-frontend:
	@echo "Starting frontend on http://localhost:5173"
	@cd frontend && npm run dev

# Build both
build: build-backend build-frontend

# Build backend
build-backend:
	@echo "Building backend..."
	@go build -o bin/server ./cmd/anklyze-apiserver

# Build frontend
build-frontend:
	@echo "Building frontend..."
	@cd frontend && npm run build

# Install dependencies
install:
	@echo "Installing backend dependencies..."
	@go mod download
	@echo "Installing frontend dependencies..."
	@cd frontend && npm install

# Clean build artifacts
clean:
	@echo "Cleaning..."
	@rm -rf bin/
	@rm -rf frontend/dist

# Run tests
test: test-backend test-frontend

test-backend:
	@echo "Running backend tests..."
	@go test ./...

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

# Run classification E2E tests only (tests based on flowchart decision tree)
e2e-classification:
	@echo "Running classification E2E tests..."
	@cd e2e && npx playwright test tests/classification/ --project=chromium

# === Backend Utilities ===

# Download dependencies
deps:
	@go mod download

# Tidy dependencies
tidy:
	@go mod tidy

# Start local PostgreSQL with Docker
db-start:
	docker run -d --name anklyze-pg \
		-e POSTGRES_PASSWORD=postgres \
		-e POSTGRES_DB=anklyze \
		-p 5432:5432 \
		postgres:16

# Stop and remove local PostgreSQL
db-stop:
	docker stop anklyze-pg && docker rm anklyze-pg

# Run with local database
run-with-db:
	DATABASE_URL="postgres://postgres:postgres@localhost:5432/anklyze?sslmode=disable" go run ./cmd/anklyze-apiserver

# Connect to local database
db-shell:
	docker exec -it anklyze-pg psql -U postgres -d anklyze

# Show audit entries
db-audit:
	docker exec anklyze-pg psql -U postgres -d anklyze -c "SELECT id, language, danis_weber_type, created_at FROM audit_entries ORDER BY created_at DESC LIMIT 10;"

# Generate Swagger documentation (requires: go install github.com/swaggo/swag/cmd/swag@latest)
swagger:
	go run github.com/swaggo/swag/cmd/swag@latest init -g cmd/anklyze-apiserver/main.go -o docs
