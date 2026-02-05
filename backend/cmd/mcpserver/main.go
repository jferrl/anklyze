// Package main provides the MCP server entry point for Anklyze.
// This server exposes ankle fracture classification functionality via the Model Context Protocol,
// enabling integration with LLMs like Claude and ChatGPT.
//
// Transport modes:
//   - stdio (default): For local Claude Desktop/Code integration
//   - sse: For HTTP deployment (e.g., Render, Railway)
//
// Environment variables:
//   - MCP_TRANSPORT: "stdio" or "sse" (default: "stdio")
//   - PORT: HTTP port for SSE mode (default: "8080")
//   - DATABASE_URL: PostgreSQL connection string (optional, enables analytics)
package main

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"os/signal"
	"syscall"

	"github.com/jferrl/anklyze/internal/config"
	"github.com/jferrl/anklyze/internal/database"
	"github.com/jferrl/anklyze/internal/domain"
	"github.com/jferrl/anklyze/internal/logger"
	anklyzemcp "github.com/jferrl/anklyze/internal/mcp"
	"github.com/jferrl/anklyze/internal/repository"
	"github.com/jferrl/anklyze/internal/repository/postgres"
	"github.com/mark3labs/mcp-go/server"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		slog.Error("invalid configuration", "error", err)
		os.Exit(1)
	}

	// Get transport mode from environment
	transport := os.Getenv("MCP_TRANSPORT")
	if transport == "" {
		transport = "stdio"
	}

	// Initialize logger (stderr to avoid interfering with MCP stdio)
	logger.Setup(logger.Config{
		Level:  cfg.LogLevel,
		Format: cfg.LogFormat,
	})

	// Initialize analytics repository (optional)
	var analyticsRepo anklyzemcp.AnalyticsRepository
	if cfg.HasDatabase() {
		db, err := database.Connect(cfg.DatabaseURL)
		if err != nil {
			slog.Warn("database connection failed, analytics disabled", "error", err)
			analyticsRepo = repository.NewNoOpAnalyticsRepository()
		} else {
			// Run migrations
			if err := db.AutoMigrate(&domain.AuditEntry{}); err != nil {
				slog.Warn("database migration failed", "error", err)
			}
			slog.Info("database connected, analytics enabled")
			analyticsRepo = postgres.NewAnalyticsRepository(db)
		}
	} else {
		slog.Info("no DATABASE_URL configured, analytics disabled")
		analyticsRepo = repository.NewNoOpAnalyticsRepository()
	}

	// Create MCP server
	mcpServer := anklyzemcp.NewServer(anklyzemcp.Config{
		Name:          "Anklyze",
		Version:       "1.0.0",
		AnalyticsRepo: analyticsRepo,
	})

	slog.Info("starting Anklyze MCP server",
		"name", "Anklyze",
		"version", "1.0.0",
		"transport", transport,
	)

	switch transport {
	case "sse":
		// Get port from environment (Render sets PORT automatically)
		port := os.Getenv("PORT")
		if port == "" {
			port = "8080"
		}
		addr := ":" + port

		// Create SSE server for HTTP transport
		sseServer := server.NewSSEServer(mcpServer,
			server.WithBasePath("/mcp"),
			server.WithSSEEndpoint("/sse"),
			server.WithMessageEndpoint("/message"),
		)

		// Handle graceful shutdown
		go func() {
			sigChan := make(chan os.Signal, 1)
			signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
			<-sigChan
			slog.Info("shutting down MCP SSE server")
			if err := sseServer.Shutdown(context.Background()); err != nil {
				slog.Error("shutdown error", "error", err)
			}
		}()

		slog.Info("MCP SSE server listening", "addr", addr, "sse_endpoint", "/mcp/sse", "message_endpoint", "/mcp/message")
		if err := sseServer.Start(addr); err != nil {
			fmt.Fprintf(os.Stderr, "Server error: %v\n", err)
			os.Exit(1)
		}

	default:
		// Serve via stdio (for Claude Desktop/Code integration)
		if err := server.ServeStdio(mcpServer); err != nil {
			fmt.Fprintf(os.Stderr, "Server error: %v\n", err)
			os.Exit(1)
		}
	}
}
