.PHONY: run build test clean deps tidy db-start db-stop run-with-db db-shell db-audit swagger build-mcp run-mcp run-mcp-with-db run-mcp-sse run-mcp-sse-with-db docker-build-mcp docker-run-mcp

# Run the server
run:
	go run cmd/server/main.go

# Build the binary
build:
	go build -o bin/server cmd/server/main.go

# Run tests
test:
	go test ./...

# Clean build artifacts
clean:
	rm -rf bin/

# Download dependencies
deps:
	go mod download

# Tidy dependencies
tidy:
	go mod tidy

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
	DATABASE_URL="postgres://postgres:postgres@localhost:5432/anklyze?sslmode=disable" go run cmd/server/main.go

# Connect to local database
db-shell:
	docker exec -it anklyze-pg psql -U postgres -d anklyze

# Show audit entries
db-audit:
	docker exec anklyze-pg psql -U postgres -d anklyze -c "SELECT id, language, danis_weber_type, created_at FROM audit_entries ORDER BY created_at DESC LIMIT 10;"

# Generate Swagger documentation (requires: go install github.com/swaggo/swag/cmd/swag@latest)
swagger:
	go run github.com/swaggo/swag/cmd/swag@latest init -g cmd/server/main.go -o docs

# Build MCP server binary
build-mcp:
	go build -o bin/mcpserver cmd/mcpserver/main.go

# Run MCP server (for testing)
run-mcp:
	go run cmd/mcpserver/main.go

# Run MCP server with local database
run-mcp-with-db:
	DATABASE_URL="postgres://postgres:postgres@localhost:5432/anklyze?sslmode=disable" go run cmd/mcpserver/main.go

# Run MCP server with SSE transport (for HTTP deployment testing)
run-mcp-sse:
	MCP_TRANSPORT=sse go run cmd/mcpserver/main.go

# Run MCP server with SSE transport and local database
run-mcp-sse-with-db:
	MCP_TRANSPORT=sse DATABASE_URL="postgres://postgres:postgres@localhost:5432/anklyze?sslmode=disable" go run cmd/mcpserver/main.go

# Build MCP server Docker image
docker-build-mcp:
	docker build -f Dockerfile.mcp -t anklyze-mcp .

# Run MCP server Docker container
docker-run-mcp:
	docker run -p 8080:8080 anklyze-mcp
