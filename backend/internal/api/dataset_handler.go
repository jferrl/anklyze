package api

import (
	"io"
	"log/slog"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jferrl/anklyze/internal/service"
)

// MaxCSVUploadSize is the maximum allowed size for CSV file uploads (50MB).
const MaxCSVUploadSize = 50 * 1024 * 1024

// DatasetHandler handles dataset-related HTTP requests.
type DatasetHandler struct {
	svc *service.DatasetService
}

// NewDatasetHandler creates a new dataset handler.
func NewDatasetHandler(svc *service.DatasetService) *DatasetHandler {
	return &DatasetHandler{svc: svc}
}

// --- Request/Response Types ---

// CreateDatasetRequest is the request body for creating a dataset.
type CreateDatasetRequest struct {
	Name        string `json:"name" binding:"required,max=255"`
	Description string `json:"description" binding:"max=10000"`
}

// DatasetListResponse is the response for listing datasets.
type DatasetListResponse struct {
	Datasets []DatasetResponse `json:"datasets"`
	Total    int               `json:"total"`
}

// DatasetResponse is the response for a single dataset.
type DatasetResponse struct {
	ID               uuid.UUID `json:"id"`
	Name             string    `json:"name"`
	Description      string    `json:"description,omitempty"`
	Status           string    `json:"status"`
	RecordCount      int       `json:"record_count"`
	OriginalFilename string    `json:"original_filename,omitempty"`
	CreatedBy        string    `json:"created_by"`
	CreatedAt        string    `json:"created_at"`
	UpdatedAt        string    `json:"updated_at"`
}

// --- Handlers ---

// CreateDataset handles POST /api/admin/research/datasets
// @Summary Create a new research dataset
// @Description Creates a new empty dataset ready for CSV import
// @Tags Research Datasets
// @Accept json
// @Produce json
// @Param input body CreateDatasetRequest true "Dataset creation parameters"
// @Success 201 {object} domain.Dataset "Created dataset"
// @Failure 400 {object} ErrorResponse "Invalid input"
// @Failure 500 {object} ErrorResponse "Server error"
// @Router /api/admin/research/datasets [post]
func (h *DatasetHandler) CreateDataset(c *gin.Context) {
	var req CreateDatasetRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Code:    CodeInvalidInput,
			Message: "Invalid request body",
		})
		return
	}

	// Use "admin" as default creator; in production this comes from auth context
	createdBy := "admin"
	if userID, exists := c.Get("user_id"); exists {
		createdBy = userID.(string)
	}

	ds, err := h.svc.CreateDataset(c.Request.Context(), req.Name, req.Description, createdBy)
	if err != nil {
		HandleError(c, err, "Failed to create dataset")
		return
	}

	c.JSON(http.StatusCreated, ds)
}

// ListDatasets handles GET /api/admin/research/datasets
// @Summary List research datasets
// @Description Lists all datasets for the current user
// @Tags Research Datasets
// @Produce json
// @Success 200 {object} DatasetListResponse "Dataset list"
// @Failure 500 {object} ErrorResponse "Server error"
// @Router /api/admin/research/datasets [get]
func (h *DatasetHandler) ListDatasets(c *gin.Context) {
	createdBy := "admin"
	if userID, exists := c.Get("user_id"); exists {
		createdBy = userID.(string)
	}

	datasets, err := h.svc.ListDatasets(c.Request.Context(), createdBy)
	if err != nil {
		slog.Error("failed to list datasets", "error", err)
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Code:    CodeInternalError,
			Message: "Failed to list datasets",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"datasets": datasets,
		"total":    len(datasets),
	})
}

// GetDataset handles GET /api/admin/research/datasets/:id
// @Summary Get a research dataset
// @Description Retrieves a dataset by ID
// @Tags Research Datasets
// @Produce json
// @Param id path string true "Dataset ID"
// @Success 200 {object} domain.Dataset "Dataset"
// @Failure 400 {object} ErrorResponse "Invalid ID"
// @Failure 404 {object} ErrorResponse "Not found"
// @Failure 500 {object} ErrorResponse "Server error"
// @Router /api/admin/research/datasets/{id} [get]
func (h *DatasetHandler) GetDataset(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Code:    CodeInvalidInput,
			Message: "Invalid dataset ID",
		})
		return
	}

	ds, err := h.svc.GetDataset(c.Request.Context(), id)
	if err != nil {
		HandleError(c, err, "Failed to get dataset")
		return
	}

	c.JSON(http.StatusOK, ds)
}

