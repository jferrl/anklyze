# Regenerate Swagger Documentation

Regenerate the Swagger/OpenAPI documentation for the backend API.

## Steps

1. Run the swag command to regenerate docs from Go annotations:

```bash
cd backend && ~/go/bin/swag init -g cmd/server/main.go -o docs
```

2. Verify the generated files:
- `backend/docs/docs.go`
- `backend/docs/swagger.json`
- `backend/docs/swagger.yaml`

## When to Use

Run this command when you've:
- Added new API endpoints
- Modified existing endpoint annotations (@Summary, @Description, @Param, @Success, etc.)
- Changed request/response types used in handlers

## Swagger Annotations Reference

Add these annotations above handler functions in `backend/internal/api/handler.go`:

```go
// @Summary Short description
// @Description Longer description
// @Tags TagName
// @Accept json
// @Produce json
// @Param name body Type true "Description"
// @Success 200 {object} ResponseType "Description"
// @Failure 400 {object} map[string]string "Error description"
// @Router /api/path [post]
```

## Usage

```
/swagger
```
