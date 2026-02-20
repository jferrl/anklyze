# API Contract Changes: Error Responses

**Date**: 2026-02-20
**Scope**: Error response standardization during handler refactoring

## Overview

This refactoring may change error response shapes as business logic moves
from handlers into domain methods. The primary change is standardizing
error responses to consistently include a domain error code alongside the
HTTP status.

## Current Error Response Patterns (before)

Handlers currently return ad-hoc error shapes:

```json
// Pattern 1: Simple message
{"error": "only draft cases can be published"}

// Pattern 2: Error code
{"code": "DEADLINE_PASSED", "error": "case deadline has passed"}

// Pattern 3: Validation errors
{"errors": [{"field": "title", "message": "required"}]}
```

## Proposed Error Response Format (after)

Standardize all error responses to include a `code` field:

```json
{
  "code": "INVALID_STATE_TRANSITION",
  "error": "only draft cases can be published"
}
```

For validation errors, preserve the existing format:

```json
{
  "code": "INVALID_INPUT",
  "errors": [{"field": "title", "message": "required"}]
}
```

## New Error Codes

| HTTP Status | Code | Condition |
| ----------- | ---- | --------- |
| 400 | `INVALID_STATE_TRANSITION` | Invalid case state for requested operation |
| 400 | `MISSING_IMAGES` | Publish attempted without images |
| 403 | `DEADLINE_PASSED` | Response submitted after case deadline |
| 403 | `CASE_NOT_ACCEPTING_RESPONSES` | Response submitted to non-published case |
| 409 | `ALREADY_RESPONDED` | Duplicate response in single-response mode |

## Unchanged Endpoints

All success response shapes remain identical:
- `POST /api/classify` — `ClassificationResult` unchanged
- `GET /api/options` — form options unchanged
- `GET /api/analytics/*` — analytics responses unchanged
- Case CRUD success responses — unchanged
- Study CRUD success responses — unchanged

## Frontend Impact

Frontend error handling in `frontend/src/services/api.ts` should be
updated to check for the `code` field in error responses for more specific
error handling. The `error` message field remains available for display.