// DeleteDataset handles DELETE /api/admin/research/datasets/:id
// @Summary Delete a research dataset
// @Description Deletes a dataset and all associated records
// @Tags Research Datasets
// @Param id path string true "Dataset ID"
// @Success 204 "No content"
// @Failure 400 {object} ErrorResponse "Invalid ID"
// @Failure 404 {object} ErrorResponse "Not found"
// @Failure 500 {object} ErrorResponse "Server error"
// @Router /api/admin/research/datasets/{id} [delete]
func (h *DatasetHandler) DeleteDataset(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Code:    CodeInvalidInput,
			Message: "Invalid dataset ID",
		})
		return
	}

	if err := h.svc.DeleteDataset(c.Request.Context(), id); err != nil {
		HandleError(c, err, "Failed to delete dataset")
		return
	}

	c.Status(http.StatusNoContent)
}

// ImportCSV handles POST /api/admin/research/datasets/:id/import
// @Summary Import CSV into a dataset
// @Description Uploads and processes a CSV file through the normalization pipeline
// @Tags Research Datasets
// @Accept multipart/form-data
// @Produce json
// @Param id path string true "Dataset ID"
// @Param file formance file true "CSV file"
// @Success 200 {object} map[string]interface{} "Import result"
// @Failure 400 {object} ErrorResponse "Invalid input"
// @Failure 404 {object} ErrorResponse "Not found"
// @Failure 500 {object} ErrorResponse "Server error"
// @Router /api/admin/research/datasets/{id}/import [post]
func (h *DatasetHandler) ImportCSV(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Code:    CodeInvalidInput,
			Message: "Invalid dataset ID",
		})
		return
	}

	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Code:    CodeInvalidInput,
			Message: "CSV file is required",
		})
		return
	}
	defer file.Close()

	if header.Size > MaxCSVUploadSize {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Code:    CodeInvalidInput,
			Message: "File too large (max 50MB)",
		})
		return
	}

	csvData, err := io.ReadAll(file)
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Code:    CodeInvalidInput,
			Message: "Failed to read file",
		})
		return
	}

	result, err := h.svc.ImportCSV(c.Request.Context(), id, csvData, header.Filename)
	if err != nil {
		HandleError(c, err, "Failed to import CSV")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"stats":    result.Stats,
		"errors":   result.Errors,
		"warnings": result.Warnings,
		"ai_used":  result.AIUsed,
	})
}

// GetRecords handles GET /api/admin/research/datasets/:id/records
// @Summary Get dataset records
// @Description Retrieves paginated records for a dataset
// @Tags Research Datasets
// @Produce json
// @Param id path string true "Dataset ID"
// @Param page query int false "Page number" default(1)
// @Param limit query int false "Page size" default(20)
// @Param sex query string false "Filter by sex"
// @Param trauma_energy query string false "Filter by trauma energy"
// @Success 200 {object} map[string]interface{} "Records with pagination"
// @Failure 400 {object} ErrorResponse "Invalid input"
// @Failure 404 {object} ErrorResponse "Not found"
// @Failure 500 {object} ErrorResponse "Server error"
// @Router /api/admin/research/datasets/{id}/records [get]
func (h *DatasetHandler) GetRecords(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Code:    CodeInvalidInput,
			Message: "Invalid dataset ID",
		})
		return
	}

	page, limit, offset := getPagination(c)
	filters := parseRecordFilters(c)

	records, total, err := h.svc.GetRecords(c.Request.Context(), id, filters, offset, limit)
	if err != nil {
		HandleError(c, err, "Failed to get records")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"records": records,
		"total":   total,
		"page":    page,
		"limit":   limit,
	})
}

// GetDemographicStats handles GET /api/admin/research/datasets/:id/stats/demographics
// @Summary Get demographic statistics
// @Description Returns demographic statistics for a dataset
// @Tags Research Datasets
// @Produce json
// @Param id path string true "Dataset ID"
// @Success 200 {object} service.DemographicStats "Demographic statistics"
// @Failure 400 {object} ErrorResponse "Invalid ID"
// @Failure 500 {object} ErrorResponse "Server error"
// @Router /api/admin/research/datasets/{id}/stats/demographics [get]
func (h *DatasetHandler) GetDemographicStats(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Code:    CodeInvalidInput,
			Message: "Invalid dataset ID",
		})
		return
	}

	filters := parseRecordFilters(c)

	stats, err := h.svc.GetDemographicStats(c.Request.Context(), id, filters)
	if err != nil {
		HandleError(c, err, "Failed to get demographic stats")
		return
	}

	c.JSON(http.StatusOK, stats)
}

// GetFractureStats handles GET /api/admin/research/datasets/:id/stats/fractures
// @Summary Get fracture statistics
// @Description Returns fracture-related statistics for a dataset
// @Tags Research Datasets
// @Produce json
// @Param id path string true "Dataset ID"
// @Success 200 {object} service.FractureStats "Fracture statistics"
// @Failure 400 {object} ErrorResponse "Invalid ID"
// @Failure 500 {object} ErrorResponse "Server error"
// @Router /api/admin/research/datasets/{id}/stats/fractures [get]
func (h *DatasetHandler) GetFractureStats(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Code:    CodeInvalidInput,
			Message: "Invalid dataset ID",
		})
		return
	}

	filters := parseRecordFilters(c)

	stats, err := h.svc.GetFractureStats(c.Request.Context(), id, filters)
	if err != nil {
		HandleError(c, err, "Failed to get fracture stats")
		return
	}

	c.JSON(http.StatusOK, stats)
}

