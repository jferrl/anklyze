// Package mcp provides an MCP (Model Context Protocol) server for ankle fracture classification.
// This server exposes the Anklyze classification engine to LLMs like Claude and ChatGPT.
package mcp

import (
	"time"

	"github.com/jferrl/anklyze/internal/domain"
	"github.com/jferrl/anklyze/internal/rules"
	"github.com/jferrl/anklyze/internal/service"
	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"
)

// AnalyticsRepository defines the analytics query interface for the MCP server.
type AnalyticsRepository interface {
	GetSummary(from, to time.Time) (*domain.AnalyticsSummary, error)
	GetTrends(from, to time.Time, granularity domain.Granularity) (*domain.TrendData, error)
	GetDistribution(system string, from, to time.Time) (*domain.ClassificationDistribution, error)
}

// Config holds the configuration for the MCP server.
type Config struct {
	Name          string
	Version       string
	AnalyticsRepo AnalyticsRepository // Optional - analytics tools disabled if nil
}

// NewServer creates a new MCP server with classification tools, resources, and prompts.
func NewServer(cfg Config) *server.MCPServer {
	s := server.NewMCPServer(
		cfg.Name,
		cfg.Version,
		server.WithRecovery(),
		server.WithToolCapabilities(true),
		server.WithResourceCapabilities(true, true), // static and templates
		server.WithPromptCapabilities(true),
	)

	// Initialize core dependencies
	engine := rules.NewEngine()
	classifier := service.NewClassifierService(engine)

	// Register tools
	registerTools(s, classifier, cfg.AnalyticsRepo)

	// Register resources
	registerResources(s)

	// Register prompts
	registerPrompts(s)

	return s
}

func registerTools(s *server.MCPServer, classifier service.ClassifierService, analytics AnalyticsRepository) {
	// Core classification tools
	s.AddTool(newClassifyFractureTool(), classifyFractureHandler(classifier))
	s.AddTool(newGetOptionsTool(), getOptionsHandler())
	s.AddTool(newValidateCombinationTool(), validateCombinationHandler(classifier))
	s.AddTool(newExplainClassificationTool(), explainClassificationHandler())

	// Analytics tools (only if repository provided)
	if analytics != nil {
		s.AddTool(newGetAnalyticsSummaryTool(), getAnalyticsSummaryHandler(analytics))
		s.AddTool(newGetAnalyticsTrendsTool(), getAnalyticsTrendsHandler(analytics))
		s.AddTool(newGetClassificationDistributionTool(), getClassificationDistributionHandler(analytics))
	}
}

func registerResources(s *server.MCPServer) {
	// Classification systems documentation
	s.AddResource(classificationSystemsOverviewResource(), classificationSystemsOverviewHandler)
	s.AddResource(danisWeberResource(), danisWeberHandler)
	s.AddResource(laugeHansenResource(), laugeHansenHandler)
	s.AddResource(aootaResource(), aootaHandler)
	s.AddResource(bartonicekResource(), bartonicekHandler)

	// Decision flowchart
	s.AddResource(decisionFlowchartResource(), decisionFlowchartHandler)
}

func registerPrompts(s *server.MCPServer) {
	s.AddPrompt(clinicalClassificationPrompt(), clinicalClassificationHandler)
	s.AddPrompt(educationalGuidePrompt(), educationalGuideHandler)
	s.AddPrompt(researchAnalysisPrompt(), researchAnalysisHandler)
}

// newToolResultJSON creates a tool result with JSON content
func newToolResultJSON(data any) *mcp.CallToolResult {
	return mcp.NewToolResultText(toJSON(data))
}
