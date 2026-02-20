# Regenerate Swagger Documentation

Regenerate the Swagger/OpenAPI documentation for the backend API.

## Steps

1. Run the swag command to regenerate docs from Go annotations:

```bash
go run github.com/swaggo/swag/cmd/swag@latest init -g cmd/anklyze-apiserver/main.go -o docs
```

2. Verify the generated files:
- `docs/docs.go`
- `docs/swagger.json`
- `docs/swagger.yaml`

## When to Use

Run this command when you've:
- Added new API endpoints
- Modified existing endpoint annotations (@Summary, @Description, @Param, @Success, etc.)
- Changed request/response types used in handlers

## Swagger Annotations Reference

Add these annotations above handler functions in `internal/api/handler.go`:

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