// GetSurgicalStats handles GET /api/admin/research/datasets/:id/stats/surgical
// @Summary Get surgical statistics
// @Description Returns surgical statistics for a dataset
// @Tags Research Datasets
// @Produce json
// @Param id path string true "Dataset ID"
// @Success 200 {object} service.SurgicalStats "Surgical statistics"
// @Failure 400 {object} ErrorResponse "Invalid ID"
// @Failure 500 {object} ErrorResponse "Server error"
// @Router /api/admin/research/datasets/{id}/stats/surgical [get]
func (h *DatasetHandler) GetSurgicalStats(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Code:    CodeInvalidInput,
			Message: "Invalid dataset ID",
		})
		return
	}

	filters := parseRecordFilters(c)

	stats, err := h.svc.GetSurgicalStats(c.Request.Context(), id, filters)
	if err != nil {
		HandleError(c, err, "Failed to get surgical stats")
		return
	}

	c.JSON(http.StatusOK, stats)
}

// GetOutcomeStats handles GET /api/admin/research/datasets/:id/stats/outcomes
// @Summary Get outcome statistics
// @Description Returns outcome statistics for a dataset
// @Tags Research Datasets
// @Produce json
// @Param id path string true "Dataset ID"
// @Success 200 {object} service.OutcomeStats "Outcome statistics"
// @Failure 400 {object} ErrorResponse "Invalid ID"
// @Failure 500 {object} ErrorResponse "Server error"
// @Router /api/admin/research/datasets/{id}/stats/outcomes [get]
func (h *DatasetHandler) GetOutcomeStats(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Code:    CodeInvalidInput,
			Message: "Invalid dataset ID",
		})
		return
	}

	filters := parseRecordFilters(c)

	stats, err := h.svc.GetOutcomeStats(c.Request.Context(), id, filters)
	if err != nil {
		HandleError(c, err, "Failed to get outcome stats")
		return
	}

	c.JSON(http.StatusOK, stats)
}

// ExportCSV handles GET /api/admin/research/datasets/:id/export
// @Summary Export dataset as CSV
// @Description Generates a CSV file from dataset records
// @Tags Research Datasets
// @Produce text/csv
// @Param id path string true "Dataset ID"
// @Success 200 {file} file "CSV file"
// @Failure 400 {object} ErrorResponse "Invalid ID"
// @Failure 404 {object} ErrorResponse "Not found"
// @Failure 500 {object} ErrorResponse "Server error"
// @Router /api/admin/research/datasets/{id}/export [get]
func (h *DatasetHandler) ExportCSV(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Code:    CodeInvalidInput,
			Message: "Invalid dataset ID",
		})
		return
	}

	data, err := h.svc.ExportCSV(c.Request.Context(), id)
	if err != nil {
		HandleError(c, err, "Failed to export CSV")
		return
	}

	c.Header("Content-Disposition", "attachment; filename=dataset_export.csv")
	c.Data(http.StatusOK, "text/csv", data)
}

// GetImportLog handles GET /api/admin/research/datasets/:id/import-log
// @Summary Get import log
// @Description Returns the import log entries for a dataset
// @Tags Research Datasets
// @Produce json
// @Param id path string true "Dataset ID"
// @Success 200 {array} domain.ImportLogEntry "Import log entries"
// @Failure 400 {object} ErrorResponse "Invalid ID"
// @Failure 404 {object} ErrorResponse "Not found"
// @Failure 500 {object} ErrorResponse "Server error"
// @Router /api/admin/research/datasets/{id}/import-log [get]
func (h *DatasetHandler) GetImportLog(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Code:    CodeInvalidInput,
			Message: "Invalid dataset ID",
		})
		return
	}

	entries, err := h.svc.GetImportLog(c.Request.Context(), id)
	if err != nil {
		HandleError(c, err, "Failed to get import log")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"entries": entries,
		"total":   len(entries),
	})
}

// --- Helpers ---

// parseRecordFilters extracts record filter parameters from query string.
func parseRecordFilters(c *gin.Context) map[string]interface{} {
	filters := make(map[string]interface{})
	if sex := c.Query("sex"); sex != "" {
		filters["sex"] = sex
	}
	if energy := c.Query("trauma_energy"); energy != "" {
		filters["trauma_energy"] = energy
	}
	if ageMin := c.Query("age_min"); ageMin != "" {
		filters["age_min"] = ageMin
	}
	if ageMax := c.Query("age_max"); ageMax != "" {
		filters["age_max"] = ageMax
	}
	return filters
}
