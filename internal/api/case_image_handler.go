package api

import (
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"
	"unicode"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jferrl/anklyze/internal/domain"
	"github.com/jferrl/anklyze/internal/repository"
	"github.com/jferrl/anklyze/internal/storage"
)

// CaseImageHandler handles image management for cases.
type CaseImageHandler struct {
	caseRepo          repository.CaseRepository
	storage           storage.Storage
	signedURLDuration time.Duration
}

// NewCaseImageHandler creates a new case image handler.
func NewCaseImageHandler(
	caseRepo repository.CaseRepository,
	storage storage.Storage,
	signedURLDuration time.Duration,
) *CaseImageHandler {
	return &CaseImageHandler{
		caseRepo:          caseRepo,
		storage:           storage,
		signedURLDuration: signedURLDuration,
	}
}

// imageExtensions maps sniffed content types to the extension used in the
// storage key. These are the types the frontend dropzone accepts.
var imageExtensions = map[string]string{
	"image/jpeg": ".jpg",
	"image/png":  ".png",
	"image/gif":  ".gif",
	"image/webp": ".webp",
}

const maxFilenameRunes = 100

// sanitizeFilename reduces a client filename to a printable base name, dropping
// path components and control or invisible formatting characters.
func sanitizeFilename(name string) string {
	if i := strings.LastIndexAny(name, `/\`); i >= 0 {
		name = name[i+1:]
	}
	name = strings.TrimSpace(strings.Map(func(r rune) rune {
		if unicode.IsControl(r) || unicode.Is(unicode.Cf, r) {
			return -1
		}
		return r
	}, name))
	if name == "" || name == "." || name == ".." {
		return "image"
	}
	if r := []rune(name); len(r) > maxFilenameRunes {
		name = string(r[:maxFilenameRunes])
	}
	return name
}

// UploadImage handles POST /api/admin/cases/:id/images
func (h *CaseImageHandler) UploadImage(c *gin.Context) {
	caseID, cs, ok := caseFromPath(c, h.caseRepo)
	if !ok {
		return
	}

	if !cs.CanBeEdited() {
		respond(c, http.StatusBadRequest, domain.ErrCodeInvalidStateTransition, "cannot add images to non-draft case")
		return
	}

	// Get category from form
	category := domain.ImageCategory(c.PostForm("category"))
	if category != domain.ImageCategoryXRay && category != domain.ImageCategoryTAC {
		badRequest(c, "invalid category, must be 'xray' or 'tac'")
		return
	}

	// Get display order (optional)
	displayOrder := 0
	if do := c.PostForm("display_order"); do != "" {
		if parsed, err := strconv.Atoi(do); err == nil {
			displayOrder = parsed
		}
	}

	// Check Content-Length header first (cheap check before reading file)
	if c.Request.ContentLength > MaxImageSize {
		HandleError(c, fmt.Errorf("%w: file size %d exceeds maximum %d bytes",
			domain.ErrInvalidInput, c.Request.ContentLength, MaxImageSize), "File too large")
		return
	}

	// Get the file
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		badRequest(c, "file is required")
		return
	}
	defer func() { _ = file.Close() }()

	// Check actual file size from header
	if header.Size > MaxImageSize {
		HandleError(c, fmt.Errorf("%w: file size %d exceeds maximum %d bytes",
			domain.ErrInvalidInput, header.Size, MaxImageSize), "File too large")
		return
	}

	// The client's Content-Type header is untrusted; sniff the bytes instead.
	head := make([]byte, 512)
	n, err := io.ReadFull(file, head)
	if err != nil && !errors.Is(err, io.EOF) && !errors.Is(err, io.ErrUnexpectedEOF) {
		badRequest(c, "could not read file")
		return
	}
	contentType := http.DetectContentType(head[:n])
	ext, ok := imageExtensions[contentType]
	if !ok {
		badRequest(c, "invalid file type, must be an image (JPEG, PNG, GIF, WebP)")
		return
	}
	if _, err := file.Seek(0, io.SeekStart); err != nil {
		HandleError(c, fmt.Errorf("rewind upload: %w", err), "failed to read file")
		return
	}

	// Generate image ID and storage path
	imageID := uuid.New()
	storagePath := storage.BuildStoragePath(caseID.String(), imageID.String(), string(category), ext)
	filename := sanitizeFilename(header.Filename)

	// Upload to storage
	if err := h.storage.Upload(c.Request.Context(), storagePath, file, contentType, header.Size); err != nil {
		HandleError(c, fmt.Errorf("upload image: %w", err), "Failed to upload image")
		return
	}

	// Create image record
	image := domain.NewCaseImage(
		caseID,
		category,
		displayOrder,
		filename,
		contentType,
		header.Size,
		storagePath,
	)
	image.ID = imageID // Use the same ID we used for the path

	if err := h.caseRepo.AddImage(c.Request.Context(), image); err != nil {
		// Try to clean up the uploaded file
		_ = h.storage.Delete(c.Request.Context(), storagePath)
		HandleError(c, err, "failed to save image")
		return
	}

	// Update the has_tac_images flag
	if err := h.caseRepo.UpdateHasTACImages(c.Request.Context(), caseID); err != nil {
		slog.Warn("failed to update has_tac_images", "error", err)
	}

	c.JSON(http.StatusCreated, ImageUploadResponse{Image: *image})
}

// DeleteImage handles DELETE /api/admin/cases/:id/images/:imageId
func (h *CaseImageHandler) DeleteImage(c *gin.Context) {
	caseID, ok := parseID(c, "id", "invalid case id")
	if !ok {
		return
	}

	imageID, ok := parseID(c, "imageId", "invalid image id")
	if !ok {
		return
	}

	cs, ok := loadCase(c, h.caseRepo, caseID)
	if !ok {
		return
	}

	if !cs.CanBeEdited() {
		respond(c, http.StatusBadRequest, domain.ErrCodeInvalidStateTransition, "cannot remove images from non-draft case")
		return
	}

	image, ok := loadCaseImage(c, h.caseRepo, caseID, imageID)
	if !ok {
		return
	}

	// Delete from storage
	if err := h.storage.Delete(c.Request.Context(), image.StoragePath); err != nil {
		slog.Warn("failed to delete image from storage", "path", image.StoragePath, "error", err)
	}

	// Delete from database
	if err := h.caseRepo.DeleteImage(c.Request.Context(), imageID); err != nil {
		HandleError(c, err, "failed to delete image")
		return
	}

	// Update the has_tac_images flag
	if err := h.caseRepo.UpdateHasTACImages(c.Request.Context(), caseID); err != nil {
		slog.Warn("failed to update has_tac_images", "error", err)
	}

	c.Status(http.StatusNoContent)
}

// UpdateImage handles PATCH /api/admin/cases/:id/images/:imageId
func (h *CaseImageHandler) UpdateImage(c *gin.Context) {
	caseID, ok := parseID(c, "id", "invalid case id")
	if !ok {
		return
	}

	imageID, ok := parseID(c, "imageId", "invalid image id")
	if !ok {
		return
	}

	cs, ok := loadCase(c, h.caseRepo, caseID)
	if !ok {
		return
	}

	if !cs.CanBeEdited() {
		respond(c, http.StatusBadRequest, domain.ErrCodeInvalidStateTransition, "cannot update images of non-draft case")
		return
	}

	image, ok := loadCaseImage(c, h.caseRepo, caseID, imageID)
	if !ok {
		return
	}

	var req UpdateImageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		badBody(c, "invalid request", err)
		return
	}

	// Apply updates
	if req.DisplayOrder != nil {
		image.DisplayOrder = *req.DisplayOrder
	}

	if err := h.caseRepo.UpdateImage(c.Request.Context(), image); err != nil {
		HandleError(c, err, "failed to update image")
		return
	}

	c.JSON(http.StatusOK, image)
}

// GetAdminCaseImages handles GET /api/admin/cases/:id/images
// Returns images with signed URLs for admin preview.
func (h *CaseImageHandler) GetAdminCaseImages(c *gin.Context) {
	caseID, _, ok := caseFromPath(c, h.caseRepo)
	if !ok {
		return
	}

	images, err := h.caseRepo.GetImages(c.Request.Context(), caseID)
	if err != nil {
		HandleError(c, err, "failed to get images")
		return
	}

	// Generate signed URLs in parallel
	response := make([]AdminImageResponse, len(images))
	errs := make([]error, len(images))
	var wg sync.WaitGroup
	for i, img := range images {
		response[i] = AdminImageResponse{CaseImage: img}
		wg.Add(1)
		go func(idx int, path string) {
			defer wg.Done()
			response[idx].SignedURL, errs[idx] = h.storage.GetSignedURL(c.Request.Context(), path, h.signedURLDuration)
		}(i, img.StoragePath)
	}
	wg.Wait()

	// Other failures leave that image without a URL; a missing backend fails the whole call.
	for _, err := range errs {
		if errors.Is(err, domain.ErrStorageNotConfigured) {
			HandleError(c, fmt.Errorf("generate signed URLs: %w", err), "Failed to generate image URLs")
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{"images": response})
}

// ReorderImages handles PUT /api/admin/cases/:id/images/reorder
func (h *CaseImageHandler) ReorderImages(c *gin.Context) {
	caseID, cs, ok := caseFromPath(c, h.caseRepo)
	if !ok {
		return
	}

	if !cs.CanBeEdited() {
		respond(c, http.StatusBadRequest, domain.ErrCodeInvalidStateTransition, "cannot reorder images for non-draft case")
		return
	}

	var req struct {
		ImageOrder []struct {
			ID           uuid.UUID `json:"id"`
			DisplayOrder int       `json:"display_order"`
		} `json:"image_order"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		badBody(c, "invalid request", err)
		return
	}

	// Batch update display orders in a single transaction
	orders := make(map[uuid.UUID]int, len(req.ImageOrder))
	for _, item := range req.ImageOrder {
		orders[item.ID] = item.DisplayOrder
	}
	if err := h.caseRepo.ReorderImages(c.Request.Context(), caseID, orders); err != nil {
		HandleError(c, err, "failed to reorder images")
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "images reordered"})
}

// GetAdminImageSignedURL handles GET /api/admin/cases/:id/images/:imageId/url
// Admin version that works for any case status (draft, published, closed)
func (h *CaseImageHandler) GetAdminImageSignedURL(c *gin.Context) {
	caseID, ok := parseID(c, "id", "invalid case id")
	if !ok {
		return
	}

	imageID, ok := parseID(c, "imageId", "invalid image id")
	if !ok {
		return
	}

	// Verify case exists (any status is fine for admin)
	_, ok = loadCase(c, h.caseRepo, caseID)
	if !ok {
		return
	}

	// Get image
	image, ok := loadCaseImage(c, h.caseRepo, caseID, imageID)
	if !ok {
		return
	}

	writeSignedURL(c, h.storage, image.StoragePath, h.signedURLDuration)
}
